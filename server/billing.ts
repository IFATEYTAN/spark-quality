import { z } from "zod";
import { eq } from "drizzle-orm";
import { ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { sendEmail } from "./email";
import { renderBrandedEmail } from "./emailTemplates";
import {
  createPaymentAttempt,
  getDb,
  getPaymentAttemptByRequestId,
  markPaymentAttemptFailed,
  markPaymentAttemptSucceeded,
  promoteCreatorToOwnerIfActive,
} from "./db";
import { workspaces, users } from "../drizzle/schema";
import { iCountSdk } from "./iCount";
import { makeCheckoutSdk } from "./makeCheckout";

async function requireDb() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

type PaidPlanKey = keyof typeof PLAN_PRICES;
function normalizePlan(plan: string): PaidPlanKey {
  if (plan === "basic" || plan === "pro" || plan === "premium") return plan;
  // Treat legacy/edge values ("trial", "enterprise") as premium for billing
  // amount calculation. The actual entitlement still uses ws.plan elsewhere.
  if (plan === "enterprise") return "premium";
  return "basic";
}
type PeriodKey = keyof (typeof PLAN_PRICES)["basic"];
type MemberRow = { email: string | null; name: string | null };

// ============================================================
// PRICING
// ============================================================
//
// Two billing periods are supported:
//
//  • monthly   — full price every month, charged via standing-order (הוראת קבע)
//                or manual invoice. No installments.
//  • yearly    — ~16% discount, billed once a year up-front.
//
// Both periods use the same standing-order / manual payment methods. The user
// is NEVER given an "installments" option (that was an explicit product
// decision in round 36).
//
// To change pricing, edit ONLY this constant; the client reads `billing.plans`.
// Discount is calculated dynamically so we don't drift between client and
// server.
// Single-tier mode (Round 97): SPARK Quality is one plan at ₪349/month with
// 15% off when paid yearly (₪297/mo · ₪3,564/yr). All plan keys map to the
// same price so legacy invoices and the iCount pipeline keep working without
// migration.
const YEARLY_DISCOUNT = 0.15;
const SPARK_QUALITY_MONTHLY = 349;

const MONTHLY_PRICE = {
  basic: SPARK_QUALITY_MONTHLY,
  pro: SPARK_QUALITY_MONTHLY,
  premium: SPARK_QUALITY_MONTHLY,
} as const;

function yearlyTotal(plan: keyof typeof MONTHLY_PRICE): number {
  return Math.round(MONTHLY_PRICE[plan] * 12 * (1 - YEARLY_DISCOUNT));
}

const PLAN_PRICES = {
  basic: { monthly: MONTHLY_PRICE.basic, yearly: yearlyTotal("basic") },
  pro: { monthly: MONTHLY_PRICE.pro, yearly: yearlyTotal("pro") },
  premium: { monthly: MONTHLY_PRICE.premium, yearly: yearlyTotal("premium") },
} as const;

const PLAN_LABELS = {
  basic: "SPARK Quality",
  pro: "SPARK Quality",
  premium: "SPARK Quality",
} as const;

// Single-tier mode: all limits are unlimited regardless of plan key.
const PLAN_FLAGS_QUOTA = {
  basic: -1,
  pro: -1,
  premium: -1,
} as const;

const PLAN_CLIENT_LIMIT = {
  basic: -1,
  pro: -1,
  premium: -1,
} as const;

const PERIOD_LABELS = {
  monthly: "חודשי",
  yearly: "שנתי",
} as const;

const PAYMENT_METHOD_LABELS = {
  standing_order: "הוראת קבע",
  manual: "חשבונית ידנית (iCount)",
} as const;

// ============================================================
// GRACE PERIOD CONSTANTS
// ============================================================
//
// Business rule (round 36):
//
//  • Once a charge fails, the workspace enters `past_due` status.
//  • For 3 days the user keeps full access AND sees a banner urging them to
//    update their payment method.
//  • If still unpaid after 3 days, the workspace is moved to `suspended`,
//    a branded RTL suspension email is sent, and the in-app block screen
//    replaces every page until payment is restored.
export const GRACE_PERIOD_DAYS = 3;
const GRACE_PERIOD_MS = GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;

function isICountConfigured(): boolean {
  return Boolean(ENV.iCountApiToken && ENV.iCountCompanyId);
}

// ============================================================
// HELPERS — used by procedures and by the dunning cron job
// ============================================================

/**
 * Compute the effective access status for a workspace right now.
 * Pure function so it's easy to test and reuse client-side.
 */
export function computeAccessStatus(ws: {
  subscriptionStatus: "pending_payment" | "active" | "past_due" | "suspended" | "cancelled";
  pastDueSince: Date | null;
}): {
  status: "active" | "grace" | "blocked" | "cancelled";
  graceEndsAt: Date | null;
  daysRemaining: number;
} {
  if (ws.subscriptionStatus === "active") {
    return { status: "active", graceEndsAt: null, daysRemaining: 0 };
  }
  if (ws.subscriptionStatus === "pending_payment") {
    // Brand-new workspace that has never paid — hard block until first charge.
    return { status: "blocked", graceEndsAt: null, daysRemaining: 0 };
  }
  if (ws.subscriptionStatus === "cancelled") {
    return { status: "cancelled", graceEndsAt: null, daysRemaining: 0 };
  }
  if (ws.subscriptionStatus === "suspended") {
    return { status: "blocked", graceEndsAt: null, daysRemaining: 0 };
  }
  // past_due
  if (!ws.pastDueSince) {
    // Defensive: past_due without timestamp → treat as just-now.
    return { status: "grace", graceEndsAt: null, daysRemaining: GRACE_PERIOD_DAYS };
  }
  const graceEndsAt = new Date(ws.pastDueSince.getTime() + GRACE_PERIOD_MS);
  const msLeft = graceEndsAt.getTime() - Date.now();
  if (msLeft <= 0) {
    return { status: "blocked", graceEndsAt, daysRemaining: 0 };
  }
  return {
    status: "grace",
    graceEndsAt,
    daysRemaining: Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000))),
  };
}

