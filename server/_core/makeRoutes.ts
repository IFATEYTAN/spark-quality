import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { workspaces, users } from "../../drizzle/schema";
import {
  getDb,
  markPaymentAttemptFailed,
  markPaymentAttemptSucceeded,
  promoteCreatorToOwnerIfActive,
} from "../db";
import { sendEmail } from "../email";
import { renderBrandedEmail } from "../emailTemplates";
import { makeCheckoutSdk } from "../makeCheckout";
import { ENV } from "./env";

/**
 * Activation callback from the Make.com scenario after a payment is confirmed.
 *
 * Expected JSON payload (POST application/json):
 *   {
 *     "workspaceId": 123,
 *     "requestId": "<the requestId we sent in the original webhook>",
 *     "status": "ok" | "fail",
 *     "plan": "basic" | "pro" | "premium",   // optional, for sanity-check
 *     "billingPeriod": "monthly" | "yearly", // optional
 *     "invoiceId": "12345",                  // iCount document id
 *     "subscriptionId": "67890",             // iCount standing-order id
 *     "clientId": "555",                     // iCount client id
 *     "signature": "<HMAC-SHA256 hex>"       // see makeCheckout.signActivation
 *   }
 *
 * The signature is computed as
 *   HMAC-SHA256(MAKE_WEBHOOK_SECRET,
 *     `${workspaceId}|${requestId}|${status}|${invoiceId}|${subscriptionId}`)
 *
 * On a successful (status="ok") activation we flip the workspace to
 *   subscriptionStatus = active
 *   billingPeriod      = (whatever Make confirms, otherwise the existing value)
 *   paymentMethod      = standing_order
 *   subscriptionEndsAt = now + 1 year (yearly) or +1 month (monthly)
 *   iCountSubscriptionId / iCountClientId / iCountLastInvoiceId from payload
 *   pastDueSince = null, suspensionEmailSentAt = null, lastPaymentAt = now
 *
 * and send a branded RTL "subscription activated" email to all members.
 */
function addOneMonth(date: Date): Date {
  const out = new Date(date);
  out.setMonth(out.getMonth() + 1);
  return out;
}
function addOneYear(date: Date): Date {
  const out = new Date(date);
  out.setFullYear(out.getFullYear() + 1);
  return out;
}

