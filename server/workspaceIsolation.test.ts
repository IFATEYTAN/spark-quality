/**
 * Round 96 — Workspace isolation proof tests.
 *
 * Proves that the public DB helpers used by every tRPC procedure never
 * leak data between workspaces. Two isolated workspaces (A + B) are
 * seeded directly via drizzle, then every public list/get helper is
 * called with workspace A's identity and asserted to never return any
 * row from workspace B.
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
  reports,
  triggerHandled,
  messageGenerations,
} from "../drizzle/schema";

const SUFFIX = `iso${Date.now().toString(36)}`;

/** mysql2/drizzle returns either { insertId } or [ResultSetHeader, undefined]. Read either shape. */
function readId(raw: unknown): number {
  const direct = (raw as { insertId?: number })?.insertId;
  if (typeof direct === "number" && Number.isFinite(direct) && direct > 0) return direct;
  const fromArr = Array.isArray(raw) ? (raw as Array<{ insertId?: number }>)[0]?.insertId : undefined;
  if (typeof fromArr === "number" && Number.isFinite(fromArr) && fromArr > 0) return fromArr;
  throw new Error(`Failed to read insertId from result: ${JSON.stringify(raw)}`);
}

let drz: Awaited<ReturnType<typeof db.getDb>> = null;
let WORKSPACE_A = 0;
let WORKSPACE_B = 0;
let USER_A = 0;
let USER_B = 0;
let CLIENT_A = 0;
let CLIENT_B = 0;
let REPORT_A = 0;
let REPORT_B = 0;

const SKIP =
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.startsWith("mock://") ||
  process.env.SKIP_DB_TESTS === "1";

