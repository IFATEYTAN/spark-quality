// Vitest for admin router: ensure gating works and that real super-admin sees data.
import { describe, it, expect, vi, beforeEach } from "vitest";

// Stub DB layer
vi.mock("./db", () => ({
  getGlobalDashboardStats: vi.fn(async () => ({
    workspaces: { active: 2, total: 3 },
    users: 7,
    clients: 31,
    aum: 12_500_000,
    reports: 4,
    contactsNew: 1,
  })),
  listAllWorkspacesWithStats: vi.fn(async () => [
    {
      id: 1,
      name: "Sample Agency",
      plan: "trial",
      suspendedAt: null,
      memberCount: 2,
      clientCount: 31,
      reportCount: 4,
      totalAum: 12_500_000,
    },
  ]),
  listAllUsersWithWorkspace: vi.fn(async () => []),
  listContactSubmissions: vi.fn(async () => []),
  listAuditLog: vi.fn(async () => []),
  setWorkspaceSuspended: vi.fn(async () => undefined),
  setWorkspacePlan: vi.fn(async () => undefined),
  setUserSuperAdmin: vi.fn(async () => undefined),
  setUserSuspended: vi.fn(async () => undefined),
  setUserWorkspaceRole: vi.fn(async () => undefined),
  updateContactSubmissionStatus: vi.fn(async () => undefined),
  writeAudit: vi.fn(async () => undefined),
}));

import { adminRouter } from "./adminRouter";

const mockReq = { headers: {}, cookies: {} } as unknown as Parameters<
  typeof adminRouter.createCaller
>[0]["req"];
const mockRes = { clearCookie: () => undefined } as unknown as Parameters<
  typeof adminRouter.createCaller
>[0]["res"];

function makeCaller(opts: { isSuperAdmin: boolean; userId?: number }) {
  return adminRouter.createCaller({
    req: mockReq,
    res: mockRes,
    user: opts.isSuperAdmin
      ? ({
          id: opts.userId ?? 1,
          openId: "owner-open",
          name: "Tester",
          email: "tester@spark-ai.co.il",
          role: "admin",
          isSuperAdmin: true,
          workspaceId: 1,
          workspaceRole: "owner",
          suspendedAt: null,
          createdAt: new Date(),
          lastSignedIn: new Date(),
          loginMethod: "google",
        } as never)
      : ({
          id: 99,
          openId: "regular-open",
          name: "Regular",
          email: "agent@example.com",
          role: "user",
          isSuperAdmin: false,
          workspaceId: 1,
          workspaceRole: "agent",
          suspendedAt: null,
          createdAt: new Date(),
          lastSignedIn: new Date(),
          loginMethod: "google",
        } as never),
  });
}

describe("admin router gating", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects non-super-admin from dashboard", async () => {
    const caller = makeCaller({ isSuperAdmin: false });
    await expect(caller.dashboard()).rejects.toThrow();
  });

  it("rejects non-super-admin from listWorkspaces", async () => {
    const caller = makeCaller({ isSuperAdmin: false });
    await expect(caller.listWorkspaces()).rejects.toThrow();
  });

  it("allows super-admin to read dashboard", async () => {
    const caller = makeCaller({ isSuperAdmin: true });
    const res = await caller.dashboard();
    expect(res.workspaces.active).toBe(2);
    expect(res.contactsNew).toBe(1);
  });

  it("allows super-admin to list workspaces", async () => {
    const caller = makeCaller({ isSuperAdmin: true });
    const res = await caller.listWorkspaces();
    expect(res).toHaveLength(1);
    expect(res[0].name).toBe("Sample Agency");
  });

  it("prevents super-admin from revoking own super-admin", async () => {
    const caller = makeCaller({ isSuperAdmin: true, userId: 5 });
    await expect(
      caller.setUserSuperAdmin({ userId: 5, value: false })
    ).rejects.toThrow(/Super-Admin/);
  });

  it("prevents super-admin from suspending self", async () => {
    const caller = makeCaller({ isSuperAdmin: true, userId: 5 });
    await expect(
      caller.setUserSuspended({ userId: 5, suspended: true })
    ).rejects.toThrow();
  });

  it("allows super-admin to suspend a workspace", async () => {
    const caller = makeCaller({ isSuperAdmin: true });
    const res = await caller.setWorkspaceSuspended({ workspaceId: 1, suspended: true });
    expect(res.ok).toBe(true);
  });
});