export function registerMakeRoutes(app: Express): void {
  app.post("/api/billing/activate", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as {
        workspaceId?: number | string;
        requestId?: string;
        status?: "ok" | "fail";
        plan?: "basic" | "pro" | "premium";
        billingPeriod?: "monthly" | "yearly";
        invoiceId?: string;
        subscriptionId?: string;
        clientId?: string;
        signature?: string;
      };

      const workspaceId = Number(body.workspaceId);
      const requestId = String(body.requestId ?? "");
      const status = (body.status ?? "ok") as "ok" | "fail";
      const invoiceId = body.invoiceId ? String(body.invoiceId) : "";
      const subscriptionId = body.subscriptionId ? String(body.subscriptionId) : "";
      const clientId = body.clientId ? String(body.clientId) : "";
      const signature = String(body.signature ?? "");

      if (!Number.isFinite(workspaceId) || workspaceId <= 0 || !requestId) {
        return res
          .status(400)
          .json({ ok: false, error: "missing_workspace_or_request" });
      }
      if (!signature) {
        return res.status(403).json({ ok: false, error: "missing_signature" });
      }

      const sigOk = makeCheckoutSdk.verifyActivation({
        workspaceId,
        requestId,
        status,
        invoiceId,
        subscriptionId,
        signature,
      });
      if (!sigOk) {
        console.warn(
          "[make activate] bad signature for workspace",
          workspaceId,
          "request",
          requestId,
        );
        return res.status(403).json({ ok: false, error: "bad_signature" });
      }

      const db = await getDb();
      if (!db) {
        return res.status(500).json({ ok: false, error: "db_unavailable" });
      }

      if (status !== "ok") {
        await db
          .update(workspaces)
          .set({
            subscriptionStatus: "past_due",
            pastDueSince: new Date(),
          })
          .where(eq(workspaces.id, workspaceId));
        try {
          await markPaymentAttemptFailed({
            requestId,
            errorMessage: "Make reported status=fail",
          });
        } catch (err) {
          console.warn("[make activate] mark failed error", err);
        }
        return res.json({ ok: true, marked: "past_due" });
      }

      const [ws] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1);
      if (!ws) {
        return res.status(404).json({ ok: false, error: "workspace_not_found" });
      }

      const now = new Date();
      const period = body.billingPeriod ?? ws.billingPeriod;
      const subscriptionEndsAt =
        period === "monthly" ? addOneMonth(now) : addOneYear(now);

      await db
        .update(workspaces)
        .set({
          subscriptionStatus: "active",
          paymentMethod: "standing_order",
          billingPeriod: period,
          plan: body.plan ?? ws.plan,
          iCountSubscriptionId: subscriptionId || ws.iCountSubscriptionId,
          iCountClientId: clientId || ws.iCountClientId,
          iCountLastInvoiceId: invoiceId || ws.iCountLastInvoiceId,
          lastPaymentAt: now,
          subscriptionEndsAt,
          pastDueSince: null,
          suspensionEmailSentAt: null,
        })
        .where(eq(workspaces.id, ws.id));

      // Round 114 — ה֣֠תשלום מאומת → מקדמים אוטומטית את ה-creator לתפקיד "owner".
      await promoteCreatorToOwnerIfActive(ws.id);

      // Notify every workspace member with a branded RTL activation email.
      const members = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.workspaceId, ws.id));

      const planMap = { basic: "Base", pro: "Pro", premium: "Premium" } as const;
      const periodMap = { monthly: "חודשי", yearly: "שנתי" } as const;
      const planLabel =
        planMap[(body.plan ?? ws.plan ?? "basic") as keyof typeof planMap] ??
        "SPARK Quality";
      const periodLabel = periodMap[period as keyof typeof periodMap] ?? "חודשי";

      await Promise.all(
        members
          .filter((m) => Boolean(m.email))
          .map(async (m) => {
            const { subject, html, text } = renderBrandedEmail({
              subject: `המנוי ל-SPARK Quality פעיל — ${planLabel} ${periodLabel}`,
              eyebrow: "אישור הפעלת מנוי",
              headline: "המנוי שלכם פעיל — ברוכים הבאים ל-SPARK Quality",
              greeting: m.name ? `שלום ${m.name},` : "שלום רב,",
              body: [
                `התשלום עבור הסוכנות "${ws.name}" אושר בהצלחה והגישה למערכת פתוחה במלואה.`,
                {
                  type: "highlight",
                  label: "פרטי המנוי",
                  value: `${planLabel} · ${periodLabel}`,
                  note: invoiceId
                    ? `חשבונית מס/קבלה (${invoiceId}) נשלחה אליכם בנפרד מ-iCount.`
                    : "חשבונית מס/קבלה תישלח אליכם בנפרד מ-iCount.",
                  tone: "success",
                },
                "ניתן לעדכן אמצעי תשלום או לבטל את הוראת הקבע בכל עת באזור האישי.",
              ],
              cta: {
                label: "כניסה למערכת",
                // IMPORTANT: never use req.host here. Make.com hits the
                // internal Cloud Run host (e.g. *.run.app) which is NOT a
                // valid OAuth redirect target. Always build email links from
                // the public, OAuth-allow-listed origin.
                url: `${ENV.publicAppUrl}/dashboard`,
              },
              footerNote:
                "אם לא ביצעתם רכישה זו, צרו איתנו קשר מיידית במייל anat@spark-ai.co.il.",
            });
            return sendEmail({ to: m.email!, subject, html, text });
          }),
      );

      try {
        await markPaymentAttemptSucceeded({
          requestId,
          invoiceId: invoiceId || undefined,
          subscriptionId: subscriptionId || undefined,
        });
      } catch (err) {
        // Non-fatal — the workspace is already active; the audit row just
        // stays in `pending` (the watchdog will eventually flip it to
        // `abandoned`, which is a known false-positive we accept).
        console.warn("[make activate] mark succeeded error", err);
      }

      return res.json({
        ok: true,
        workspaceId: ws.id,
        subscriptionStatus: "active",
        subscriptionEndsAt: subscriptionEndsAt.toISOString(),
      });
    } catch (err) {
      console.error("[make activate] error", err);
      return res.status(500).json({ ok: false, error: "internal" });
    }
  });
}
