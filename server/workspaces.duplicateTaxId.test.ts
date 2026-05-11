// Round 113 — Workspaces with the same tax ID (ח.פ / ת.ז) must NOT coexist.
// We verify the friendly Hebrew CONFLICT message is raised by the procedure
// before reaching the DB. The DB also has a UNIQUE index (uq_workspaces_taxid)
// as a second line of defence; that's not exercised here because it requires
// a real connection.
//
// The valid taxId used below (123456782) passes the Israeli check-digit
// algorithm so we don't trip the BAD_REQUEST guard at line 253 of routers.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as db from "./db";
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

describe("workspaces.create — duplicate taxId is rejected (Round 113)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects with CONFLICT (Hebrew message) when another workspace already owns the same ח.פ", async () => {
    // Pretend a workspace with this taxId already exists.
    vi.spyOn(db, "getWorkspaceByTaxId").mockResolvedValue({
      id: 42,
      name: "סוכנות אחרת",
      taxId: "123456782",
      taxIdType: "company",
    } as Awaited<ReturnType<typeof db.getWorkspaceByTaxId>>);
    // Belt + suspenders — ensure no insert happens if the guard slips.
    const createSpy = vi.spyOn(db, "createWorkspace").mockResolvedValue(999);

    const ctx = makeCtx({ workspaceId: null, workspaceRole: null });
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.workspaces.create({
        name: "סוכנות חדשה",
        taxId: "123456782",
        taxIdType: "company",
        contactPhone: "0501234567",
      }),
    ).rejects.toThrow(/כבר רשום במערכת/);

    expect(createSpy).not.toHaveBeenCalled();
  });

  it("uses the digits-only normalized taxId in the duplicate lookup", async () => {
    const lookupSpy = vi
      .spyOn(db, "getWorkspaceByTaxId")
      .mockResolvedValue(undefined);
    vi.spyOn(db, "createWorkspace").mockResolvedValue(123);
    vi.spyOn(db, "updateUserWorkspace").mockResolvedValue();

    const ctx = makeCtx({ workspaceId: null, workspaceRole: null });
    const caller = appRouter.createCaller(ctx);

    await caller.workspaces.create({
      name: "סוכנות נקייה",
      // Mixed punctuation — should be stripped before the lookup.
      taxId: "12-3456 782",
      taxIdType: "company",
      contactPhone: "050-123-4567",
    });

    expect(lookupSpy).toHaveBeenCalledWith("123456782");
  });

  it("proceeds normally when no other workspace owns the taxId", async () => {
    vi.spyOn(db, "getWorkspaceByTaxId").mockResolvedValue(undefined);
    const createSpy = vi.spyOn(db, "createWorkspace").mockResolvedValue(777);
    const linkSpy = vi.spyOn(db, "updateUserWorkspace").mockResolvedValue();

    const ctx = makeCtx({ workspaceId: null, workspaceRole: null });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.workspaces.create({
      name: "סוכנות ייחודית",
      taxId: "123456782",
      taxIdType: "company",
      contactPhone: "0501234567",
    });

    expect(result).toEqual({ workspaceId: 777 });
    expect(createSpy).toHaveBeenCalledTimes(1);
    // Round 114 — ה-creator מתחיל כ-"agent". תפקיד "owner" מוקצה
    // רק אחרי ש-subscriptionStatus הופך ל-"active" דרך promoteCreatorToOwnerIfActive().
    expect(linkSpy).toHaveBeenCalledWith(1, 777, "agent");
  });

  it("rejects an invalid Israeli check-digit BEFORE the duplicate lookup runs", async () => {
    const lookupSpy = vi.spyOn(db, "getWorkspaceByTaxId");
    vi.spyOn(db, "createWorkspace").mockResolvedValue(0);

    const ctx = makeCtx({ workspaceId: null, workspaceRole: null });
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.workspaces.create({
        name: "סוכנות",
        taxId: "111111111", // invalid check-digit
        taxIdType: "company",
        contactPhone: "0501234567",
      }),
    ).rejects.toThrow(/ח\.פ|תקין/);

    expect(lookupSpy).not.toHaveBeenCalled();
  });
});
