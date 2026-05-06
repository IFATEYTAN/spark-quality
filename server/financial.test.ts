// Verifies financial procedures: VIP threshold update and metrics aggregation.
// These run without a real DB; they validate that the procedures are properly
// guarded by role middleware and that the public surface area exists.
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeCtx(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    workspaceId: null,
    workspaceRole: null,
    ...overrides,
  } as AuthenticatedUser;

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => undefined,
    } as unknown as TrpcContext["res"],
  };
}

describe("financial procedures", () => {
  it("rejects updateVipThreshold when called by an agent (non-admin)", async () => {
    const ctx = makeCtx({ workspaceId: 1, workspaceRole: "agent" });
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.workspaces.updateVipThreshold({ vipThreshold: 1500000 })
    ).rejects.toThrow(/admin|forbidden/i);
  });

  it("rejects updateVipThreshold with negative threshold", async () => {
    const ctx = makeCtx({ workspaceId: 1, workspaceRole: "owner" });
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.workspaces.updateVipThreshold({ vipThreshold: -100 })
    ).rejects.toThrow();
  });

  it("rejects metrics query when user has no workspace", async () => {
    const ctx = makeCtx({ workspaceId: null, workspaceRole: null });
    const caller = appRouter.createCaller(ctx);

    await expect(caller.workspaces.metrics()).rejects.toThrow(
      /workspace|onboarding/i
    );
  });

  it("metrics returns empty zeros for a new workspace owner (no DB rows)", async () => {
    const ctx = makeCtx({ workspaceId: 999, workspaceRole: "owner" });
    const caller = appRouter.createCaller(ctx);

    const metrics = await caller.workspaces.metrics();
    expect(metrics).toMatchObject({
      totalClients: expect.any(Number),
      vipClients: expect.any(Number),
      liquidFunds: expect.any(Number),
      tikun190Candidates: expect.any(Number),
      totalAum: expect.any(Number),
    });
    // For a non-existent workspace, all counters should be zero.
    expect(metrics.vipClients).toBe(0);
    expect(metrics.totalClients).toBe(0);
  });
});