/**
 * Send the unified RTL suspension email. Idempotent: caller decides whether to
 * call it again (we just stamp `suspensionEmailSentAt` once).
 */
export async function sendSuspensionEmail(opts: {
  to: string;
  recipientName?: string | null;
  workspaceName: string;
  planLabel: string;
  amount: number;
  periodLabel: string;
  paymentLink?: string;
}): Promise<boolean> {
  const { subject, html, text } = renderBrandedEmail({
    subject: `הגישה ל-SPARK Quality הופסקה זמנית — ${opts.workspaceName}`,
    eyebrow: "הודעת מערכת · חיוב לא הושלם",
    headline: "הגישה הושעתה זמנית עד להסדרת התשלום",
    greeting: opts.recipientName
      ? `שלום ${opts.recipientName},`
      : "שלום רב,",
    body: [
      `במהלך 3 הימים האחרונים ניסינו לחייב את אמצעי התשלום של הסוכנות "${opts.workspaceName}" עבור מנוי SPARK Quality, ולא הצלחנו להשלים את החיוב.`,
      "בהתאם לתנאי השימוש, הגישה למערכת מושעית זמנית עד להסדרת התשלום. הנתונים שלכם שמורים במלואם — מיד לאחר השלמת התשלום החזרת הגישה אוטומטית, ללא צורך בפעולה נוספת.",
      {
        type: "highlight",
        label: "סכום לחיוב",
        value: `₪${opts.amount.toLocaleString("he-IL")} · תוכנית ${opts.planLabel} (${opts.periodLabel})`,
        note: "החיוב מבוצע באמצעות הוראת קבע. ניתן לעדכן אמצעי תשלום באזור האישי.",
        tone: "warn",
      },
      {
        type: "list",
        title: "מה צריך לעשות עכשיו?",
        items: [
          "להיכנס לאזור האישי במערכת ולעדכן את אמצעי התשלום.",
          "להשלים את החיוב — הגישה תיפתח אוטומטית תוך מספר דקות.",
          "אם נדרש סיוע — אנחנו זמינים בכל שעה במייל anat@spark-ai.co.il.",
        ],
      },
    ],
    cta: opts.paymentLink
      ? { label: "הסדרת תשלום והחזרת הגישה", url: opts.paymentLink }
      : { label: "כניסה לאזור האישי", url: "https://spark-ai.co.il/login" },
    footerNote:
      "אם לדעתכם מדובר בטעות או שכבר ביצעתם את התשלום, נא ליצור איתנו קשר ונבדוק זאת מיידית. הנתונים שלכם נשמרים גם במצב מושעה.",
  });

  const result = await sendEmail({ to: opts.to, subject, html, text });
  if (!result.ok) {
    console.warn("[billing] suspension email failed:", result.error);
    return false;
  }
  return true;
}

/**
 * Send the unified RTL "past due" reminder during the 3-day grace window.
 */
export async function sendPastDueReminderEmail(opts: {
  to: string;
  recipientName?: string | null;
  workspaceName: string;
  planLabel: string;
  amount: number;
  periodLabel: string;
  daysRemaining: number;
  paymentLink?: string;
}): Promise<boolean> {
  const { subject, html, text } = renderBrandedEmail({
    subject: `נדרשת פעולה — חיוב שלא הושלם ב-SPARK Quality`,
    eyebrow: "תזכורת תשלום",
    headline: `נשארו ${opts.daysRemaining} ימים להשלמת התשלום`,
    greeting: opts.recipientName
      ? `שלום ${opts.recipientName},`
      : "שלום רב,",
    body: [
      `ניסיון החיוב האחרון של הסוכנות "${opts.workspaceName}" לא הושלם. בינתיים הגישה למערכת ממשיכה לעבוד כרגיל למשך תקופת חסד של ${GRACE_PERIOD_DAYS} ימים.`,
      "כדי להבטיח רציפות עבודה ולמנוע השעיה אוטומטית, אנא השלימו את התשלום בהקדם.",
      {
        type: "highlight",
        label: "סכום לחיוב",
        value: `₪${opts.amount.toLocaleString("he-IL")} · תוכנית ${opts.planLabel} (${opts.periodLabel})`,
        note: "החיוב מבוצע באמצעות הוראת קבע. ניתן לעדכן אמצעי תשלום בכל עת באזור האישי.",
      },
    ],
    cta: opts.paymentLink
      ? { label: "השלמת תשלום", url: opts.paymentLink }
      : { label: "כניסה לאזור האישי", url: "https://spark-ai.co.il/login" },
    footerNote:
      "אם לדעתכם מדובר בטעות, נא ליצור איתנו קשר במייל anat@spark-ai.co.il.",
  });

  const result = await sendEmail({ to: opts.to, subject, html, text });
  if (!result.ok) {
    console.warn("[billing] past_due email failed:", result.error);
    return false;
  }
  return true;
}

