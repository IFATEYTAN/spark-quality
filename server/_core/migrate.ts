// Auto-apply Drizzle migrations at server startup.
//
// Why: Manus rebuilds the app on each merge to main, but applying schema
// changes (drizzle/*.sql) is otherwise a manual step. Running migrations as
// part of startup turns each deploy into a self-contained "ship + migrate"
// unit and removes the chance of code shipping ahead of a missing table.
//
// Behavior:
// - Idempotent. Drizzle keeps a `__drizzle_migrations` table and only runs
//   SQL files that haven't been applied yet, so a server restart with no
//   new migrations is a no-op (a few ms).
// - Crashes the boot if a migration fails — better than silently serving
//   traffic against a mismatched schema.
// - Skips silently when DATABASE_URL is unset (matches the lazy-DB pattern
//   used everywhere else, so local tooling / tests still work).
// - Disable in environments that manage migrations out-of-band by setting
//   AUTO_MIGRATE_ON_START=false.

import path from "node:path";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

export async function applyMigrationsIfConfigured(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("[migrate] DATABASE_URL not set — skipping migrations");
    return;
  }
  if (process.env.AUTO_MIGRATE_ON_START === "false") {
    console.log("[migrate] AUTO_MIGRATE_ON_START=false — skipping migrations");
    return;
  }

  const migrationsFolder = path.resolve(process.cwd(), "drizzle");
  console.log(`[migrate] Applying pending migrations from ${migrationsFolder}`);

  // Dedicated short-lived connection — never share with the app's pool.
  const connection = await mysql.createConnection(url);
  try {
    const db = drizzle(connection);
    const t0 = Date.now();
    await migrate(db, { migrationsFolder });
    console.log(`[migrate] Done in ${Date.now() - t0}ms`);
  } finally {
    await connection.end();
  }
}
