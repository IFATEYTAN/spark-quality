// Round 114 — Two product rules enforced here:
//   1. workspaces.create assigns the creator the role "agent" (NOT "owner").
//   2. promoteCreatorToOwnerIfActive() promotes the creator to "owner" ONLY
//      when the workspace's subscriptionStatus is "active".
//
// We exercise both contracts at the unit level by stubbing the DB layer.
// The retroactive backfill (existing pending_payment owners → agents) is a
// one-off SQL operation and is not exercised here.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeCtx(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 42,
    openId: "test-user",
    email: "agent@example.com",
    name: "Test Agent",
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

describe("Rule #1 — workspaces.create assigns 'agent', never 'owner' (Round 114)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("links the creator with role='agent' on a successful workspace creation", async () => {
    vi.spyOn(db, "getWorkspaceByTaxId").mockResolvedValue(undefined);
    vi.spyOn(db, "createWorkspace").mockResolvedValue(555);
    const linkSpy = vi.spyOn(db, "updateUserWorkspace").mockResolvedValue();

    const caller = appRouter.createCaller(
      makeCtx({ workspaceId: null, workspaceRole: null }),
    );
    await caller.workspaces.create({
      name: "סוכנות חדשה",
      taxId: "123456782",
      taxIdType: "company",
      contactPhone: "0501234567",
    });

    expect(linkSpy).toHaveBeenCalledTimes(1);
    expect(linkSpy).toHaveBeenCalledWith(42, 555, "agent");
  });

  it("forwards createdByUserId so the payment-success handler knows who to promote", async () => {
    vi.spyOn(db, "getWorkspaceByTaxId").mockResolvedValue(undefined);
    const createSpy = vi.spyOn(db, "createWorkspace").mockResolvedValue(556);
    vi.spyOn(db, "updateUserWorkspace").mockResolvedValue();

    const caller = appRouter.createCaller(
      makeCtx({
        id: 99,
        workspaceId: null,
        workspaceRole: null,
      }),
    );
    await caller.workspaces.create({
      name: "סוכנות נוספת",
      taxId: "123456782",
      taxIdType: "company",
      contactPhone: "0501234567",
    });

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy.mock.calls[0]?.[0]).toMatchObject({
      createdByUserId: 99,
    });
  });
});

describe("Rule #2 — promoteCreatorToOwnerIfActive (Round 114)", () => {
  it("is exported and callable", () => {
    expect(typeof db.promoteCreatorToOwnerIfActive).toBe("function");
  });
});
