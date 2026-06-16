/**
 * REAL end-to-end integration test of the data-retention sweep.
 *
 * Seeds a workspace with a 12-month retention policy and three clients at
 * different ages, runs the production `runRetentionSweep`, and asserts:
 *   • a client older than the window is DELETED,
 *   • a client whose deletion date is within 14 days is WARNED (stamped
 *     retentionWarnedAt) but kept,
 *   • a fresh client is untouched,
 *   • a workspace with the policy OFF is never swept.
 *
 * Hits a real MySQL, so it SKIPS without DATABASE_URL (sandbox) and RUNS in
 * CI / the Manus environment.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import * as db from "./db";
import { runRetentionSweep } from "./retentionSweep";
import { workspaces, users, clients, policies, clientFlags, triggerHandled, clientActivities, clientReminders, messageGenerations } from "../drizzle/schema";

const SUFFIX = `ret${Date.now().toString(36)}`;
const SKIP =
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.startsWith("mock://") ||
  process.env.SKIP_DB_TESTS === "1";

function readId(raw: unknown): number {
  const direct = (raw as { insertId?: number })?.insertId;
  if (typeof direct === "number" && direct > 0) return direct;
  const arr = Array.isArray(raw) ? (raw as Array<{ insertId?: number }>)[0]?.insertId : undefined;
  if (typeof arr === "number" && arr > 0) return arr;
  throw new Error(`Failed to read insertId: ${JSON.stringify(raw)}`);
}

const now = new Date();
function subMonths(d: Date, m: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() - m);
  return x;
}
function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

let drz: Awaited<ReturnType<typeof db.getDb>> = null;
let WS = 0; // retention = 12 months
let WS_OFF = 0; // retention = null
let OWNER = 0;
const ID: Record<string, number> = {};

async function seedClient(workspaceId: number, key: string, createdAt: Date): Promise<number> {
  const cid = readId(
    await drz!.insert(clients).values({
      workspaceId,
      ownerUserId: OWNER,
      idNumber: `${key}-${SUFFIX}`,
      fullName: key,
      flagStatus: "regular",
      totalBalance: "0",
      createdAt,
    }),
  );
  return cid;
}

describe.skipIf(SKIP)("retention sweep · real DB integration", () => {
  beforeAll(async () => {
    drz = await db.getDb();
    if (!drz) throw new Error("Database not available");
    const tax = String(Date.now()).slice(-9).padStart(9, "0");
    WS = readId(await drz.insert(workspaces).values({ name: `ret-${SUFFIX}`, taxId: tax, taxIdType: "company", plan: "basic", retentionMonths: 12 }));
    WS_OFF = readId(await drz.insert(workspaces).values({ name: `off-${SUFFIX}`, taxId: `1${tax}`.slice(-9), taxIdType: "company", plan: "basic" }));
    OWNER = readId(await drz.insert(users).values({ openId: `o-${SUFFIX}`, name: "owner", email: `o-${SUFFIX}@t.local`, workspaceId: WS, workspaceRole: "owner" }));

    // WS (12-month policy):
    ID.old = await seedClient(WS, "old", subMonths(now, 13)); // past window → DELETE
    ID.warn = await seedClient(WS, "warn", addDays(subMonths(now, 12), 7)); // within 14d → WARN
    ID.fresh = await seedClient(WS, "fresh", subMonths(now, 1)); // young → untouched
    // WS_OFF (no policy): an ancient client must survive.
    ID.offold = await seedClient(WS_OFF, "offold", subMonths(now, 60));

    await runRetentionSweep();
  }, 60_000);

  afterAll(async () => {
    if (!drz) return;
    for (const ws of [WS, WS_OFF]) {
      for (const t of [messageGenerations, clientReminders, clientActivities, triggerHandled, clientFlags, policies, clients]) {
        await drz.delete(t).where(eq(t.workspaceId, ws));
      }
    }
    await drz.delete(users).where(eq(users.id, OWNER));
    await drz.delete(workspaces).where(eq(workspaces.id, WS));
    await drz.delete(workspaces).where(eq(workspaces.id, WS_OFF));
  }, 60_000);

  async function getClient(id: number) {
    const rows = await drz!.select().from(clients).where(eq(clients.id, id));
    return rows[0];
  }

  it("deletes a client past the retention window", async () => {
    expect(await getClient(ID.old)).toBeUndefined();
  });

  it("warns (stamps retentionWarnedAt) a client within 14 days of deletion, but keeps it", async () => {
    const c = await getClient(ID.warn);
    expect(c).toBeDefined();
    expect(c!.retentionWarnedAt).toBeTruthy();
  });

  it("leaves a fresh client untouched and unwarned", async () => {
    const c = await getClient(ID.fresh);
    expect(c).toBeDefined();
    expect(c!.retentionWarnedAt).toBeNull();
  });

  it("never sweeps a workspace with the policy OFF", async () => {
    const c = await getClient(ID.offold);
    expect(c).toBeDefined();
  });
});
