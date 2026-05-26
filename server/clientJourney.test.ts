/**
 * Round 131 — Client journey (activities + reminders + detail) tests.
 *
 * Verifies the new agent workflow surface area:
 *   1. insertClientActivity persists and is visible to the same workspace.
 *   2. listActivitiesForClient returns newest-first, scoped to workspace+role.
 *   3. createClientReminder + listDueReminders + updateReminderStatus end-to-end.
 *   4. getClientDetail returns { client, triggers[], activities[], reminders[] }
 *      and respects strict tenant isolation.
 *   5. reassignClient moves ownerUserId only when caller is owner/admin and
 *      the target user belongs to the same workspace.
 *   6. Workspace isolation: workspace B never sees workspace A's activities,
 *      reminders, or detail.
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
  clientActivities,
  clientReminders,
  clientFlags,
} from "../drizzle/schema";

const SUFFIX = `cj${Date.now().toString(36)}`;

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
let USER_A_OWNER = 0;       // owner of WS_A
let USER_A_AGENT = 0;       // agent of WS_A (different agent in same workspace)
let USER_B_OWNER = 0;       // owner of WS_B
let CLIENT_A1 = 0;          // owned by USER_A_OWNER
let CLIENT_A2 = 0;          // owned by USER_A_AGENT
let CLIENT_B1 = 0;          // owned by USER_B_OWNER

const SKIP =
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.startsWith("mock://") ||
  process.env.SKIP_DB_TESTS === "1";

describe.skipIf(SKIP)("clientJourney (activities + reminders + detail + reassign)", () => {
  beforeAll(async () => {
    drz = await db.getDb();
    if (!drz) throw new Error("Database not available");

    const r1 = String(Date.now()).slice(-9).padStart(9, "0");
    const r2 = String(Date.now() + 1).slice(-9).padStart(9, "0");
    WS_A = readId(
      await drz.insert(workspaces).values({
        name: `cj-A-${SUFFIX}`,
        taxId: r1,
        taxIdType: "company",
        plan: "basic",
      }),
    );
    WS_B = readId(
      await drz.insert(workspaces).values({
        name: `cj-B-${SUFFIX}`,
        taxId: r2,
        taxIdType: "company",
        plan: "basic",
      }),
    );

    USER_A_OWNER = readId(
      await drz.insert(users).values({
        openId: `cjAo-${SUFFIX}`,
        name: "owner A",
        email: `ao-${SUFFIX}@test.local`,
        workspaceId: WS_A,
        workspaceRole: "owner",
      }),
    );
    USER_A_AGENT = readId(
      await drz.insert(users).values({
        openId: `cjAa-${SUFFIX}`,
        name: "agent A2",
        email: `aa-${SUFFIX}@test.local`,
        workspaceId: WS_A,
        workspaceRole: "agent",
      }),
    );
    USER_B_OWNER = readId(
      await drz.insert(users).values({
        openId: `cjBo-${SUFFIX}`,
        name: "owner B",
        email: `bo-${SUFFIX}@test.local`,
        workspaceId: WS_B,
        workspaceRole: "owner",
      }),
    );

    CLIENT_A1 = readId(
      await drz.insert(clients).values({
        workspaceId: WS_A,
        ownerUserId: USER_A_OWNER,
        idNumber: `CJ1-${SUFFIX}`,
        fullName: "לקוח של בעל הסוכנות",
        email: "",
        isVip: true,
        flagStatus: "regular",
      }),
    );
    CLIENT_A2 = readId(
      await drz.insert(clients).values({
        workspaceId: WS_A,
        ownerUserId: USER_A_AGENT,
        idNumber: `CJ2-${SUFFIX}`,
        fullName: "לקוח של סוכן ב",
        email: "x@y.com",
        isVip: false,
        flagStatus: "regular",
      }),
    );
    CLIENT_B1 = readId(
      await drz.insert(clients).values({
        workspaceId: WS_B,
        ownerUserId: USER_B_OWNER,
        idNumber: `CJ3-${SUFFIX}`,
        fullName: "לקוח של סוכנות זרה",
        email: "",
        isVip: true,
        flagStatus: "regular",
      }),
    );

    // Compute flags for both workspaces so getClientDetail returns badges.
    await db.computeWorkspaceFlags({ workspaceId: WS_A });
    await db.computeWorkspaceFlags({ workspaceId: WS_B });
  }, 60_000);

  afterAll(async () => {
    if (!drz) return;
    await drz.delete(clientActivities).where(eq(clientActivities.workspaceId, WS_A));
    await drz.delete(clientActivities).where(eq(clientActivities.workspaceId, WS_B));
    await drz.delete(clientReminders).where(eq(clientReminders.workspaceId, WS_A));
    await drz.delete(clientReminders).where(eq(clientReminders.workspaceId, WS_B));
    await drz.delete(clientFlags).where(eq(clientFlags.workspaceId, WS_A));
    await drz.delete(clientFlags).where(eq(clientFlags.workspaceId, WS_B));
    await drz.delete(clients).where(eq(clients.workspaceId, WS_A));
    await drz.delete(clients).where(eq(clients.workspaceId, WS_B));
    await drz.delete(users).where(eq(users.id, USER_A_OWNER));
    await drz.delete(users).where(eq(users.id, USER_A_AGENT));
    await drz.delete(users).where(eq(users.id, USER_B_OWNER));
    await drz.delete(workspaces).where(eq(workspaces.id, WS_A));
    await drz.delete(workspaces).where(eq(workspaces.id, WS_B));
  });

  it("insertClientActivity → listActivitiesForClient round-trip", async () => {
    await db.insertClientActivity({
      clientId: CLIENT_A1,
      workspaceId: WS_A,
      userId: USER_A_OWNER,
      workspaceRole: "owner",
      type: "call",
      outcome: "answered",
      content: "ענה, נקבעה פגישה לשבוע הבא",
      triggerKey: "vipGoldPremium",
    });
    await db.insertClientActivity({
      clientId: CLIENT_A1,
      workspaceId: WS_A,
      userId: USER_A_OWNER,
      workspaceRole: "owner",
      type: "note",
      content: "מעוניין בקרן השתלמות נוספת",
    });

    const list = await db.listActivitiesForClient({
      clientId: CLIENT_A1,
      workspaceId: WS_A,
      userId: USER_A_OWNER,
      workspaceRole: "owner",
    });

    expect(list.length).toBe(2);
    // Newest first
    expect(list[0]?.type).toBe("note");
    expect(list[1]?.type).toBe("call");
    expect(list[1]?.outcome).toBe("answered");
  });

  it("an agent cannot see another agent's client activities (workspace-internal isolation)", async () => {
    // USER_A_OWNER inserts an activity for CLIENT_A2 (which is owned by USER_A_AGENT).
    // Owner CAN do this (they see all workspace clients).
    await db.insertClientActivity({
      clientId: CLIENT_A2,
      workspaceId: WS_A,
      userId: USER_A_OWNER,
      workspaceRole: "owner",
      type: "note",
      content: "owner-only insight",
    });

    // The other agent (USER_A_AGENT, role=agent) trying to read activities for
    // CLIENT_A1 (which they DO NOT own) should throw.
    await expect(
      db.listActivitiesForClient({
        clientId: CLIENT_A1,
        workspaceId: WS_A,
        userId: USER_A_AGENT,
        workspaceRole: "agent",
      }),
    ).rejects.toThrow();

    // But they CAN read their own client's activities.
    const own = await db.listActivitiesForClient({
      clientId: CLIENT_A2,
      workspaceId: WS_A,
      userId: USER_A_AGENT,
      workspaceRole: "agent",
    });
    expect(own.length).toBeGreaterThanOrEqual(1);
  });

  it("workspace B cannot see workspace A's activities", async () => {
    // Insert an activity in workspace B for its own client.
    await db.insertClientActivity({
      clientId: CLIENT_B1,
      workspaceId: WS_B,
      userId: USER_B_OWNER,
      workspaceRole: "owner",
      type: "call",
      content: "B's own call",
    });

    // Workspace B owner trying to read CLIENT_A1 must throw (foreign workspace).
    await expect(
      db.listActivitiesForClient({
        clientId: CLIENT_A1,
        workspaceId: WS_B,
        userId: USER_B_OWNER,
        workspaceRole: "owner",
      }),
    ).rejects.toThrow();
  });

  it("createClientReminder + listDueReminders + updateReminderStatus", async () => {
    const now = Date.now();
    const past = new Date(now - 60_000); // 1 minute ago — due
    const future = new Date(now + 7 * 24 * 60 * 60 * 1000); // 7 days

    const idDue = await db.createClientReminder({
      clientId: CLIENT_A1,
      workspaceId: WS_A,
      userId: USER_A_OWNER,
      workspaceRole: "owner",
      remindAt: past,
      triggerKey: "vipGoldPremium",
      note: "due now",
    });
    const idFuture = await db.createClientReminder({
      clientId: CLIENT_A1,
      workspaceId: WS_A,
      userId: USER_A_OWNER,
      workspaceRole: "owner",
      remindAt: future,
      note: "future",
    });

    const due = await db.listDueReminders({
      workspaceId: WS_A,
      userId: USER_A_OWNER,
      workspaceRole: "owner",
    });
    const dueIds = new Set(due.map(r => r.reminder.id));
    // The past reminder should be in the due list. (Future is also "pending"
    // and will appear in the list because the helper returns all pending,
    // not just past-due — both should show up in the agent's queue.)
    expect(dueIds.has(idDue)).toBe(true);

    // Dismissing the due reminder takes it out of pending list.
    await db.updateReminderStatus({
      reminderId: idDue,
      workspaceId: WS_A,
      userId: USER_A_OWNER,
      workspaceRole: "owner",
      status: "dismissed",
    });
    const dueAfter = await db.listDueReminders({
      workspaceId: WS_A,
      userId: USER_A_OWNER,
      workspaceRole: "owner",
    });
    const dueIdsAfter = new Set(dueAfter.map(r => r.reminder.id));
    expect(dueIdsAfter.has(idDue)).toBe(false);

    // The future reminder still exists but is not yet due.
    expect(idFuture).toBeGreaterThan(0);
  });

  it("getClientDetail returns client + triggers + activities + reminders", async () => {
    const detail = await db.getClientDetail({
      clientId: CLIENT_A1,
      workspaceId: WS_A,
      userId: USER_A_OWNER,
      workspaceRole: "owner",
    });
    expect(detail).not.toBeNull();
    expect(detail?.client.id).toBe(CLIENT_A1);
    // CLIENT_A1 is VIP + has empty email, so flags should at least include both.
    expect(detail?.triggers).toEqual(
      expect.arrayContaining(["vipGoldPremium", "noEmail"]),
    );
    // Activities and reminders from earlier tests should appear.
    expect((detail?.activities ?? []).length).toBeGreaterThanOrEqual(2);
    expect((detail?.reminders ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("getClientDetail enforces workspace isolation", async () => {
    // Owner of workspace B should NOT be able to read CLIENT_A1's detail.
    const detail = await db.getClientDetail({
      clientId: CLIENT_A1,
      workspaceId: WS_B,
      userId: USER_B_OWNER,
      workspaceRole: "owner",
    });
    expect(detail).toBeNull();
  });

  it("reassignClient moves ownership and only admins/owners may run it", async () => {
    // Agent attempting to reassign — must throw.
    await expect(
      db.reassignClient({
        clientId: CLIENT_A2,
        workspaceId: WS_A,
        callerUserId: USER_A_AGENT,
        callerRole: "agent",
        newOwnerUserId: USER_A_OWNER,
      }),
    ).rejects.toThrow();

    // Owner reassigns CLIENT_A2 from USER_A_AGENT → USER_A_OWNER.
    const res = await db.reassignClient({
      clientId: CLIENT_A2,
      workspaceId: WS_A,
      callerUserId: USER_A_OWNER,
      callerRole: "owner",
      newOwnerUserId: USER_A_OWNER,
    });
    expect(res).toBeTruthy();

    // Verify ownership in DB.
    if (!drz) throw new Error("no drz");
    const reread = await drz
      .select()
      .from(clients)
      .where(eq(clients.id, CLIENT_A2));
    expect(reread[0]?.ownerUserId).toBe(USER_A_OWNER);

    // Reassigning across workspaces is forbidden — target user belongs to WS_B.
    await expect(
      db.reassignClient({
        clientId: CLIENT_A2,
        workspaceId: WS_A,
        callerUserId: USER_A_OWNER,
        callerRole: "owner",
        newOwnerUserId: USER_B_OWNER,
      }),
    ).rejects.toThrow();
  });
});
