/**
 * Round 128 — One-shot backfill for the new clientFlags table.
 *
 * Iterates over every workspace in the database and runs
 * `computeWorkspaceFlags` so that existing uploads get the correct
 * multi-flag rows immediately, without forcing the agency to re-upload.
 *
 * Usage:  pnpm tsx server/scripts/backfillClientFlags.ts
 */
import { drizzle } from "drizzle-orm/mysql2";
import { workspaces } from "../../drizzle/schema";
import { computeWorkspaceFlags } from "../db";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("[backfill] DATABASE_URL is not set. Aborting.");
    process.exit(1);
  }
  const db = drizzle(process.env.DATABASE_URL);
  const rows = await db
    .select({ id: workspaces.id, name: workspaces.name })
    .from(workspaces);
  console.log(`[backfill] Found ${rows.length} workspaces.`);

  let totalFlags = 0;
  for (const ws of rows) {
    const result = await computeWorkspaceFlags({ workspaceId: ws.id });
    totalFlags += result.totalFlagsWritten;
    console.log(
      `[backfill] ws=${ws.id} (${ws.name ?? "?"}): ${result.totalFlagsWritten} flags across ${result.distinctClients} clients`,
    );
  }

  console.log(`[backfill] DONE — total flags written: ${totalFlags}`);
  process.exit(0);
}

main().catch(err => {
  console.error("[backfill] FATAL", err);
  process.exit(1);
});
