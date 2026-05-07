import { z } from "zod";
import { ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";
import { protectedProcedure, router } from "./_core/trpc";
import { sendEmail } from "./email";

// 3-tier pricing. Yearly price = monthly with ~16% discount, billed once a year.
const PLAN_PRICES = {
  basic: { monthly: 150, yearly: 150 * 12 },
  pro: { monthly: 249, yearly: 249 * 12 },
  premium: { monthly: 389, yearly: 389 * 12 },
} as const;

const PLAN_LABELS = {
  basic: "Base",
  pro: "Pro",
  premium: "Premium",
} as const;

// Quota of "flags" (דגלים / התראות פעילות) the user can have open at any moment.
const PLAN_FLAGS_QUOTA = {
  basic: 50,
  pro: 200,
  premium: -1, // -1 = unlimited
} as const;

const PLAN_CLIENT_LIMIT = {
  basic: 300,
  pro: 1000,
  premium: -1, // -1 = unlimited
} as const;

const PERIOD_LABELS = {
  monthly: "חודשי",
  yearly: "שנתי",
} as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Once ICOUNT_API_KEY + ICOUNT_COMPANY_ID are set, swap the manual flow for a
// real iCount-hosted checkout. Until then we surface every request to SPARK
// staff so nothing is lost.
function isICountConfigured(): boolean {
  return Boolean(ENV.iCountApiKey && ENV.iCountCompanyId);
}

export const billingRouter = router({
  /**
   * Plans + prices the client renders. Source of truth for both /pricing and
   * the onboarding billing step so they cannot drift apart.
   */
  plans: protectedProcedure.query(() => {
    return {
      basic: {
        label: PLAN_LABELS.basic,
        monthly: PLAN_PRICES.basic.monthly,
        yearlyPerMonth: PLAN_PRICES.basic.yearly / 12,
        yearlyTotal: PLAN_PRICES.basic.yearly,
        flagsQuota: PLAN_FLAGS_QUOTA.basic,
        clientLimit: PLAN_CLIENT_LIMIT.basic,
      },
      pro: {
        label: PLAN_LABELS.pro,
        monthly: PLAN_PRICES.pro.monthly,
        yearlyPerMonth: PLAN_PRICES.pro.yearly / 12,
        yearlyTotal: PLAN_PRICES.pro.yearly,
        flagsQuota: PLAN_FLAGS_QUOTA.pro,
        clientLimit: PLAN_CLIENT_LIMIT.pro,
      },
      premium: {
        label: PLAN_LABELS.premium,
        monthly: PLAN_PRICES.premium.monthly,
        yearlyPerMonth: PLAN_PRICES.premium.yearly / 12,
        yearlyTotal: PLAN_PRICES.premium.yearly,
        flagsQuota: PLAN_FLAGS_QUOTA.premium,
        clientLimit: PLAN_CLIENT_LIMIT.premium,
      },
      icountReady: isICountConfigured(),
    };
  }),

  /**
   * User picks a paid plan. Two outcomes:
   *  - iCount configured → return a hosted checkout URL (TODO when key arrives).
   *  - Otherwise → notify SPARK staff via Manus + email, return mode="manual_followup"
   *    so the client can show "we'll be in touch" and keep the flow moving.
   *
   * Trial is the default at workspace creation; this endpoint is for upgrades only.
   */
  requestCheckout: protectedProcedure
    .input(
      z.object({
        plan: z.enum(["basic", "pro", "premium"]),
        period: z.enum(["monthly", "yearly"]),
        workspaceName: z.string().trim().max(200).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const amount = PLAN_PRICES[input.plan][input.period];
      const planLabel = PLAN_LABELS[input.plan];
      const periodLabel = PERIOD_LABELS[input.period];
      const userInfo = `${ctx.user.name ?? "—"} <${ctx.user.email ?? "—"}>`;
      const workspaceInfo =
        input.workspaceName ??
        (ctx.user.workspaceId ? `workspace #${ctx.user.workspaceId}` : "—");

      if (isICountConfigured()) {
        // TODO: wire real iCount checkout once the key arrives. Until then we
        // still go through the manual flow so requests are not silently dropped.
        console.warn(
          "[billing] iCount key present but checkout not yet wired; using manual followup"
        );
      }

      const title = `💳 בקשת מנוי חדשה — ${planLabel} ${periodLabel}`;
      const content =
        `משתמש: ${userInfo}\n` +
        `סוכנות: ${workspaceInfo}\n` +
        `תוכנית: ${planLabel} (${periodLabel})\n` +
        `סכום: ₪${amount.toLocaleString("he-IL")}\n\n` +
        `יש לחזור ללקוח עם לינק תשלום ב-iCount.`;

      let delivered = false;
      try {
        delivered = await notifyOwner({ title, content });
      } catch (err) {
        console.error("[billing] notifyOwner failed", err);
      }

      const html = `<div dir="rtl" style="font-family:Heebo,Arial,sans-serif;line-height:1.7;color:#1f2233">
        <h2 style="margin:0 0 12px 0;color:#1f2233">💳 בקשת מנוי חדשה ב-SPARK Quality</h2>
        <p><strong>משתמש:</strong> ${escapeHtml(userInfo)}</p>
        <p><strong>סוכנות:</strong> ${escapeHtml(workspaceInfo)}</p>
        <p><strong>תוכנית:</strong> ${escapeHtml(planLabel)} ${escapeHtml(periodLabel)}</p>
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

      return {
        ok: true as const,
        mode: "manual_followup" as const,
        plan: input.plan,
        period: input.period,
        amount,
        delivered,
        emailed: emailResult.ok,
      };
    }),
});
