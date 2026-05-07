// Regression tests: workspace-level admin must NOT bypass billing.
// Only SPARK super-admin (isSuperAdmin === true) may skip the payment gate.

import { describe, expect, it, vi } from "vitest";

// Mock the db module so we can fake workspace state per-test.
let __mockDb: any = null;
vi.mock("./db", () => ({
  getDb: vi.fn(async () => __mockDb),
}));

// Stub email/notification to keep tests offline.
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(async () => true),
}));
vi.mock("./email", () => ({
  sendEmail: vi.fn(async () => ({ ok: true, id: "test-id" })),
  sendPastDueReminderEmail: vi.fn(async () => ({ ok: true, id: "test-id" })),
  sendSuspensionEmail: vi.fn(async () => ({ ok: true, id: "test-id" })),
  sendActivationEmail: vi.fn(async () => ({ ok: true, id: "test-id" })),
}));

import { billingRouter } from "./billing";

function setMockDb(workspaceRow: Record<string, unknown> | null) {
  // Drizzle-like chain: db.select(...).from(...).where(...).limit(1)
  const chain: any = {
    select: () => chain,
    from: () => chain,
    where: () => chain,
    limit: () => Promise.resolve(workspaceRow ? [workspaceRow] : []),
  };
  __mockDb = chain;
}

function ctxFor(opts: {
  isSuperAdmin: boolean;
  role?: "admin" | "user";
  workspaceId?: number | null;
}) {
  return {
    user: {
      id: 7,
      openId: "user-open",
      name: "Anat",
      email: "anat@example.com",
      role: opts.role ?? "admin",
      workspaceId: opts.workspaceId ?? 60002,
      workspaceRole: "owner",
      isSuperAdmin: opts.isSuperAdmin,
    } as any,
    req: {} as any,
    res: {} as any,
  };
}

describe("billing.myAccessStatus — billing-bypass safety", () => {
  it("workspace-admin (NOT super-admin) on a pending_payment workspace is BLOCKED", async () => {
    setMockDb({
      subscriptionStatus: "pending_payment",
      pastDueSince: null,
      plan: "basic",
      billingPeriod: "yearly",
      paymentMethod: "manual",
      lastPaymentAt: null,
    });
    const caller = billingRouter.createCaller(ctxFor({ isSuperAdmin: false, role: "admin" }));
    const res = await caller.myAccessStatus();
    expect(res.status).toBe("blocked");
    expect(res.hasNeverPaid).toBe(true);
  });

  it("workspace-admin on a suspended workspace is BLOCKED", async () => {
    setMockDb({
      subscriptionStatus: "suspended",
      pastDueSince: new Date(Date.now() - 10 * 24 * 3600 * 1000),
      plan: "pro",
      billingPeriod: "yearly",
      paymentMethod: "standing_order",
      lastPaymentAt: new Date(Date.now() - 60 * 24 * 3600 * 1000),
    });
    const caller = billingRouter.createCaller(ctxFor({ isSuperAdmin: false, role: "admin" }));
    const res = await caller.myAccessStatus();
    expect(res.status).toBe("blocked");
  });

  it("SPARK super-admin always returns active, even when ws is pending_payment", async () => {
    // db should never be called for super-admin path; if it is, return blocked
    // to make sure the bypass is what's letting them in (not the workspace state).
    setMockDb({
      subscriptionStatus: "pending_payment",
      pastDueSince: null,
      plan: "basic",
      billingPeriod: "yearly",
      paymentMethod: "manual",
      lastPaymentAt: null,
    });
    const caller = billingRouter.createCaller(ctxFor({ isSuperAdmin: true, role: "admin" }));
    const res = await caller.myAccessStatus();
    expect(res.status).toBe("active");
  });

  it("non-admin agent on pending_payment workspace is BLOCKED", async () => {
    setMockDb({
      subscriptionStatus: "pending_payment",
      pastDueSince: null,
      plan: "basic",
      billingPeriod: "yearly",
      paymentMethod: "manual",
      lastPaymentAt: null,
    });
    const caller = billingRouter.createCaller(ctxFor({ isSuperAdmin: false, role: "user" }));
    const res = await caller.myAccessStatus();
    expect(res.status).toBe("blocked");
  });

  it("active workspace returns active for any role", async () => {
    setMockDb({
      subscriptionStatus: "active",
      pastDueSince: null,
      plan: "pro",
      billingPeriod: "yearly",
      paymentMethod: "standing_order",
      lastPaymentAt: new Date(),
    });
    const caller = billingRouter.createCaller(ctxFor({ isSuperAdmin: false, role: "user" }));
    const res = await caller.myAccessStatus();
    expect(res.status).toBe("active");
  });
});

describe("billing super-admin-only mutations", () => {
  it("workspace admin (not super-admin) cannot call markPastDue", async () => {
    const caller = billingRouter.createCaller(ctxFor({ isSuperAdmin: false, role: "admin" }));
    await expect(caller.markPastDue({ workspaceId: 1 })).rejects.toThrow(/FORBIDDEN/);
  });

  it("workspace admin cannot call enforceSuspensions", async () => {
    const caller = billingRouter.createCaller(ctxFor({ isSuperAdmin: false, role: "admin" }));
    await expect(caller.enforceSuspensions()).rejects.toThrow(/FORBIDDEN/);
  });

  it("workspace admin cannot call restoreAccess", async () => {
    const caller = billingRouter.createCaller(ctxFor({ isSuperAdmin: false, role: "admin" }));
    await expect(caller.restoreAccess({ workspaceId: 1 })).rejects.toThrow(/FORBIDDEN/);
  });
});
