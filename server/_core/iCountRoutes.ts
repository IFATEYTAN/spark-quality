import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { workspaces, users } from "../../drizzle/schema";
import { iCountSdk } from "../iCount";
import { getDb, promoteCreatorToOwnerIfActive } from "../db";
import { sendEmail } from "../email";
import { renderBrandedEmail } from "../emailTemplates";
import { ENV } from "./env";

/**
 * iCount sends a server-to-server notification (notify_url we configured) to
 * confirm a hosted-payment-page capture. Field shape (best-effort, mirrors
 * iCount's documented hosted-page callback):
 *
 *   GET /api/icount/callback?
 *     cf1=<workspaceId>            (custom field 1)
 *     cf2=<state>                  (custom field 2 — our nonce)
 *     subscription_id=...          (the standing-order id)
 *     client_id=...                (the iCount client/customer id)
 *     status=ok|fail
 *     sig=<our HMAC>               (we ALSO append our own HMAC to ok_url so
 *                                   we can verify even if iCount's payload is
 *                                   trimmed by an edge proxy)
 *
 * We accept both POST (notify_url) and GET (ok_url redirect) so the user is
 * activated whether or not the server-to-server call lands first.
 */
export function registerICountRoutes(app: Express): void {
  const handler = async (req: Request, res: Response) => {
    try {
      const src = (req.method === "POST" ? req.body : req.query) ?? {};
      const cf1 = String(src.cf1 ?? src.workspace_id ?? "");
      const state = String(src.cf2 ?? src.state ?? "");
      const subscriptionId = String(
        src.subscription_id ?? src.standing_order_id ?? src.doc_id ?? "",
      );
      const clientId = String(src.client_id ?? src.cust_id ?? "");
      const status = String(src.status ?? "ok");
      const signature = String(src.sig ?? src.signature ?? "");

      if (!cf1 || !state || !subscriptionId) {
        return res
          .status(400)
          .json({ ok: false, error: "missing_required_fields" });
      }

      const parsed = iCountSdk.parseState(state);
      if (!parsed || String(parsed.workspaceId) !== cf1) {
        return res.status(400).json({ ok: false, error: "state_mismatch" });
      }

      // For our own-issued signature path (we sign successUrl ourselves so
      // the user's browser can't fake a successful redirect).
      if (signature) {
        const ok = iCountSdk.verifyCallback(
          state,
          parsed.workspaceId,
          subscriptionId,
          signature,
        );
        if (!ok) {
          return res.status(403).json({ ok: false, error: "bad_signature" });
        }
      }

      if (status !== "ok") {
        // Mark workspace past_due so the dunning flow takes over.
        const db = await getDb();
        if (db) {
          await db
            .update(workspaces)
            .set({
              subscriptionStatus: "past_due",
              pastDueSince: new Date(),
            })
            .where(eq(workspaces.id, parsed.workspaceId));
        }
        return res.json({ ok: true, marked: "past_due" });
      }

      const db = await getDb();
      if (!db) {
        return res.status(500).json({ ok: false, error: "db_unavailable" });
      }

      // Idempotency guard: this handler is registered for both GET (ok_url,
      // the user's browser redirect) and POST (notify_url, iCount's
      // server-to-server call), so the SAME activation can legitimately hit
      // us twice — plus iCount/edge proxies may retry the notify_url. Once
      // this subscriptionId is already active on the workspace, skip the
      // update and the member email instead of re-sending it on every hit.
      const [existingWs] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, parsed.workspaceId))
        .limit(1);
      if (
        existingWs?.subscriptionStatus === "active" &&
        existingWs.iCountSubscriptionId === subscriptionId
      ) {
        if (req.method === "GET") {
          return res.redirect(302, "/billing/success?confirmed=1");
        }
        return res.json({ ok: true, alreadyProcessed: true });
      }

      const now = new Date();
      await db
        .update(workspaces)
        .set({
          subscriptionStatus: "active",
          paymentMethod: "standing_order",
          iCountSubscriptionId: subscriptionId,
          iCountClientId: clientId || null,
          lastPaymentAt: now,
          pastDueSince: null,
          suspensionEmailSentAt: null,
        })
        .where(eq(workspaces.id, parsed.workspaceId));

      // Round 114 — מקדמים את ה-creator לתפקיד "owner" מיד לאחר הפעלת המנוי.
      await promoteCreatorToOwnerIfActive(parsed.workspaceId);

      // Send branded RTL receipt email to all members.
      const [ws] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, parsed.workspaceId))
        .limit(1);
      if (ws) {
        const members = await db
          .select({ email: users.email, name: users.name })
          .from(users)
          .where(eq(users.workspaceId, ws.id));
        await Promise.all(
          members
            .filter((m) => Boolean(m.email))
            .map(async (m) => {
              const { subject, html, text } = renderBrandedEmail({
                subject: `הוראת הקבע אושרה — SPARK Quality`,
                eyebrow: "אישור הוראת קבע",
                headline: "הגישה ל-SPARK Quality פעילה",
                greeting: m.name ? `שלום ${m.name},` : "שלום רב,",
                body: [
                  `הוראת הקבע עבור הסוכנות "${ws.name}" הופעלה בהצלחה במערכת iCount.`,
                  "החיוב הבא יבוצע אוטומטית במחזור הקרוב, ובמקביל תופק חשבונית מס/קבלה דיגיטלית שתישלח אליכם במייל.",
                  {
                    type: "highlight",
                    label: "סטטוס",
                    value: "פעיל · גישה מלאה למערכת",
                    note: "ניתן לעדכן אמצעי תשלום בכל עת באזור האישי.",
                    tone: "success",
                  },
                ],
                cta: {
                  label: "כניסה למערכת",
                  // Use the public app URL, not req.host (which points to the
                  // internal Cloud Run host when iCount calls us directly).
                  url: `${ENV.publicAppUrl}/dashboard`,
                },
                footerNote:
                  "אם לא ביצעתם הרשמה זו או יש לכם שאלה, צרו קשר במייל anathemell@gmail.com.",
              });
              return sendEmail({ to: m.email!, subject, html, text });
            }),
        );
      }

      // If hit by the user's browser (GET ok_url) → redirect them to a clean
      // success page. If hit by iCount server-to-server (POST) → JSON.
      if (req.method === "GET") {
        return res.redirect(302, "/billing/success?confirmed=1");
      }
      return res.json({ ok: true });
    } catch (err) {
      console.error("[iCount callback] error", err);
      return res.status(500).json({ ok: false, error: "internal" });
    }
  };

  app.get("/api/icount/callback", handler);
  app.post("/api/icount/callback", handler);
}
