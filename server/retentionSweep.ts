// server/retentionSweep.ts
// ----------------------------------------------------------------------------
// Daily data-retention sweep. Triggered by a project-level Heartbeat cron at
//   /api/scheduled/retentionSweep
//
// For every workspace that has opted into a retention policy
// (workspaces.retentionMonths > 0 — OFF by default), we measure each client's
// age from `createdAt` and:
//
//   • WARN  — a client whose deletion date (createdAt + retentionMonths) falls
//             within the next 14 days, and which hasn't been warned yet, is
//             collected; the owner gets ONE email listing them, and each is
//             stamped `retentionWarnedAt` so we never re-email the same client.
//   • DELETE — a client past its retention window (createdAt <= now - months)
//             is permanently removed via deleteClientCascade (policies, flags,
//             activities, reminders, message history), with an audit entry.
//
// Idempotent: re-running the same day re-warns nobody (retentionWarnedAt guard)
// and re-deletes nobody (the rows are already gone).
//
// Cron to register (UTC, daily 03:00):  0 0 3 * * *
// ----------------------------------------------------------------------------

import type { Request, Response } from "express";
import { and, eq, gt, inArray, isNull, lte } from "drizzle-orm";
import { getDb, deleteClientCascade, writeAudit } from "./db";
import { workspaces, clients, users } from "../drizzle/schema";
import { renderBrandedEmail } from "./emailTemplates";
import { sendEmail } from "./email";

const WARN_WINDOW_DAYS = 14;

function subMonths(d: Date, months: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() - months);
  return x;
}
function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/** Public so unit/integration tests can hit it directly without Express. */
export async function runRetentionSweep(): Promise<{
  scanned: number;
  warned: number;
  deleted: number;
  errors: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("DB not configured");

  const allWorkspaces = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      retentionMonths: workspaces.retentionMonths,
    })
    .from(workspaces);

  let scanned = 0;
  let warned = 0;
  let deleted = 0;
  let errors = 0;
  const now = new Date();

  for (const ws of allWorkspaces) {
    scanned++;
    const months = ws.retentionMonths ?? 0;
    if (!months || months <= 0) continue; // policy OFF for this workspace

    // A client is deleted once createdAt <= deleteCutoff; warned once its
    // deletion date is within WARN_WINDOW_DAYS (i.e. createdAt in the band
    // between deleteCutoff and warnCutoff).
    const deleteCutoff = subMonths(now, months);
    const warnCutoff = addDays(deleteCutoff, WARN_WINDOW_DAYS);

    try {
      // ---- 1) WARN: clients entering the 14-day window, not yet warned ----
      const toWarn = await db
        .select({ id: clients.id, fullName: clients.fullName, idNumber: clients.idNumber, createdAt: clients.createdAt })
        .from(clients)
        .where(
          and(
            eq(clients.workspaceId, ws.id),
            gt(clients.createdAt, deleteCutoff),
            lte(clients.createdAt, warnCutoff),
            isNull(clients.retentionWarnedAt),
          ),
        );

      if (toWarn.length > 0) {
        const owners = await db
          .select({ email: users.email, fullName: users.name })
          .from(users)
          .where(and(eq(users.workspaceId, ws.id), eq(users.workspaceRole, "owner")))
          .limit(1);
        const owner = owners[0];
        if (owner?.email) {
          const list = toWarn
            .slice(0, 50)
            .map((c) => `• ${c.fullName ?? `לקוח ${c.idNumber}`}`)
            .join("\n");
          const more = toWarn.length > 50 ? `\n…ועוד ${toWarn.length - 50} לקוחות.` : "";
          const subject = `מדיניות שמירה — ${toWarn.length} לקוחות יימחקו בעוד ${WARN_WINDOW_DAYS} יום`;
          const rendered = renderBrandedEmail({
            subject,
            eyebrow: "מדיניות שמירת מידע · SPARK Quality",
            headline: `${toWarn.length} לקוחות עומדים להימחק אוטומטית`,
            greeting: `שלום ${owner.fullName ?? ""},`,
            body: [
              `במסגרת מדיניות שמירת המידע שהגדרת לסוכנות "${ws.name}" (${months} חודשים), הלקוחות הבאים יימחקו לצמיתות בעוד ${WARN_WINDOW_DAYS} יום, יחד עם כל הנתונים המשויכים:`,
              list + more,
              `אם ברצונך לשמור לקוח כלשהו — היכנסי למערכת ועדכני אותו (כל מגע מאפס את השעון), או כבי את מדיניות השמירה במסך הצוות.`,
            ],
            cta: { label: "מעבר למערכת", url: "https://spark-quality.com/clients", variant: "primary" },
          });
          await sendEmail({ to: owner.email, subject, html: rendered.html, text: rendered.text });
        }
        // Stamp regardless of email success so we don't spam daily; email is best-effort.
        await db
          .update(clients)
          .set({ retentionWarnedAt: now })
          .where(
            and(
              eq(clients.workspaceId, ws.id),
              inArray(
                clients.id,
                toWarn.map((c) => c.id),
              ),
            ),
          );
        warned += toWarn.length;
      }

      // ---- 2) DELETE: clients past the retention window ----
      const toDelete = await db
        .select({ id: clients.id })
        .from(clients)
        .where(and(eq(clients.workspaceId, ws.id), lte(clients.createdAt, deleteCutoff)));

      for (const c of toDelete) {
        const ok = await deleteClientCascade({
          clientId: c.id,
          workspaceId: ws.id,
          userId: 0, // unused for owner role (workspace-scoped only)
          workspaceRole: "owner",
        });
        if (ok) deleted++;
      }

      if (toDelete.length > 0) {
        await writeAudit({
          actorUserId: null,
          workspaceId: ws.id,
          action: "retention.autoDelete",
          entityType: "workspace",
          entityId: ws.id,
          detail: `מחיקה אוטומטית של ${toDelete.length} לקוחות לפי מדיניות שמירה (${months} חודשים)`,
        });
      }
    } catch (err) {
      console.error(`[retentionSweep] workspace ${ws.id} failed:`, err);
      errors++;
    }
  }

  return { scanned, warned, deleted, errors };
}

export async function retentionSweepHandler(req: Request, res: Response) {
  try {
    // The platform gateway restricts /api/scheduled/* to cron callers.
    const result = await runRetentionSweep();
    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error("[retentionSweep] handler error:", err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
      context: { url: req.url },
    });
  }
}
