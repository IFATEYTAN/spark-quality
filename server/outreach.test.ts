// Verifies the outreach router: workspace + role isolation on
// listForClient and markSent, plus the NOT_FOUND error path.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

const mockGetClientById = vi.fn();
const mockListOutreachForClient = vi.fn();
const mockMarkOutreachSent = vi.fn();
const mockGetOutreachMessageById = vi.fn();
const mockSendEmail = vi.fn();

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getClientById: (...args: unknown[]) => mockGetClientById(...args),
    listOutreachForClient: (...args: unknown[]) => mockListOutreachForClient(...args),
    markOutreachSent: (...args: unknown[]) => mockMarkOutreachSent(...args),
    getOutreachMessageById: (...args: unknown[]) => mockGetOutreachMessageById(...args),
  };
});

vi.mock("./email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

import { appRouter } from "./routers";

const baseUser = {
  id: 7,
  openId: "u_agent",
  workspaceId: 42,
  name: "יפעת",
  email: "ifat@example.com",
  phone: null,
  loginMethod: "google" as const,
  role: "user" as const,
  workspaceRole: "agent" as const,
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
    req: { protocol: "https", headers: { host: "spark-ai.test" }, cookies: {} } as never,
    res: {} as never,
  } as never;
}

describe("outreach.listForClient", () => {
  beforeEach(() => {
    mockGetClientById.mockReset();
    mockListOutreachForClient.mockReset();
  });

  it("rejects when the client is not in the user's workspace", async () => {
    mockGetClientById.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.outreach.listForClient({ clientId: 999 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mockListOutreachForClient).not.toHaveBeenCalled();
  });

  it("returns the message list when the user can see the client", async () => {
    mockGetClientById.mockResolvedValue({ id: 5, workspaceId: 42, ownerUserId: 7 });
    mockListOutreachForClient.mockResolvedValue([
      { id: 1, channel: "email", status: "sent", body: "שלום" },
    ]);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.outreach.listForClient({ clientId: 5 });
    expect(result).toHaveLength(1);
    expect(mockListOutreachForClient).toHaveBeenCalledWith({
      clientId: 5,
      workspaceId: 42,
      userId: 7,
      workspaceRole: "agent",
      limit: undefined,
    });
  });

  it("propagates the limit parameter", async () => {
    mockGetClientById.mockResolvedValue({ id: 5, workspaceId: 42, ownerUserId: 7 });
    mockListOutreachForClient.mockResolvedValue([]);
    const caller = appRouter.createCaller(makeCtx());
    await caller.outreach.listForClient({ clientId: 5, limit: 25 });
    expect(mockListOutreachForClient).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 25 })
    );
  });
});

describe("outreach.markSent", () => {
  beforeEach(() => {
    mockMarkOutreachSent.mockReset();
  });

  it("returns NOT_FOUND when the message doesn't belong to the sender's workspace", async () => {
    mockMarkOutreachSent.mockResolvedValue(false);
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.outreach.markSent({ messageId: 999 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns ok:true when the update affected a row", async () => {
    mockMarkOutreachSent.mockResolvedValue(true);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.outreach.markSent({ messageId: 42 });
    expect(result).toEqual({ ok: true });
    expect(mockMarkOutreachSent).toHaveBeenCalledWith({
      messageId: 42,
      workspaceId: 42,
      senderUserId: 7,
    });
  });

  it("rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as never,
      res: {} as never,
    } as never);
    await expect(
      caller.outreach.markSent({ messageId: 1 })
    ).rejects.toBeInstanceOf(TRPCError);
  });
});

describe("outreach.sendEmailDirect", () => {
  beforeEach(() => {
    mockGetOutreachMessageById.mockReset();
    mockGetClientById.mockReset();
    mockSendEmail.mockReset();
    mockMarkOutreachSent.mockReset();
  });

  it("returns NOT_FOUND when the message doesn't belong to the sender", async () => {
    mockGetOutreachMessageById.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.outreach.sendEmailDirect({ messageId: 99 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("rejects WhatsApp messages — direct send is email-only", async () => {
    mockGetOutreachMessageById.mockResolvedValue({
      id: 5,
      channel: "whatsapp",
      status: "drafted",
      clientId: 1,
      body: "hi",
    });
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.outreach.sendEmailDirect({ messageId: 5 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("rejects messages that are already sent", async () => {
    mockGetOutreachMessageById.mockResolvedValue({
      id: 5,
      channel: "email",
      status: "sent",
      clientId: 1,
      body: "hi",
    });
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.outreach.sendEmailDirect({ messageId: 5 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects when the client has no email on file", async () => {
    mockGetOutreachMessageById.mockResolvedValue({
      id: 5,
      channel: "email",
      status: "drafted",
      clientId: 1,
      subject: "x",
      body: "y",
    });
    mockGetClientById.mockResolvedValue({ id: 1, workspaceId: 42, email: null });
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.outreach.sendEmailDirect({ messageId: 5 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("propagates a Resend failure as INTERNAL_SERVER_ERROR", async () => {
    mockGetOutreachMessageById.mockResolvedValue({
      id: 5,
      channel: "email",
      status: "drafted",
      clientId: 1,
      subject: "x",
      body: "y",
    });
    mockGetClientById.mockResolvedValue({ id: 1, workspaceId: 42, email: "c@x.com" });
    mockSendEmail.mockResolvedValue({ ok: false, error: "RESEND_API_KEY missing" });
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.outreach.sendEmailDirect({ messageId: 5 })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(mockMarkOutreachSent).not.toHaveBeenCalled();
  });

  it("sends via Resend with CC + reply-to to the agent, then marks sent", async () => {
    mockGetOutreachMessageById.mockResolvedValue({
      id: 5,
      channel: "email",
      status: "drafted",
      clientId: 1,
      subject: "שלום דני",
      body: "שורה 1\nשורה 2",
    });
    mockGetClientById.mockResolvedValue({ id: 1, workspaceId: 42, email: "dani@x.com" });
    mockSendEmail.mockResolvedValue({ ok: true, id: "resend-abc" });
    mockMarkOutreachSent.mockResolvedValue(true);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.outreach.sendEmailDirect({ messageId: 5 });

    expect(result).toEqual({ ok: true, providerId: "resend-abc" });
    expect(mockSendEmail).toHaveBeenCalledOnce();
    const call = mockSendEmail.mock.calls[0][0];
    expect(call.to).toBe("dani@x.com");
    expect(call.subject).toBe("שלום דני");
    expect(call.replyTo).toBe("ifat@example.com");
    expect(call.cc).toBe("ifat@example.com");
    expect(call.fromName).toBe("יפעת");
    // Body line breaks become <br/> in HTML
    expect(call.html).toContain("שורה 1<br/>שורה 2");
    expect(mockMarkOutreachSent).toHaveBeenCalledWith({
      messageId: 5,
      workspaceId: 42,
      senderUserId: 7,
    });
  });
});
