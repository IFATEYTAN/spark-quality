/**
 * Round 128 — Multi-flag clientFlags coverage.
 *
 * Verifies the data-quality fix that started with a real customer bug:
 * dashboard cards showed correct counts (e.g. "30 VIP", "1,460 ללא פנסיה",
 * "252 ללא מייל"), but clicking a card opened an empty modal because the
 * legacy single-`flagStatus` column could only carry one trigger per
 * client. The fix replaces that single column with a `client_flags`
 * join table — one row per (workspace, client, triggerKey) — populated
 * by `computeWorkspaceFlags` and read by `listClientsForTriggerV2`.
 *
 * These tests prove three invariants the agency now relies on:
 *   1. A client matching N triggers appears in EACH of the N lists.
 *   2. Per-trigger COUNT(*) === modal list length.
 *   3. Strict tenant isolation — workspace B never sees workspace A's
 *      flags or clients, even when both have a VIP / no-email match.
 *
 * Skips gracefully when no DATABASE_URL is configured.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import * as db from "./db";
import {
  workspaces,
  users,
  clients,
  clientFlags,
} from "../drizzle/schema";

const SUFFIX = `cf${Date.now().toString(36)}`;

function readId(raw: unknown): number {
  const direct = (raw as { insertId?: number })?.insertId;
  if (typeof direct === "number" && Number.isFinite(direct) && direct > 0) return direct;
  const fromArr = Array.isArray(raw) ? (raw as Array<{ insertId?: number }>)[0]?.insertId : undefined;
  if (typeof fromArr === "number" && Number.isFinite(fromArr) && fromArr > 0) return fromArr;
  throw new Error(`Failed to read insertId from result: ${JSON.stringify(raw)}`);
}

let drz: Awaited<ReturnType<typeof db.getDb>> = null;
let WS_A = 0;
let WS_B = 0;
let USER_A = 0;
let USER_B = 0;
let CLIENT_MULTI = 0;       // ws=A, isVip + noEmail   → 2 flags
let CLIENT_SINGLE = 0;       // ws=A, isVip only         → 1 flag
let CLIENT_FOREIGN = 0;      // ws=B, isVip              → must NOT leak

const SKIP =
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.startsWith("mock://") ||
  process.env.SKIP_DB_TESTS === "1";

describe.skipIf(SKIP)("clientFlags (multi-flag join)", () => {
  beforeAll(async () => {
    drz = await db.getDb();
    if (!drz) throw new Error("Database not available");

    // Generate unique 9-digit taxIds per run to avoid colliding with the
    // workspaces.uq_workspaces_taxid unique constraint when the test is
    // executed repeatedly.
    const r1 = String(Date.now()).slice(-9).padStart(9, "0");
    const r2 = String(Date.now() + 1).slice(-9).padStart(9, "0");
    WS_A = readId(
      await drz.insert(workspaces).values({
        name: `cf-A-${SUFFIX}`,
        taxId: r1,
        taxIdType: "company",
        plan: "basic",
      }),
    );
    WS_B = readId(
      await drz.insert(workspaces).values({
        name: `cf-B-${SUFFIX}`,
        taxId: r2,
        taxIdType: "company",
        plan: "basic",
      }),
    );

    USER_A = readId(
      await drz.insert(users).values({
        openId: `cfA-${SUFFIX}`,
        name: "agent A",
        email: `a-${SUFFIX}@test.local`,
        workspaceId: WS_A,
      }),
    );
    USER_B = readId(
      await drz.insert(users).values({
        openId: `cfB-${SUFFIX}`,
        name: "agent B",
        email: `b-${SUFFIX}@test.local`,
        workspaceId: WS_B,
      }),
    );

    CLIENT_MULTI = readId(
      await drz.insert(clients).values({
        workspaceId: WS_A,
        ownerUserId: USER_A,
        idNumber: `CFm-${SUFFIX}`,
        fullName: "ירדן רב-טריגר",
        email: "", // → noEmail
        isVip: true, // → vipGoldPremium
        flagStatus: "regular",
      }),
    );
    CLIENT_SINGLE = readId(
      await drz.insert(clients).values({
        workspaceId: WS_A,
        ownerUserId: USER_A,
        idNumber: `CFs-${SUFFIX}`,
        fullName: "אורי VIP בלבד",
        email: "uri@test.local",
        isVip: true,
        flagStatus: "regular",
      }),
    );
    CLIENT_FOREIGN = readId(
      await drz.insert(clients).values({
        workspaceId: WS_B,
        ownerUserId: USER_B,
        idNumber: `CFf-${SUFFIX}`,
        fullName: "זר זרזיר (סוכנות אחרת)",
        email: "", // also → noEmail
        isVip: true, // also → vipGoldPremium
        flagStatus: "regular",
      }),
    );

    // Compute flags for BOTH workspaces. Each invocation should only
    // affect its own workspace.
    await db.computeWorkspaceFlags({ workspaceId: WS_A });
    await db.computeWorkspaceFlags({ workspaceId: WS_B });
  });

  afterAll(async () => {
    if (!drz) return;
    await drz.delete(clientFlags).where(eq(clientFlags.workspaceId, WS_A));
    await drz.delete(clientFlags).where(eq(clientFlags.workspaceId, WS_B));
    await drz.delete(clients).where(eq(clients.workspaceId, WS_A));
    await drz.delete(clients).where(eq(clients.workspaceId, WS_B));
    await drz.delete(users).where(eq(users.id, USER_A));
    await drz.delete(users).where(eq(users.id, USER_B));
    await drz.delete(workspaces).where(eq(workspaces.id, WS_A));
    await drz.delete(workspaces).where(eq(workspaces.id, WS_B));
  });

  it("a client matching multiple triggers appears in EVERY relevant list", async () => {
    const vipList = await db.listClientsForTriggerV2({
      workspaceId: WS_A,
      triggerKey: "vipGoldPremium",
      userId: USER_A,
      workspaceRole: "owner",
    });
    const noEmailList = await db.listClientsForTriggerV2({
      workspaceId: WS_A,
      triggerKey: "noEmail",
      userId: USER_A,
      workspaceRole: "owner",
    });

    const vipIds = new Set(vipList.map(c => c.id));
    const noEmailIds = new Set(noEmailList.map(c => c.id));

    // The multi-trigger client must show up in BOTH lists
    expect(vipIds.has(CLIENT_MULTI)).toBe(true);
    expect(noEmailIds.has(CLIENT_MULTI)).toBe(true);

    // The single-trigger client appears only in VIP, not in noEmail
    expect(vipIds.has(CLIENT_SINGLE)).toBe(true);
    expect(noEmailIds.has(CLIENT_SINGLE)).toBe(false);
  });

  it("counts === list length per trigger (no phantom counts)", async () => {
    const counts = await db.countClientFlags({ workspaceId: WS_A });
    const vipList = await db.listClientsForTriggerV2({
      workspaceId: WS_A,
      triggerKey: "vipGoldPremium",
      userId: USER_A,
      workspaceRole: "owner",
    });
    const noEmailList = await db.listClientsForTriggerV2({
      workspaceId: WS_A,
      triggerKey: "noEmail",
      userId: USER_A,
      workspaceRole: "owner",
    });

    expect(counts.vipGoldPremium).toBe(vipList.length);
    expect(counts.noEmail).toBe(noEmailList.length);
    // Workspace A has exactly two VIPs (multi + single) and one noEmail
    expect(counts.vipGoldPremium).toBe(2);
    expect(counts.noEmail).toBe(1);
  });

  it("strict tenant isolation — workspace A never sees workspace B's flags", async () => {
    const vipListA = await db.listClientsForTriggerV2({
      workspaceId: WS_A,
      triggerKey: "vipGoldPremium",
      userId: USER_A,
      workspaceRole: "owner",
    });
    const idsA = new Set(vipListA.map(c => c.id));
    expect(idsA.has(CLIENT_FOREIGN)).toBe(false);

    // Counts for ws_A must not include workspace B's matching client
    const countsA = await db.countClientFlags({ workspaceId: WS_A });
    const countsB = await db.countClientFlags({ workspaceId: WS_B });

    // Workspace B has its own 1 VIP + 1 noEmail
    expect(countsB.vipGoldPremium).toBe(1);
    expect(countsB.noEmail).toBe(1);
    // And A's counts are unaffected
    expect(countsA.vipGoldPremium).toBe(2);
  });

  it("recomputing one workspace must not delete other workspaces' flags", async () => {
    // Snapshot ws_B counts before
    const before = await db.countClientFlags({ workspaceId: WS_B });
    // Recompute ws_A only
    await db.computeWorkspaceFlags({ workspaceId: WS_A });
    const after = await db.countClientFlags({ workspaceId: WS_B });
    expect(after).toEqual(before);
  });

  it("agent role only sees their own clients within the workspace", async () => {
    // CLIENT_MULTI and CLIENT_SINGLE both belong to USER_A in WS_A.
    // Create a third client in WS_A owned by a DIFFERENT user, then verify
    // that user A (agent) does not see it but admin does.
    if (!drz) throw new Error("Database not available");
    const otherUser = readId(
      await drz.insert(users).values({
        openId: `cfOther-${SUFFIX}`,
        name: "agent A2",
        email: `a2-${SUFFIX}@test.local`,
        workspaceId: WS_A,
      }),
    );
    const otherClient = readId(
      await drz.insert(clients).values({
        workspaceId: WS_A,
        ownerUserId: otherUser,
        idNumber: `CFx-${SUFFIX}`,
        fullName: "לקוח של סוכן אחר",
        isVip: true,
        flagStatus: "regular",
      }),
    );
    await db.computeWorkspaceFlags({ workspaceId: WS_A });

    const asAgent = await db.listClientsForTriggerV2({
      workspaceId: WS_A,
      triggerKey: "vipGoldPremium",
      userId: USER_A,
      workspaceRole: "agent",
    });
    const asAdmin = await db.listClientsForTriggerV2({
      workspaceId: WS_A,
      triggerKey: "vipGoldPremium",
      userId: USER_A,
      workspaceRole: "admin",
    });

    const agentIds = new Set(asAgent.map(c => c.id));
    const adminIds = new Set(asAdmin.map(c => c.id));
    expect(agentIds.has(otherClient)).toBe(false);
    expect(adminIds.has(otherClient)).toBe(true);

    // Cleanup
    await drz.delete(clientFlags).where(eq(clientFlags.clientId, otherClient));
    await drz.delete(clients).where(eq(clients.id, otherClient));
    await drz.delete(users).where(eq(users.id, otherUser));
  });
});
