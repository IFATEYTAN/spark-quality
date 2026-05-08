// Vitest for revokeInvitation + sendInvitationEmail tRPC mutations.
// Mocks db helpers + sendEmail to keep the test hermetic.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./db", () => ({
  getInvitationById: vi.fn(),
  revokeInvitation: vi.fn(async () => true),
}));

vi.mock("./email", () => ({
  sendEmail: vi.fn(async () => ({ ok: true, id: "msg-1" })),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(async () => true),
}));

import { appRouter } from "./routers";
import * as db from "./db";
import { sendEmail } from "./email";

const mockedGet = db.getInvitationById as unknown as ReturnType<typeof vi.fn>;
const mockedRevoke = db.revokeInvitation as unknown as ReturnType<typeof vi.fn>;
const mockedSend = sendEmail as unknown as ReturnType<typeof vi.fn>;

function makeAdminCtx() {
  return {
    user: {
      id: 1,
      openId: "owner",
      email: "owner@spark-ai.co.il",
      name: "Owner",
      workspaceId: 10,
      workspaceRole: "owner" as const,
      role: "user" as const,
      isSuperAdmin: false,
    },
    res: { setHeader: () => {}, getHeader: () => undefined } as unknown as import("express").Response,
    req: { headers: { origin: "https://example.com" } } as unknown as import("express").Request,
  };
}

describe("workspaces.revokeInvitation", () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedRevoke.mockClear();
  });

  it("revokes a pending invitation owned by the workspace", async () => {
    mockedGet.mockResolvedValueOnce({
      id: 5,
      workspaceId: 10,
      email: "someone@example.com",
      status: "pending",
      token: "tok",
    });
    const caller = appRouter.createCaller(makeAdminCtx());
    const out = await caller.workspaces.revokeInvitation({ invitationId: 5 });
    expect(out.ok).toBe(true);
    expect(mockedRevoke).toHaveBeenCalledWith(5, 10);
  });

  it("throws NOT_FOUND when invitation does not exist or belongs to another workspace", async () => {
    mockedGet.mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(caller.workspaces.revokeInvitation({ invitationId: 999 })).rejects.toThrow(/not found/i);
    expect(mockedRevoke).not.toHaveBeenCalled();
  });
});

describe("workspaces.sendInvitationEmail", () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedSend.mockReset();
    mockedSend.mockResolvedValue({ ok: true, id: "msg-1" });
  });

  it("sends a Resend email with the invite URL when invitation is pending", async () => {
    mockedGet.mockResolvedValueOnce({
      id: 7,
      workspaceId: 10,
      email: "guest@example.com",
      status: "pending",
      token: "tok-abc",
    });
    const caller = appRouter.createCaller(makeAdminCtx());
    const out = await caller.workspaces.sendInvitationEmail({
      invitationId: 7,
      origin: "https://demo.spark-ai.co.il",
    });
    expect(out.ok).toBe(true);
    expect(mockedSend).toHaveBeenCalledTimes(1);
    const call = mockedSend.mock.calls[0][0];
    expect(call.to).toBe("guest@example.com");
    expect(call.html).toContain("https://demo.spark-ai.co.il/onboarding?invite=tok-abc");
  });

  it("rejects when invitation is no longer pending", async () => {
    mockedGet.mockResolvedValueOnce({
      id: 7,
      workspaceId: 10,
      email: "guest@example.com",
      status: "accepted",
      token: "tok-abc",
    });
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.workspaces.sendInvitationEmail({
        invitationId: 7,
        origin: "https://demo.spark-ai.co.il",
      })
    ).rejects.toThrow(/no longer pending/i);
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it("throws when Resend returns a failure", async () => {
    mockedGet.mockResolvedValueOnce({
      id: 7,
      workspaceId: 10,
      email: "guest@example.com",
      status: "pending",
      token: "tok-abc",
    });
    mockedSend.mockResolvedValueOnce({ ok: false, error: "Resend 500: outage" });
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.workspaces.sendInvitationEmail({
        invitationId: 7,
        origin: "https://demo.spark-ai.co.il",
      })
    ).rejects.toThrow(/Resend 500/);
  });
});
