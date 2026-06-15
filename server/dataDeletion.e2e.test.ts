/**
 * REAL end-to-end integration test of the data-deletion (right-to-erasure)
 * helpers. Seeds a workspace with a client plus a row in EVERY table that
 * references the client (policies, flags, trigger-handled, activities,
 * reminders, message-generation history), then proves:
 *
 *   1. `deleteClientCascade` removes the client AND all six child rows, and is
 *      workspace/role-scoped (an agent cannot delete another agent's client).
 *   2. `purgeWorkspaceData` wipes every client + the report records for a
 *      workspace, leaving the workspace/user intact.
 *
 * Hits a real MySQL, so it SKIPS when DATABASE_URL is not configured (sandbox)
 * and RUNS in CI / the Manus environment.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";
import * as db from "./db";
import {
  workspaces,
  users,
  clients,
  policies,
  clientFlags,
  triggerHandled,
  clientActivities,
  clientReminders,
  messageGenerations,
  reports,
} from "../drizzle/schema";

const SUFFIX = `del${Date.now().toString(36)}`;
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

let drz: Awaited<ReturnType<typeof db.getDb>> = null;
let WS = 0;
let OWNER = 0;
let AGENT_A = 0;
let AGENT_B = 0;

/** Seed a client owned by `ownerUserId` plus one row in every child table. */
async function seedClientWithChildren(ownerUserId: number, key: string): Promise<number> {
  const cid = readId(
    await drz!.insert(clients).values({
      workspaceId: WS,
      ownerUserId,
      idNumber: `${key}-${SUFFIX}`,
      fullName: key,
      email: "c@test.local",
      flagStatus: "regular",
      totalBalance: "0",
    }),
  );
  await drz!.insert(policies).values({
    workspaceId: WS,
    clientId: cid,
    productType: "קרן פנסיה חדשה מקיפה",
    company: "מגדל",
    policyNumber: "",
    monthlyPremium: "100",
    annualPremium: "0",
    balance: "0",
    startDate: null,
    endDate: null,
    status: "active",
    metadata: { poaHolder: "x" },
  });
  await drz!.insert(clientFlags).values({ workspaceId: WS, clientId: cid, triggerKey: "noEmail" });
  await drz!.insert(triggerHandled).values({
    workspaceId: WS,
    clientId: cid,
    triggerKey: "noEmail",
    handledByUserId: ownerUserId,
  });
  await drz!.insert(clientActivities).values({
    workspaceId: WS,
    clientId: cid,
    type: "note",
    content: "seed",
    createdBy: ownerUserId,
  });
  await drz!.insert(clientReminders).values({
    workspaceId: WS,
    clientId: cid,
    remindAt: new Date(),
    createdBy: ownerUserId,
  });
  await drz!.insert(messageGenerations).values({
    workspaceId: WS,
    clientId: cid,
    triggerKey: "noEmail",
    tone: "warm",
    variantsJson: ["a", "b", "c"],
    createdByUserId: ownerUserId,
  });
  return cid;
}

async function childCounts(cid: number) {
  const count = async (rows: Promise<unknown[]>) => (await rows).length;
  return {
    policies: await count(drz!.select().from(policies).where(eq(policies.clientId, cid))),
    flags: await count(drz!.select().from(clientFlags).where(eq(clientFlags.clientId, cid))),
    handled: await count(drz!.select().from(triggerHandled).where(eq(triggerHandled.clientId, cid))),
    activities: await count(drz!.select().from(clientActivities).where(eq(clientActivities.clientId, cid))),
    reminders: await count(drz!.select().from(clientReminders).where(eq(clientReminders.clientId, cid))),
    generations: await count(drz!.select().from(messageGenerations).where(eq(messageGenerations.clientId, cid))),
    client: await count(drz!.select().from(clients).where(eq(clients.id, cid))),
  };
}

