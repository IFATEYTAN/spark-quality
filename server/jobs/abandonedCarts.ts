/**
 * Abandoned-cart watchdog.
 *
 * Heartbeat callback at POST /api/scheduled/abandonedCarts.
 *
 * Runs every minute (cron `0 * * * * *`). For every payment_attempts row
 * whose status is `pending`, was created more than ABANDONED_AFTER_MS ago,
 * and was not yet notified — we:
 *   1. Send a branded RTL email to the workspace owner (anat@spark-ai.co.il)
 *      with the customer details so she can manually follow up.
 *   2. Mark the attempt as `abandoned` and stamp `abandonedNotifiedAt` so we
 *      never email about the same attempt twice.
 *
 * The handler is idempotent: even if the cron fires twice for the same minute,
 * the second invocation will find no eligible rows because the first already
 * stamped `abandonedNotifiedAt`.
 */
import type { Request, Response } from "express";
import { sdk } from "../_core/sdk";
import {
  findAbandonedPaymentAttempts,
  markPaymentAttemptAbandoned,
} from "../db";
import { sendEmail } from "../email";
import { renderBrandedEmail } from "../emailTemplates";

const ABANDONED_AFTER_MS = 15 * 60 * 1000; // 15 minutes
const OWNER_EMAIL = "anat@spark-ai.co.il";

const PLAN_LABELS: Record<string, string> = {
  basic: "Base",
  pro: "Pro",
  premium: "Premium",
};
const PERIOD_LABELS: Record<string, string> = {
  monthly: "חודשי",
  yearly: "שנתי",
};

type CustomerSnapshot = {
  name?: string;
  email?: string;
  phone?: string;
  taxId?: string;
};

export async function abandonedCartsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    // Auth: only allow Heartbeat-cron callers (or super-admin manual triggers).
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      res.status(403).json({ error: "cron-only" });
      return;
    }

    const abandoned = await findAbandonedPaymentAttempts(ABANDONED_AFTER_MS);
    if (abandoned.length === 0) {
      res.json({ ok: true, processed: 0 });
      return;
    }

    let emailed = 0;
    let failed = 0;

    for (const attempt of abandoned) {
      const snapshot = (attempt.customerSnapshot ??
        {}) as CustomerSnapshot;
      const planLabel =
        PLAN_LABELS[attempt.plan as string] ?? attempt.plan;
      const periodLabel =
        PERIOD_LABELS[attempt.billingPeriod as string] ??
        attempt.billingPeriod;
      const ageMin = Math.round(
        (Date.now() - attempt.createdAt.getTime()) / 60000,
      );

      try {
        const { subject, html, text } = renderBrandedEmail({
          subject: `נטישת עגלה — ${snapshot.name ?? "לקוח/ה"} לא השלים/ה תשלום`,
          eyebrow: "התראת מערכת",
          headline: "תשלום לא הושלם — מומלץ ליצור קשר",
          greeting: "שלום ענת,",
          body: [
            `לפני ${ageMin} דקות התחיל/ה לקוח/ה תהליך תשלום אך לא קיבלנו עדיין callback מ-Make. כנראה נטישת עגלה.`,
            {
              type: "highlight",
              label: "פרטי הלקוח/ה",
              value: snapshot.name ?? "(לא סופק שם)",
              note: [
                snapshot.email ? `מייל: ${snapshot.email}` : null,
                snapshot.phone ? `טלפון: ${snapshot.phone}` : null,
                snapshot.taxId ? `ח.פ/ת.ז: ${snapshot.taxId}` : null,
              ]
                .filter(Boolean)
                .join(" · "),
              tone: "warn",
            },
            {
              type: "highlight",
              label: "פרטי הבקשה",
              value: `${planLabel} · ${periodLabel} · ₪${attempt.amount.toLocaleString("he-IL")}`,
              note: `requestId: ${attempt.requestId} · workspaceId: ${attempt.workspaceId}`,
              tone: "default",
            },
            "מומלץ ליצור קשר ידני בטלפון/וואטסאפ ולברר אם נתקלו בבעיה. אם התשלום הושלם בפועל ב-iCount — אפשר להפעיל את המנוי ידנית מתוך פאנל הסופר-אדמין.",
          ],
          cta: snapshot.phone
            ? {
                label: "פתיחת וואטסאפ",
                url: `https://wa.me/${snapshot.phone.replace(/[^\d]/g, "").replace(/^0/, "972")}`,
              }
            : undefined,
          footerNote:
            "התראה זו נשלחה אוטומטית ע\"י watchdog נטישת-עגלה (15 דקות ללא callback).",
        });
        const result = await sendEmail({
          to: OWNER_EMAIL,
          subject,
          html,
          text,
        });
        if (!result.ok) {
          console.warn(
            "[abandoned-carts] email failed for",
            attempt.requestId,
            result.error,
          );
          failed++;
          continue;
        }
        await markPaymentAttemptAbandoned(attempt.requestId);
        emailed++;
      } catch (err) {
        console.error(
          "[abandoned-carts] handler error for",
          attempt.requestId,
          err,
        );
        failed++;
      }
    }

    res.json({
      ok: true,
      processed: abandoned.length,
      emailed,
      failed,
    });
  } catch (err) {
    console.error("[abandoned-carts] fatal", err);
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      error: message,
      stack: err instanceof Error ? err.stack : undefined,
      context: { url: req.originalUrl },
      timestamp: new Date().toISOString(),
    });
  }
}
