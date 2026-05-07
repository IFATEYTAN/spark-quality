import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

const mockUpdateClient = vi.fn();
const mockGetClientById = vi.fn();

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    updateClient: (...args: unknown[]) => mockUpdateClient(...args),
    getClientById: (...args: unknown[]) => mockGetClientById(...args),
  };
});

import { appRouter } from "./routers";

const baseUser = {
  id: 1,
  openId: "u_owner",
  workspaceId: 100,
  name: "Owner",
  email: "owner@example.com",
  phone: null,
  loginMethod: "google" as const,
  role: "user" as const,
  workspaceRole: "manager" as const,
  isSuperAdmin: false,
  suspendedAt: null,
  licenseNumber: null,
  licenseFileKey: null,
  licenseVerifiedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function makeCtx(overrides: Partial<typeof baseUser> = {}) {
  return {
    user: { ...baseUser, ...overrides },
    req: { cookies: {}, headers: {} } as never,
    res: {} as never,
  } as never;
}

describe("clients.update tRPC procedure", () => {
  beforeEach(() => {
    mockUpdateClient.mockReset();
    mockGetClientById.mockReset();
  });

  it("rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: { cookies: {}, headers: {} } as never,
      res: {} as never,
    } as never);
    await expect(
      caller.clients.update({ clientId: 1, isVip: true })
    ).rejects.toBeInstanceOf(TRPCError);
  });

  it("rejects when getClientById returns nothing (other workspace)", async () => {
    mockGetClientById.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.clients.update({ clientId: 5, isVip: true })
    ).rejects.toBeInstanceOf(TRPCError);
    expect(mockUpdateClient).not.toHaveBeenCalled();
  });

  it("allows manager to update any client in workspace", async () => {
    mockGetClientById.mockResolvedValue({ id: 5, workspaceId: 100, ownerUserId: 7 });
    mockUpdateClient.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeCtx({ workspaceRole: "manager" }));
    const result = await caller.clients.update({
      clientId: 5,
      isVip: true,
      notes: "VIP customer",
    });
    expect(result).toEqual({ ok: true });
    expect(mockUpdateClient).toHaveBeenCalledWith({
      clientId: 5,
      workspaceId: 100,
      isVip: true,
      notes: "VIP customer",
      flagStatus: undefined,
    });
  });

  it("blocks an agent when getClientById returns nothing for them", async () => {
    mockGetClientById.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(
      makeCtx({ id: 1, workspaceRole: "agent" })
    );
    await expect(
      caller.clients.update({ clientId: 5, notes: "x" })
    ).rejects.toBeInstanceOf(TRPCError);
    expect(mockUpdateClient).not.toHaveBeenCalled();
  });

  it("allows an agent to edit their own client", async () => {
    mockGetClientById.mockResolvedValue({ id: 5, workspaceId: 100, ownerUserId: 1 });
    mockUpdateClient.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(
      makeCtx({ id: 1, workspaceRole: "agent" })
    );
    const result = await caller.clients.update({
      clientId: 5,
      flagStatus: "tikun_190",
    });
    expect(result).toEqual({ ok: true });
    expect(mockUpdateClient).toHaveBeenCalledWith({
      clientId: 5,
      workspaceId: 100,
      isVip: undefined,
      notes: undefined,
      flagStatus: "tikun_190",
    });
  });
});
