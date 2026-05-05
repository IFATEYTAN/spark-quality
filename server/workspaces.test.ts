// Verifies the multi-tenant guards on workspace procedures.
// Tests that:
// 1. Users without a workspace cannot access workspace-scoped procedures
// 2. Non-admins cannot access admin-only procedures
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

describe("workspace data isolation", () => {
  it("rejects clients.list when user has no workspace", async () => {
    const ctx = makeCtx({ workspaceId: null, workspaceRole: null });
    const caller = appRouter.createCaller(ctx);

    await expect(caller.clients.list()).rejects.toThrow(
      /workspace|onboarding/i
    );
  });

  it("rejects workspaces.invite when called by an agent (non-admin)", async () => {
    const ctx = makeCtx({ workspaceId: 1, workspaceRole: "agent" });
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.workspaces.invite({ email: "new@example.com" })
    ).rejects.toThrow(/admin|forbidden/i);
  });

  it("rejects workspaces.create when user is already in a workspace", async () => {
    const ctx = makeCtx({ workspaceId: 5, workspaceRole: "owner" });
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.workspaces.create({ name: "Second Workspace" })
    ).rejects.toThrow(/already/i);
  });
});