describe.skipIf(SKIP)("data deletion · real DB integration", () => {
  beforeAll(async () => {
    drz = await db.getDb();
    if (!drz) throw new Error("Database not available");
    const taxId = String(Date.now()).slice(-9).padStart(9, "0");
    WS = readId(await drz.insert(workspaces).values({ name: `del-${SUFFIX}`, taxId, taxIdType: "company", plan: "basic" }));
    OWNER = readId(await drz.insert(users).values({ openId: `o-${SUFFIX}`, name: "owner", email: `o-${SUFFIX}@t.local`, workspaceId: WS, workspaceRole: "owner" }));
    AGENT_A = readId(await drz.insert(users).values({ openId: `a-${SUFFIX}`, name: "agentA", email: `a-${SUFFIX}@t.local`, workspaceId: WS, workspaceRole: "agent" }));
    AGENT_B = readId(await drz.insert(users).values({ openId: `b-${SUFFIX}`, name: "agentB", email: `b-${SUFFIX}@t.local`, workspaceId: WS, workspaceRole: "agent" }));
  }, 60_000);

  afterAll(async () => {
    if (!drz) return;
    // Best-effort cleanup in case an assertion failed mid-test.
    for (const t of [messageGenerations, clientReminders, clientActivities, triggerHandled, clientFlags, policies, clients, reports]) {
      await drz.delete(t).where(eq(t.workspaceId, WS));
    }
    await drz.delete(users).where(eq(users.workspaceId, WS));
    await drz.delete(workspaces).where(eq(workspaces.id, WS));
  }, 60_000);

  it("deleteClientCascade removes the client and ALL related rows", async () => {
    const cid = await seedClientWithChildren(AGENT_A, "cascade");
    // sanity: everything seeded
    const before = await childCounts(cid);
    expect(before).toEqual({ policies: 1, flags: 1, handled: 1, activities: 1, reminders: 1, generations: 1, client: 1 });

    const ok = await db.deleteClientCascade({ clientId: cid, workspaceId: WS, userId: OWNER, workspaceRole: "owner" });
    expect(ok).toBe(true);

    const after = await childCounts(cid);
    expect(after).toEqual({ policies: 0, flags: 0, handled: 0, activities: 0, reminders: 0, generations: 0, client: 0 });
  });

  it("an agent cannot delete another agent's client (role-scoped, no-op)", async () => {
    const cid = await seedClientWithChildren(AGENT_A, "owned-by-a");
    // AGENT_B tries to delete AGENT_A's client → denied, nothing removed.
    const ok = await db.deleteClientCascade({ clientId: cid, workspaceId: WS, userId: AGENT_B, workspaceRole: "agent" });
    expect(ok).toBe(false);
    const after = await childCounts(cid);
    expect(after.client).toBe(1);
    expect(after.policies).toBe(1);
    // cleanup
    await db.deleteClientCascade({ clientId: cid, workspaceId: WS, userId: OWNER, workspaceRole: "owner" });
  });

  it("purgeWorkspaceData wipes all clients + report records, keeps workspace/users", async () => {
    await seedClientWithChildren(AGENT_A, "purge-1");
    await seedClientWithChildren(AGENT_B, "purge-2");
    await drz!.insert(reports).values({
      workspaceId: WS,
      uploadedByUserId: OWNER,
      fileName: "f.xlsx",
      fileKey: "k",
      source: "manual",
      status: "done",
    });

    const removed = await db.purgeWorkspaceData(WS);
    expect(removed).toBe(2);

    const remainingClients = await drz!.select().from(clients).where(eq(clients.workspaceId, WS));
    const remainingReports = await drz!.select().from(reports).where(eq(reports.workspaceId, WS));
    const remainingPolicies = await drz!.select().from(policies).where(eq(policies.workspaceId, WS));
    expect(remainingClients.length).toBe(0);
    expect(remainingReports.length).toBe(0);
    expect(remainingPolicies.length).toBe(0);

    // Workspace + users survive the purge.
    const wsRows = await drz!.select().from(workspaces).where(eq(workspaces.id, WS));
    const userRows = await drz!.select().from(users).where(and(eq(users.workspaceId, WS)));
    expect(wsRows.length).toBe(1);
    expect(userRows.length).toBe(3);
  });
});