describe.skipIf(SKIP)("workspace isolation (DB-level proof)", () => {
  beforeAll(async () => {
    drz = await db.getDb();
    if (!drz) throw new Error("Database not available");

    WORKSPACE_A = readId(await drz.insert(workspaces).values({
      name: `iso-A-${SUFFIX}`,
      taxId: "000000018",
      taxIdType: "company",
      plan: "basic",
      billingPeriod: "monthly",
    }));

    WORKSPACE_B = readId(await drz.insert(workspaces).values({
      name: `iso-B-${SUFFIX}`,
      taxId: "000000026",
      taxIdType: "company",
      plan: "basic",
      billingPeriod: "monthly",
    }));

    USER_A = readId(await drz.insert(users).values({
      openId: `iso-user-A-${SUFFIX}`,
      name: "Owner A",
      workspaceId: WORKSPACE_A,
      workspaceRole: "owner",
    }));

    USER_B = readId(await drz.insert(users).values({
      openId: `iso-user-B-${SUFFIX}`,
      name: "Owner B",
      workspaceId: WORKSPACE_B,
      workspaceRole: "owner",
    }));

    CLIENT_A = readId(await drz.insert(clients).values({
      workspaceId: WORKSPACE_A,
      ownerUserId: USER_A,
      idNumber: `iso-A-${SUFFIX}-1`,
      fullName: "Client A1",
      flagStatus: "high_fees",
      isVip: false,
      totalBalance: "500000",
    }));

    CLIENT_B = readId(await drz.insert(clients).values({
      workspaceId: WORKSPACE_B,
      ownerUserId: USER_B,
      idNumber: `iso-B-${SUFFIX}-1`,
      fullName: "Client B1",
      flagStatus: "liquid_fund",
      isVip: true,
      totalBalance: "800000",
    }));

    REPORT_A = readId(await drz.insert(reports).values({
      workspaceId: WORKSPACE_A,
      uploadedByUserId: USER_A,
      fileName: "report-A.xlsx",
      fileKey: `iso-A-${SUFFIX}/report.xlsx`,
      clientCount: 1,
      totalAum: "500000",
    }));

    REPORT_B = readId(await drz.insert(reports).values({
      workspaceId: WORKSPACE_B,
      uploadedByUserId: USER_B,
      fileName: "report-B.xlsx",
      fileKey: `iso-B-${SUFFIX}/report.xlsx`,
      clientCount: 1,
      totalAum: "800000",
    }));

    await drz.insert(triggerHandled).values({
      workspaceId: WORKSPACE_A,
      clientId: CLIENT_A,
      triggerKey: "high_fees",
      handledByUserId: USER_A,
    });

    await drz.insert(messageGenerations).values({
      workspaceId: WORKSPACE_A,
      clientId: CLIENT_A,
      triggerKey: "high_fees",
      tone: "warm",
      variantsJson: JSON.stringify([{ text: "iso-test variant A" }]),
      createdByUserId: USER_A,
    });
  }, 30_000);

  afterAll(async () => {
    if (!drz) return;
    try {
      await drz.delete(messageGenerations).where(eq(messageGenerations.workspaceId, WORKSPACE_A));
      await drz.delete(messageGenerations).where(eq(messageGenerations.workspaceId, WORKSPACE_B));
      await drz.delete(triggerHandled).where(eq(triggerHandled.workspaceId, WORKSPACE_A));
      await drz.delete(triggerHandled).where(eq(triggerHandled.workspaceId, WORKSPACE_B));
      await drz.delete(reports).where(eq(reports.workspaceId, WORKSPACE_A));
      await drz.delete(reports).where(eq(reports.workspaceId, WORKSPACE_B));
      await drz.delete(clients).where(eq(clients.workspaceId, WORKSPACE_A));
      await drz.delete(clients).where(eq(clients.workspaceId, WORKSPACE_B));
      await drz.delete(users).where(eq(users.id, USER_A));
      await drz.delete(users).where(eq(users.id, USER_B));
      await drz.delete(workspaces).where(eq(workspaces.id, WORKSPACE_A));
      await drz.delete(workspaces).where(eq(workspaces.id, WORKSPACE_B));
    } catch (err) {
      console.warn("[isolation cleanup]", err);
    }
  }, 30_000);

  it("listClients(A) returns only A's rows; listClients(B) returns only B's", async () => {
    const rowsA = await db.listClients({
      workspaceId: WORKSPACE_A,
      userId: USER_A,
      workspaceRole: "owner",
    });
    expect(rowsA.length).toBeGreaterThan(0);
    for (const r of rowsA) expect(r.workspaceId).toBe(WORKSPACE_A);
    expect(rowsA.find(r => r.id === CLIENT_B)).toBeUndefined();

    const rowsB = await db.listClients({
      workspaceId: WORKSPACE_B,
      userId: USER_B,
      workspaceRole: "owner",
    });
    for (const r of rowsB) expect(r.workspaceId).toBe(WORKSPACE_B);
    expect(rowsB.find(r => r.id === CLIENT_A)).toBeUndefined();
  });

  it("listReports never crosses workspace boundary", async () => {
    const reportsA = await db.listReports({
      workspaceId: WORKSPACE_A,
      userId: USER_A,
      workspaceRole: "owner",
    });
    for (const r of reportsA) expect(r.workspaceId).toBe(WORKSPACE_A);
    expect(reportsA.find(r => r.id === REPORT_B)).toBeUndefined();
  });

  it("getClientById from B asking for A's client returns undefined", async () => {
    const result = await db.getClientById({
      clientId: CLIENT_A,
      workspaceId: WORKSPACE_B,
      userId: USER_B,
      workspaceRole: "owner",
    });
    expect(result).toBeUndefined();
  });

  it("countHandledByTrigger(B) does not see A's handled marks", async () => {
    const countsB = await db.countHandledByTrigger({ workspaceId: WORKSPACE_B });
    expect(countsB["high_fees"] ?? 0).toBe(0);

    const countsA = await db.countHandledByTrigger({ workspaceId: WORKSPACE_A });
    expect(countsA["high_fees"] ?? 0).toBeGreaterThanOrEqual(1);
  });

  it("listClientsForTrigger(B) does not include A's clients", async () => {
    const rowsB = await db.listClientsForTrigger({
      workspaceId: WORKSPACE_B,
      triggerKey: "high_fees",
      userId: USER_B,
      workspaceRole: "owner",
    });
    for (const r of rowsB) expect(r.workspaceId).toBe(WORKSPACE_B);
    expect(rowsB.find(r => r.id === CLIENT_A)).toBeUndefined();
  });

  it("listMessageGenerationsForWorkspace never crosses tenant boundary", async () => {
    const genB = await db.listMessageGenerationsForWorkspace({
      workspaceId: WORKSPACE_B,
    });
    for (const g of genB) expect(g.workspaceId).toBe(WORKSPACE_B);
    // A's generation must NOT appear
    expect(genB.find(g => g.clientId === CLIENT_A)).toBeUndefined();
  });

  it("getWorkspaceMetrics totals match seeded reality per tenant", async () => {
    const metricsA = await db.getWorkspaceMetrics({
      workspaceId: WORKSPACE_A,
      userId: USER_A,
      workspaceRole: "owner",
    });
    expect(metricsA.totalClients).toBeGreaterThanOrEqual(1);
    expect(metricsA.vipClients).toBe(0); // A's seeded client is not VIP

    const metricsB = await db.getWorkspaceMetrics({
      workspaceId: WORKSPACE_B,
      userId: USER_B,
      workspaceRole: "owner",
    });
    expect(metricsB.totalClients).toBeGreaterThanOrEqual(1);
    expect(metricsB.vipClients).toBeGreaterThanOrEqual(1); // B's seeded client IS VIP
  });
});
