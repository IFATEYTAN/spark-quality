// server/quotaWatch.ts
// ----------------------------------------------------------------------------
// Daily quota-watch handler. Triggered by a project-level Heartbeat cron at
//   /api/scheduled/quotaWatch
//
// For every active workspace we compute the current client-count usage as a
// percentage of its plan quota. If usage >= 90% and we haven't sent a warning
// in the last 7 days, we email the workspace owner asking them to upgrade
// before the next client gets blocked. We persist the last warning timestamp
// on workspaces.quotaWarningSentAt so a noisy account can't be re-warned
// every day.
//
// The handler is idempotent: re-running it the same day is a no-op for
// workspaces that just received a warning.
// ----------------------------------------------------------------------------

import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { workspaces, clients, users } from "../drizzle/schema";
import { PLAN_LABEL, PLAN_QUOTAS, type PlanKey } from "@shared/planFeatures";
import { renderBrandedEmail } from "./emailTemplates";
import { sendEmail } from "./email";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const WARN_THRESHOLD = 0.9;

/** Public so unit tests can hit it directly without spinning up Express. */
export async function runQuotaWatch(): Promise<{
  scanned: number;
  warned: number;
  skipped: number;
  errors: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("DB not configured");
  const allWorkspaces = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      plan: workspaces.plan,
      isActive: workspaces.isActive,
      subscriptionStatus: workspaces.subscriptionStatus,
      quotaWarningSentAt: workspaces.quotaWarningSentAt,
    })
    .from(workspaces);

  let scanned = 0;
  let warned = 0;
  let skipped = 0;
  let errors = 0;
  const now = Date.now();

  for (const ws of allWorkspaces) {
    scanned++;
    if (!ws.isActive) {
      skipped++;
      continue;
    }
    if (ws.subscriptionStatus !== "active" && ws.subscriptionStatus !== "past_due") {
      skipped++;
      continue;
    }

    // Treat the legacy "trial" enum value as basic for quota purposes.
    const planKey: PlanKey = ws.plan === "trial" ? "basic" : (ws.plan as PlanKey);
    const quota = PLAN_QUOTAS[planKey];
    if (!quota) {
      skipped++;
      continue;
    }
    if (quota.maxClients === -1) {
      skipped++;
      continue;
    }

    // Skip workspaces warned in the last 7 days
    if (
      ws.quotaWarningSentAt &&
      now - new Date(ws.quotaWarningSentAt).getTime() < SEVEN_DAYS_MS
    ) {
      skipped++;
      continue;
    }

    const clientRows = await db!
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.workspaceId, ws.id));
    const totalClients = clientRows.length;
    const usage = totalClients / quota.maxClients;

    if (usage < WARN_THRESHOLD) {
      skipped++;
      continue;
    }

    // Find the workspace owner email (first admin user)
    const owners = await db!
      .select({ email: users.email, fullName: users.name })
      .from(users)
      .where(eq(users.workspaceId, ws.id))
      .limit(1);
    const owner = owners[0];
    if (!owner?.email) {
      skipped++;
      continue;
    }

    try {
      const pct = Math.round(usage * 100);
      const subject = `התראת מכסה — ${pct}% מתוכנית ${PLAN_LABEL[planKey]}`;
      const rendered = renderBrandedEmail({
        subject,
        eyebrow: "התראה · SPARK Quality",
        headline: `התקרבת למכסת לקוחות בתוכנית ${PLAN_LABEL[planKey]}`,
        greeting: `שלום ${owner.fullName ?? ""},`,
        body: [
          `נכון להיום, ב-workspace "${ws.name}" יש ${totalClients.toLocaleString("he-IL")} לקוחות מתוך ${quota.maxClients.toLocaleString("he-IL")} שמותרים בתוכנית ${PLAN_LABEL[planKey]} (${pct}%).`,
          {
            type: "highlight",
            label: "שימוש נוכחי",
            value: `${pct}% · ${totalClients.toLocaleString("he-IL")} / ${quota.maxClients.toLocaleString("he-IL")}`,
            tone: "warn",
          },
          `כאשר תגיעי ל-100%, הוספת הלקוח הבא תיחסם אוטומטית עד שתעברי לתוכנית גבוהה יותר.`,
          `כדי למנוע הפרעה, מומלץ לשדרג עכשיו. השדרוג מיידי, ללא תחילה מחדש של תקופת החיוב.`,
        ],
        cta: {
          label: "מעבר לעמוד התוכניות",
          url: "https://spark-quality.com/pricing",
          variant: "primary",
        },
      });
      await sendEmail({
        to: owner.email,
        subject,
        html: rendered.html,
        text: rendered.text,
      });
      await db!
        .update(workspaces)
        .set({ quotaWarningSentAt: new Date() })
        .where(eq(workspaces.id, ws.id));
      warned++;
    } catch (err) {
      console.error(
        `[quotaWatch] failed to email workspace ${ws.id}:`,
        err,
      );
      errors++;
    }
  }

  return { scanned, warned, skipped, errors };
}

export async function quotaWatchHandler(req: Request, res: Response) {
  try {
    // We don't need sdk.authenticateRequest here because the platform gateway
    // already restricts /api/scheduled/* to cron callers. Idempotency lives in
    // runQuotaWatch via the 7-day skip rule.
    const result = await runQuotaWatch();
    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error("[quotaWatch] handler error:", err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