// ============================================================
// ROUTER
// ============================================================

export const billingRouter = router({
  /**
   * Plans + prices the client renders. Source of truth for both /pricing and
   * the onboarding billing step so they cannot drift apart.
   */
  plans: publicProcedure.query(() => {
    return {
      basic: {
        label: PLAN_LABELS.basic,
        monthly: PLAN_PRICES.basic.monthly,
        yearlyPerMonth: Math.round(PLAN_PRICES.basic.yearly / 12),
        yearlyTotal: PLAN_PRICES.basic.yearly,
        flagsQuota: PLAN_FLAGS_QUOTA.basic,
        clientLimit: PLAN_CLIENT_LIMIT.basic,
      },
      pro: {
        label: PLAN_LABELS.pro,
        monthly: PLAN_PRICES.pro.monthly,
        yearlyPerMonth: Math.round(PLAN_PRICES.pro.yearly / 12),
        yearlyTotal: PLAN_PRICES.pro.yearly,
        flagsQuota: PLAN_FLAGS_QUOTA.pro,
        clientLimit: PLAN_CLIENT_LIMIT.pro,
      },
      premium: {
        label: PLAN_LABELS.premium,
        monthly: PLAN_PRICES.premium.monthly,
        yearlyPerMonth: Math.round(PLAN_PRICES.premium.yearly / 12),
        yearlyTotal: PLAN_PRICES.premium.yearly,
        flagsQuota: PLAN_FLAGS_QUOTA.premium,
        clientLimit: PLAN_CLIENT_LIMIT.premium,
      },
      yearlyDiscountPercent: Math.round(YEARLY_DISCOUNT * 100),
      icountReady: isICountConfigured(),
    };
  }),

  /**
   * Frontend polls this so DashboardLayout can decide whether to show:
   *  - nothing                     → status="active"
   *  - top banner with countdown   → status="grace"
   *  - full-screen blocker         → status="blocked" / "cancelled"
   */
  myAccessStatus: protectedProcedure.query(async ({ ctx }) => {
    // ONLY SPARK AI staff (isSuperAdmin === true) bypass the payment gate.
    // A workspace-level admin/owner of a paying customer is NOT super-admin
    // and MUST go through normal billing checks.
    if (ctx.user.isSuperAdmin === true) {
      return {
        status: "active" as const,
        graceEndsAt: null,
        daysRemaining: 0,
        plan: "premium" as const,
        billingPeriod: "yearly" as const,
        paymentMethod: "manual" as const,
        hasNeverPaid: false,
      };
    }
    if (!ctx.user.workspaceId) {
      return {
        status: "active" as const,
        graceEndsAt: null,
        daysRemaining: 0,
        plan: "basic" as const,
        billingPeriod: "yearly" as const,
        paymentMethod: "manual" as const,
        hasNeverPaid: false,
      };
    }
      const db = await requireDb();
      const [ws] = await db
        .select({
          subscriptionStatus: workspaces.subscriptionStatus,
          pastDueSince: workspaces.pastDueSince,
          plan: workspaces.plan,
          billingPeriod: workspaces.billingPeriod,
          paymentMethod: workspaces.paymentMethod,
          lastPaymentAt: workspaces.lastPaymentAt,
        })
        .from(workspaces)
        .where(eq(workspaces.id, ctx.user.workspaceId))
        .limit(1);
    if (!ws) {
      return {
        status: "active" as const,
        graceEndsAt: null,
        daysRemaining: 0,
        plan: "basic" as const,
        billingPeriod: "yearly" as const,
        paymentMethod: "manual" as const,
      };
    }
    const access = computeAccessStatus({
      subscriptionStatus: ws.subscriptionStatus,
      pastDueSince: ws.pastDueSince,
    });
    return {
      ...access,
      plan: (ws.plan === "trial" ? "basic" : ws.plan) as
        | "basic"
        | "pro"
        | "premium"
        | "enterprise",
      billingPeriod: ws.billingPeriod,
      paymentMethod: ws.paymentMethod,
      hasNeverPaid: ws.subscriptionStatus === "pending_payment" && !ws.lastPaymentAt,
    };
  }),

  /**
   * User picks a paid plan. We always go through manual followup right now —
   * the iCount checkout link is delivered by SPARK staff once they receive the
   * notification email. Even when iCount-hosted checkout is later wired up,
   * the user's chosen `paymentMethod` is persisted on the workspace so the
   * grace-period logic can reference it.
   */
  requestCheckout: protectedProcedure
    .input(
      z.object({
        plan: z.enum(["basic", "pro", "premium"]),
        period: z.enum(["monthly", "yearly"]),
        paymentMethod: z
          .enum(["standing_order", "manual"])
          .default("standing_order"),
        workspaceName: z.string().trim().max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const amount = PLAN_PRICES[input.plan][input.period];
      const planLabel = PLAN_LABELS[input.plan];
      const periodLabel = PERIOD_LABELS[input.period];
      const paymentMethodLabel = PAYMENT_METHOD_LABELS[input.paymentMethod];
      const userInfo = `${ctx.user.name ?? "—"} <${ctx.user.email ?? "—"}>`;
      const workspaceInfo =
        input.workspaceName ??
        (ctx.user.workspaceId ? `workspace #${ctx.user.workspaceId}` : "—");

      // Persist the user's billing preference on the workspace so the grace
      // period / dunning flow knows which method to retry against and the
      // dashboard banner can display a context-correct message.
      if (ctx.user.workspaceId) {
        const db = await requireDb();
        await db
          .update(workspaces)
          .set({
            billingPeriod: input.period,
            paymentMethod: input.paymentMethod,
          })
          .where(eq(workspaces.id, ctx.user.workspaceId));
      }

      if (isICountConfigured()) {
        console.warn(
          "[billing] iCount key present but checkout not yet wired; using manual followup",
        );
      }

      const title = `💳 בקשת מנוי חדשה — ${planLabel} ${periodLabel}`;
      const content =
        `משתמש: ${userInfo}\n` +
        `סוכנות: ${workspaceInfo}\n` +
        `תוכנית: ${planLabel} (${periodLabel})\n` +
        `אמצעי תשלום: ${paymentMethodLabel}\n` +
        `סכום: ₪${amount.toLocaleString("he-IL")}\n\n` +
        `יש לחזור ללקוח עם לינק תשלום ב-iCount (להנפיק הוראת קבע אם נדרש).`;

      let delivered = false;
      try {
        delivered = await notifyOwner({ title, content });
      } catch (err) {
        console.error("[billing] notifyOwner failed", err);
      }

      // Internal staff notification — kept simple HTML so it's readable in any
      // mail client. The CUSTOMER-facing emails go through renderBrandedEmail.
      const html = `<div dir="rtl" style="font-family:Heebo,Arial,sans-serif;line-height:1.7;color:#1f2233">
        <h2 style="margin:0 0 12px 0;color:#1f2233">💳 בקשת מנוי חדשה ב-SPARK Quality</h2>
        <p><strong>משתמש:</strong> ${userInfo}</p>
        <p><strong>סוכנות:</strong> ${workspaceInfo}</p>
        <p><strong>תוכנית:</strong> ${planLabel} ${periodLabel}</p>
        <p><strong>אמצעי תשלום:</strong> ${paymentMethodLabel}</p>
        <p><strong>סכום:</strong> ₪${amount.toLocaleString("he-IL")}</p>
        <hr style="border:none;border-top:1px solid #c8a96a33;margin:16px 0"/>
        <p style="font-size:12px;color:#6b6f80">יש להפיק לינק תשלום ב-iCount ולשלוח ללקוח. ההודעה נשלחה אוטומטית מ-SPARK Quality.</p>
      </div>`;

      const emailResult = await sendEmail({
        to: "anathemell@gmail.com",
        subject: title,
        html,
        replyTo: ctx.user.email ?? undefined,
      });
      if (!emailResult.ok) {
        console.warn("[billing] email send failed:", emailResult.error);
      }

      // Customer confirmation (branded RTL).
      if (ctx.user.email) {
        const customerEmail = renderBrandedEmail({
          subject: `קיבלנו את הבקשה — תוכנית ${planLabel} ${periodLabel}`,
          eyebrow: "אישור קליטת בקשה",
          headline: "תודה! קיבלנו את הבקשה למנוי",
          greeting: ctx.user.name ? `שלום ${ctx.user.name},` : "שלום רב,",
          body: [
            "ענת מצוות SPARK תיצור איתכם קשר במייל בשעות הקרובות עם לינק תשלום מאובטח ב-iCount.",
            {
              type: "highlight",
              label: "פרטי הבקשה",
              value: `${planLabel} · ${periodLabel} · ₪${amount.toLocaleString("he-IL")}`,
              note: `אמצעי תשלום שנבחר: ${paymentMethodLabel}.`,
              tone: "success",
            },
            "ברגע שהתשלום יושלם — הגישה המלאה למערכת תיפתח אוטומטית.",
          ],
          cta: { label: "כניסה לאזור האישי", url: "https://spark-ai.co.il/login" },
          footerNote:
            "אם לא ביצעתם בקשה זו, אנא התעלמו מההודעה או צרו איתנו קשר במייל anat@spark-ai.co.il.",
        });
        const confirm = await sendEmail({
          to: ctx.user.email,
          subject: customerEmail.subject,
          html: customerEmail.html,
          text: customerEmail.text,
        });
        if (!confirm.ok) {
          console.warn("[billing] customer confirmation failed:", confirm.error);
        }
      }

      return {
        ok: true as const,
        mode: "manual_followup" as const,
        plan: input.plan,
        period: input.period,
        paymentMethod: input.paymentMethod,
        amount,
        delivered,
        emailed: emailResult.ok,
      };
    }),

  /**
   * Open a standing-order capture session for the current workspace.
   *
   * Returns the iCount hosted-payment-page URL. The frontend opens it in a
   * new tab; iCount captures the card without charging it (hp=1), then calls
   * our `/api/icount/callback` to confirm. Once confirmed, the workspace is
   * marked active and a branded RTL receipt email is sent.
   */
  startStandingOrder: protectedProcedure
    .input(
      z.object({
        plan: z.enum(["basic", "pro", "premium"]),
        period: z.enum(["monthly", "yearly"]),
        origin: z.string().url(), // e.g. https://spark-quality.manus.space
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user.workspaceId) {
        throw new Error("אין סוכנות משויכת למשתמש");
      }
      if (!iCountSdk.isConfigured()) {
        throw new Error(
          "מערכת הסליקה (iCount) טרם הוגדרה. צות ה-SPARK יצור קשר בהקדם.",
        );
      }
      const db = await requireDb();
      const [ws] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, ctx.user.workspaceId))
        .limit(1);
      if (!ws) throw new Error("לא נמצאה סוכנות למשתמש");
      if (!ws.taxId || !ws.contactPhone) {
        throw new Error(
          "לפתיחת הוראת קבע יש להשלים תחילה טלפון ומספר ח.פ/ת.ז בפרטי הסוכנות.",
        );
      }

      // Persist the chosen plan/period so subsequent retries (and the
      // success-callback) know what to charge.
      await db
        .update(workspaces)
        .set({
          billingPeriod: input.period,
          paymentMethod: "standing_order",
        })
        .where(eq(workspaces.id, ws.id));

      const amount = PLAN_PRICES[input.plan][input.period];
      const planLabel = PLAN_LABELS[input.plan];
      const periodLabel = PERIOD_LABELS[input.period];
      const description = `מנוי SPARK Quality · ${planLabel} · ${periodLabel}`;
      const state = iCountSdk.newState(ws.id);
      const callbackUrl = `${input.origin.replace(/\/$/, "")}/api/icount/callback`;
      const successUrl = `${input.origin.replace(/\/$/, "")}/billing/success?ws=${ws.id}`;
      const failureUrl = `${input.origin.replace(/\/$/, "")}/billing/failed?ws=${ws.id}`;
      const url = iCountSdk.buildPaymentPageUrl({
        amount,
        description,
        email: ctx.user.email ?? "",
        name: ctx.user.name ?? ws.name,
        phone: ws.contactPhone,
        taxId: ws.taxId,
        successUrl,
        failureUrl,
        callbackUrl,
        workspaceId: ws.id,
        state,
      });
      return {
        ok: true as const,
        url,
        amount,
        plan: input.plan,
        period: input.period,
      };
    }),
  /**
   * Called by Express handler `/api/icount/callback` after verifying the
   * iCount HMAC. Activates the workspace.
   */
  confirmStandingOrder: publicProcedure
    .input(
      z.object({
        workspaceId: z.number().int().positive(),
        iCountSubscriptionId: z.string().min(1).max(64),
        iCountClientId: z.string().min(1).max(64).optional(),
        state: z.string().min(8),
        signature: z.string().min(8),
      }),
    )
    .mutation(async ({ input }) => {
      const ok = iCountSdk.verifyCallback(
        input.state,
        input.workspaceId,
        input.iCountSubscriptionId,
        input.signature,
      );
      if (!ok) throw new Error("חתימה לא תקפה");
      const db = await requireDb();
      const now = new Date();
      await db
        .update(workspaces)
        .set({
          subscriptionStatus: "active",
          paymentMethod: "standing_order",
          iCountSubscriptionId: input.iCountSubscriptionId,
          iCountClientId: input.iCountClientId ?? null,
          lastPaymentAt: now,
          pastDueSince: null,
          suspensionEmailSentAt: null,
        })
        .where(eq(workspaces.id, input.workspaceId));
      // Round 114 — תשלום אושר → מקדמים אוטומטית את ה-creator לתפקיד "owner".
      await promoteCreatorToOwnerIfActive(input.workspaceId);
      return { ok: true as const };
    }),
  /**
   * Production payment path — POST a JSON payload to the user's Make.com
   * webhook. Make orchestrates the iCount payment page, charges the customer,
   * and POSTs back to /api/billing/activate when the standing order is set up.
   *
   * This procedure does NOT itself open a payment page or call iCount; that
   * is the responsibility of the Make scenario the user controls. We just
   * deliver a signed envelope with everything Make needs to act.
   */
  startCheckoutViaMake: protectedProcedure
    .input(
      z.object({
        plan: z.enum(["basic", "pro", "premium"]),
        period: z.enum(["monthly", "yearly"]),
        origin: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user.workspaceId) {
        throw new Error("אין סוכנות משוייכת למשתמש");
      }
      const db = await requireDb();
      const [ws] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, ctx.user.workspaceId))
        .limit(1);
      if (!ws) throw new Error("לא נמצאה סוכנות למשתמש");
      if (!ws.taxId || !ws.contactPhone) {
        throw new Error(
          "למעבר לתשלום יש להשלים תחילה טלפון ומספר ח.פ/ת.ז בפרטי הסוכנות.",
        );
      }

      // Persist the chosen plan/period so future retries (and the activation
      // callback) know what to charge.
      await db
        .update(workspaces)
        .set({
          billingPeriod: input.period,
          paymentMethod: "standing_order",
        })
        .where(eq(workspaces.id, ws.id));

      const amount = PLAN_PRICES[input.plan][input.period];
      const planLabel = PLAN_LABELS[input.plan];
      const periodLabel = PERIOD_LABELS[input.period];
      const requestId = makeCheckoutSdk.newRequestId();
      const issuedAt = new Date().toISOString();
      const cleanOrigin = input.origin.replace(/\/$/, "");
      const returnUrl = `${cleanOrigin}/billing/waiting?ws=${ws.id}&req=${requestId}`;
      const activationUrl = `${cleanOrigin}/api/billing/activate`;

      const base = {
        requestId,
        workspaceId: ws.id,
        workspaceName: ws.name,
        plan: input.plan,
        planLabel,
        billingPeriod: input.period,
        billingPeriodLabel: periodLabel,
        amount,
        currency: "ILS" as const,
        customer: {
          name: ctx.user.name ?? ws.name,
          email: ctx.user.email ?? "",
          phone: ws.contactPhone,
          taxId: ws.taxId,
          taxIdType: (ws.taxIdType ?? "company") as "company" | "individual",
        },
        returnUrl,
        activationUrl,
        issuedAt,
      };
      const signature = makeCheckoutSdk.signCheckout(base);
      const payload = { ...base, signature };

      let paymentUrl: string | undefined;
      try {
        const res = await makeCheckoutSdk.postToMake(payload);
        if (!res.ok) {
          console.warn("[billing] Make webhook non-2xx", res.status, res.body);
          throw new Error(
            `מערכת התשלום (Make) החזירה שגיאה (${res.status}). אנא נסו שוב.`,
          );
        }
        paymentUrl = res.paymentUrl;
      } catch (err) {
        console.error("[billing] Make webhook failed", err);
        throw new Error(
          "לא הצלחנו לשגר את הבקשה למערכת התשלום. צוות SPARK קיבל התראה ויטפל בזה ידנית.",
        );
      }

      // Persist a pending payment_attempts row so the abandoned-cart watchdog
      // (POST /api/scheduled/abandonedCarts) can find it 15 minutes from now
      // if no /api/billing/activate callback arrives.
      try {
        await createPaymentAttempt({
          requestId,
          workspaceId: ws.id,
          initiatedByUserId: ctx.user.id,
          plan: input.plan,
          billingPeriod: input.period,
          amount,
          customerSnapshot: {
            name: ctx.user.name ?? ws.name ?? "",
            email: ctx.user.email ?? "",
            phone: ws.contactPhone ?? "",
            taxId: ws.taxId ?? "",
          },
          paymentUrl,
        });
      } catch (persistErr) {
        // Best-effort — do not block the customer from reaching the payment
        // page just because we couldn't write the audit row.
        console.warn("[billing] payment_attempts insert failed", persistErr);
      }

      // Best-effort customer confirmation: tell them a payment link is on the
      // way. The actual link is generated and sent by the Make scenario.
      if (ctx.user.email) {
        const customerEmail = renderBrandedEmail({
          subject: `מעבירים אותכם לתשלום — ${planLabel} ${periodLabel}`,
          eyebrow: "אישור קליטת בקשה",
          headline: "תודה! מכינים לכם לינק תשלום מאובטח",
          greeting: ctx.user.name ? `שלום ${ctx.user.name},` : "שלום רב,",
          body: [
            "קיבלנו את הבקשה לתשלום והתהליך החל. בדקות הקרובות יגיע אליכם מייל נפרד עם לינק לעמוד התשלום המאובטח.",
            {
              type: "highlight",
              label: "פרטי הבקשה",
              value: `${planLabel} · ${periodLabel} · ₪${amount.toLocaleString("he-IL")}`,
              note: "החיוב מתבצע בהוראת קבע (ללא תשלומים).",
              tone: "success",
            },
            "ברגע שהתשלום יושלם — הגישה למערכת תיפתח אוטומטית, והחשבונית תעלה במייל מ-iCount.",
          ],
          cta: { label: "מעבר למסך המתנה", url: returnUrl },
          footerNote:
            "אם לא ביצעתם בקשה זו, נא להתעלם או ליצור קשר במייל anat@spark-ai.co.il.",
        });
        const result = await sendEmail({
          to: ctx.user.email,
          subject: customerEmail.subject,
          html: customerEmail.html,
          text: customerEmail.text,
        });
        if (!result.ok) {
          console.warn("[billing] Make confirm email failed", result.error);
        }
      }

      return {
        ok: true as const,
        requestId,
        plan: input.plan,
        period: input.period,
        amount,
        returnUrl,
        paymentUrl,
      };
    }),

  /**
   * Internal procedure — called by an admin tool / scheduled job to mark a
   * workspace as past_due (charge failed). Not wired to a UI yet but exposed
   * here so the tRPC layer is the single entry point.
   */
  markPastDue: protectedProcedure
    .input(z.object({ workspaceId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      // Only SPARK super-admin can mark workspaces past_due.
      if (ctx.user.isSuperAdmin !== true) {
        throw new Error("FORBIDDEN");
      }
      const db = await requireDb();
      const now = new Date();
      await db
        .update(workspaces)
        .set({
          subscriptionStatus: "past_due",
          pastDueSince: now,
        })
        .where(eq(workspaces.id, input.workspaceId));

      // Also send the past-due reminder to every workspace member.
      const members: MemberRow[] = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.workspaceId, input.workspaceId));
      const [ws] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, input.workspaceId))
        .limit(1);
      if (ws) {
        const safePlan = normalizePlan(ws.plan);
        const period = ws.billingPeriod as PeriodKey;
        const amount = PLAN_PRICES[safePlan][period];
        await Promise.all(
          members
            .filter((m: MemberRow) => Boolean(m.email))
            .map((m: MemberRow) =>
              sendPastDueReminderEmail({
                to: m.email!,
                recipientName: m.name,
                workspaceName: ws.name,
                planLabel: PLAN_LABELS[safePlan],
                periodLabel: PERIOD_LABELS[period],
                amount,
                daysRemaining: GRACE_PERIOD_DAYS,
              }),
            ),
        );
      }
      return { ok: true as const };
    }),

  /**
   * Internal procedure — escalate workspaces whose grace window has expired.
   * Idempotent: only suspends workspaces still in `past_due` whose 3 days are
   * up, and only sends the suspension email once per workspace.
   */
  enforceSuspensions: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.isSuperAdmin !== true) {
      throw new Error("FORBIDDEN");
    }
    const db = await requireDb();
    const all = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.subscriptionStatus, "past_due"));
    let suspended = 0;
    for (const ws of all) {
      const access = computeAccessStatus({
        subscriptionStatus: ws.subscriptionStatus,
        pastDueSince: ws.pastDueSince,
      });
      if (access.status !== "blocked") continue;

      await db
        .update(workspaces)
        .set({
          subscriptionStatus: "suspended",
          suspensionEmailSentAt: ws.suspensionEmailSentAt ?? new Date(),
        })
        .where(eq(workspaces.id, ws.id));
      suspended += 1;

      if (!ws.suspensionEmailSentAt) {
        const safePlan = normalizePlan(ws.plan);
        const period = ws.billingPeriod as PeriodKey;
        const amount = PLAN_PRICES[safePlan][period];

        const members: MemberRow[] = await db
          .select({ email: users.email, name: users.name })
          .from(users)
          .where(eq(users.workspaceId, ws.id));

        await Promise.all(
          members
            .filter((m: MemberRow) => Boolean(m.email))
            .map((m: MemberRow) =>
              sendSuspensionEmail({
                to: m.email!,
                recipientName: m.name,
                workspaceName: ws.name,
                planLabel: PLAN_LABELS[safePlan],
                periodLabel: PERIOD_LABELS[period],
                amount,
              }),
            ),
        );
      }
    }
    return { ok: true as const, suspended };
  }),

  /**
   * Internal procedure — restore access (called when payment is confirmed).
   */
  restoreAccess: protectedProcedure
    .input(z.object({ workspaceId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.isSuperAdmin !== true) {
        throw new Error("FORBIDDEN");
      }
      const db = await requireDb();
      await db
        .update(workspaces)
        .set({
          subscriptionStatus: "active",
          pastDueSince: null,
          suspensionEmailSentAt: null,
          lastPaymentAt: new Date(),
        })
        .where(eq(workspaces.id, input.workspaceId));
      // Round 114 — מקדמים אוטומטית את ה-creator ל-"owner" אם הוא עדיין אגן.
      await promoteCreatorToOwnerIfActive(input.workspaceId);
      return { ok: true as const };
    }),

  /**
   * Enterprise card CTA: a public lead-capture endpoint. Anyone can submit
   * (logged-in or not). We email Anat and ping the owner via notifyOwner so
   * the lead lands in two channels at once. We deliberately do not store
   * leads in a dedicated table yet — keep it simple until volume justifies it.
   */
  requestEnterpriseContact: publicProcedure
    .input(
      z.object({
        fullName: z.string().min(2).max(120),
        email: z.string().email(),
        phone: z.string().min(6).max(40),
        agencyName: z.string().max(160).optional(),
        clientCount: z.string().max(40).optional(),
        notes: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const lines: string[] = [
        `שם: ${input.fullName}`,
        `אימייל: ${input.email}`,
        `טלפון: ${input.phone}`,
      ];
      if (input.agencyName) lines.push(`סוכנות: ${input.agencyName}`);
      if (input.clientCount) lines.push(`כמות לקוחות משוערת: ${input.clientCount}`);
      if (input.notes) lines.push("", `הערות: ${input.notes}`);
      const content = lines.join("\n");
      const title = `🟡 ליד Enterprise חדש — ${input.fullName}`;

      let delivered = false;
      try {
        delivered = await notifyOwner({ title, content });
      } catch (err) {
        console.error("[billing] enterprise notifyOwner failed", err);
      }

      try {
        const ownerEmail = "anat@sparkai.co.il";
        const { subject, html, text } = renderBrandedEmail({
          subject: title,
          eyebrow: "SPARK Quality · Enterprise",
          headline: "ליד Enterprise חדש הממתין למעקב",
          greeting: "שלום ענת,",
          body: [
            `התקבלה פניה מ ${input.fullName} דרך מסך תמחור Enterprise.`,
            { type: "list", title: "פרטי הליד", items: lines },
          ],
        });
        await sendEmail({ to: ownerEmail, subject, html, text });
      } catch (err) {
        console.error("[billing] enterprise email failed", err);
      }

      return { delivered } as const;
    }),

  /**
   * Returns the most recent payment attempts for the caller's workspace,
   * newest first. Drives the "Billing history" table on /account/billing.
   * Limits to the latest 25 rows because the table is append-only and we
   * never want this to become a paginated nightmare on the client.
   */
  history: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user.workspaceId) return [] as const;
    const db = await requireDb();
    const { paymentAttempts } = await import("../drizzle/schema");
    const { desc } = await import("drizzle-orm");
    const rows = await db
      .select({
        id: paymentAttempts.id,
        requestId: paymentAttempts.requestId,
        plan: paymentAttempts.plan,
        billingPeriod: paymentAttempts.billingPeriod,
        amount: paymentAttempts.amount,
        status: paymentAttempts.status,
        invoiceId: paymentAttempts.invoiceId,
        paymentUrl: paymentAttempts.paymentUrl,
        callbackAt: paymentAttempts.callbackAt,
        createdAt: paymentAttempts.createdAt,
      })
      .from(paymentAttempts)
      .where(eq(paymentAttempts.workspaceId, ctx.user.workspaceId))
      .orderBy(desc(paymentAttempts.createdAt))
      .limit(25);
    return rows;
  }),

  /**
   * Returns daily client-count snapshots for the last 90 days. Used by the
   * usage chart on /account/billing. We don't keep a dedicated snapshot
   * table; instead we derive the cumulative count from `clients.createdAt`,
   * which is monotonically increasing per workspace.
   *
   * Output: Array<{ date: 'YYYY-MM-DD'; count: number }>
   */
  usageHistory: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user.workspaceId) return [] as Array<{ date: string; count: number }>;
    const db = await requireDb();
    const { clients } = await import("../drizzle/schema");
    const rows = await db
      .select({ createdAt: clients.createdAt })
      .from(clients)
      .where(eq(clients.workspaceId, ctx.user.workspaceId));

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const days: Array<{ date: string; count: number }> = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(d.getUTCDate()).padStart(2, "0");
      days.push({ date: `${yyyy}-${mm}-${dd}`, count: 0 });
    }

    for (const row of rows) {
      const created = new Date(row.createdAt);
      created.setUTCHours(0, 0, 0, 0);
      for (const day of days) {
        const dayDate = new Date(`${day.date}T00:00:00Z`);
        if (dayDate.getTime() >= created.getTime()) day.count++;
      }
    }

    return days;
  }),

  /**
   * Exchanges a paymentAttempts.invoiceId for a downloadable iCount URL.
   * Validates the invoice belongs to the caller's workspace before hitting
   * iCount, never exposes credentials to the client. Returns null when the
   * invoice can't be resolved or iCount isn't configured.
   */
  invoiceUrl: protectedProcedure
    .input(z.object({ invoiceId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user.workspaceId) return { url: null as string | null };
      const db = await requireDb();
      const { paymentAttempts } = await import("../drizzle/schema");
      const { and } = await import("drizzle-orm");
      const owned = await db
        .select({ id: paymentAttempts.id })
        .from(paymentAttempts)
        .where(
          and(
            eq(paymentAttempts.workspaceId, ctx.user.workspaceId),
            eq(paymentAttempts.invoiceId, input.invoiceId),
          ),
        )
        .limit(1);
      if (owned.length === 0) return { url: null };

      const apiUser = process.env.ICOUNT_API_USER;
      const apiToken = process.env.ICOUNT_API_TOKEN;
      const company = process.env.ICOUNT_COMPANY_ID;
      if (!apiUser || !apiToken || !company) return { url: null };

      try {
        const resp = await fetch(
          `https://api.icount.co.il/api/v3.php/doc/info?cid=${encodeURIComponent(company)}&user=${encodeURIComponent(apiUser)}&pass=${encodeURIComponent(apiToken)}&doc_type=invoice&docnum=${encodeURIComponent(input.invoiceId)}`,
        );
        if (!resp.ok) return { url: null };
        const data = (await resp.json()) as { doc_url?: string; pdf_link?: string };
        return { url: data.doc_url ?? data.pdf_link ?? null };
      } catch (err) {
        console.warn("[billing.invoiceUrl] iCount fetch failed:", err);
        return { url: null };
      }
    }),
});
