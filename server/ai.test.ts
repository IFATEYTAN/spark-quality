// Verifies the ai.composeMessage tRPC procedure: workspace guard, access
// isolation, and graceful template fallback when the LLM is unavailable.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

const mockGetClientById = vi.fn();
const mockInvokeLLM = vi.fn();
const mockCreateOutreachMessage = vi.fn();

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getClientById: (...args: unknown[]) => mockGetClientById(...args),
    createOutreachMessage: (...args: unknown[]) => mockCreateOutreachMessage(...args),
  };
});

vi.mock("./_core/llm", () => ({
  invokeLLM: (...args: unknown[]) => mockInvokeLLM(...args),
}));

import { appRouter } from "./routers";

const baseUser = {
  id: 7,
  openId: "u_agent",
  workspaceId: 42,
  name: "יפעת איתן",
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

describe("ai.composeMessage", () => {
  beforeEach(() => {
    mockGetClientById.mockReset();
    mockInvokeLLM.mockReset();
    mockCreateOutreachMessage.mockReset();
    mockCreateOutreachMessage.mockResolvedValue(123);
  });

  it("rejects when user has no workspace", async () => {
    const caller = appRouter.createCaller(makeCtx({ workspaceId: null as unknown as number }));
    await expect(
      caller.ai.composeMessage({ clientId: 1, channel: "email" })
    ).rejects.toBeInstanceOf(TRPCError);
    expect(mockGetClientById).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND when the client belongs to another workspace", async () => {
    mockGetClientById.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.ai.composeMessage({ clientId: 99, channel: "email" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns the LLM response when invokeLLM succeeds", async () => {
    mockGetClientById.mockResolvedValue({
      id: 5,
      workspaceId: 42,
      ownerUserId: 7,
      fullName: "דני כהן",
      email: "dani@example.com",
      phone: "0501234567",
      isVip: false,
      flagStatus: "risk_ending",
      totalBalance: "185000",
    });
    mockInvokeLLM.mockResolvedValue({
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({
              subject: "דני, פוליסת הריסק שלך מסתיימת",
              body: "שלום דני,\n\nכאן יפעת. נדבר השבוע?\n\nבברכה,\nיפעת",
            }),
          },
          finish_reason: "stop",
        },
      ],
    });
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.ai.composeMessage({ clientId: 5, channel: "email" });
    expect(result.source).toBe("llm");
    expect(result.subject).toContain("דני");
    expect(result.body).toContain("יפעת");
    expect(mockInvokeLLM).toHaveBeenCalledOnce();
  });

  it("strips ```json fences before parsing the LLM response", async () => {
    mockGetClientById.mockResolvedValue({
      id: 6,
      workspaceId: 42,
      fullName: "שרה לוי",
      email: "sara@example.com",
      phone: "0521234567",
      isVip: false,
      flagStatus: "coverage_gaps",
      totalBalance: "92000",
    });
    mockInvokeLLM.mockResolvedValue({
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "```json\n{\"subject\":\"\",\"body\":\"שלום שרה\"}\n```",
          },
          finish_reason: "stop",
        },
      ],
    });
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.ai.composeMessage({ clientId: 6, channel: "whatsapp" });
    expect(result.source).toBe("llm");
    expect(result.subject).toBe("");
    expect(result.body).toBe("שלום שרה");
  });

  it("falls back to a Hebrew template when invokeLLM throws", async () => {
    mockGetClientById.mockResolvedValue({
      id: 7,
      workspaceId: 42,
      ownerUserId: 7,
      fullName: "מיכל דוד",
      email: "michal@example.com",
      phone: "0531234567",
      isVip: true,
      flagStatus: "vip",
      totalBalance: "1250000",
    });
    mockInvokeLLM.mockRejectedValue(new Error("OPENAI_API_KEY is not configured"));
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.ai.composeMessage({ clientId: 7, channel: "email" });
    expect(result.source).toBe("template");
    expect(result.subject).toContain("מיכל");
    expect(result.body).toContain("מיכל");
    expect(result.body).toContain("SPARK AI");
  });

  it("persists a drafted outreach message and returns its id", async () => {
    mockGetClientById.mockResolvedValue({
      id: 10,
      workspaceId: 42,
      ownerUserId: 7,
      fullName: "רונית גולן",
      email: "ronit@example.com",
      phone: null,
      isVip: false,
      flagStatus: "high_fees",
      totalBalance: "510000",
    });
    mockInvokeLLM.mockResolvedValue({
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({
              subject: "רונית, הצעה לבחינת תיק",
              body: "שלום רונית, נדבר השבוע?",
            }),
          },
          finish_reason: "stop",
        },
      ],
    });
    mockCreateOutreachMessage.mockResolvedValue(777);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.ai.composeMessage({ clientId: 10, channel: "email" });
    expect(result.messageId).toBe(777);
    expect(mockCreateOutreachMessage).toHaveBeenCalledWith({
      workspaceId: 42,
      clientId: 10,
      senderUserId: 7,
      channel: "email",
      subject: "רונית, הצעה לבחינת תיק",
      body: "שלום רונית, נדבר השבוע?",
      source: "llm",
      status: "drafted",
      flagAtCompose: "high_fees",
    });
  });

  it("returns messageId:null when persistence fails (history is non-critical)", async () => {
    mockGetClientById.mockResolvedValue({
      id: 11,
      workspaceId: 42,
      fullName: "אבי ברק",
      email: "avi@example.com",
      phone: "0501112222",
      isVip: false,
      flagStatus: "regular",
      totalBalance: "0",
    });
    mockInvokeLLM.mockResolvedValue({
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({ subject: "x", body: "y" }),
          },
          finish_reason: "stop",
        },
      ],
    });
    mockCreateOutreachMessage.mockResolvedValue(0); // DB unavailable → returns 0
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.ai.composeMessage({ clientId: 11, channel: "email" });
    expect(result.messageId).toBeNull();
    expect(result.body).toBe("y");
  });

  it("forces empty subject on whatsapp regardless of LLM output", async () => {
    mockGetClientById.mockResolvedValue({
      id: 8,
      workspaceId: 42,
      fullName: "טל שרון",
      email: null,
      phone: "0541234567",
      isVip: false,
      flagStatus: "liquid_fund",
      totalBalance: "280000",
    });
    mockInvokeLLM.mockResolvedValue({
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({ subject: "should be ignored", body: "שלום טל" }),
          },
          finish_reason: "stop",
        },
      ],
    });
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.ai.composeMessage({ clientId: 8, channel: "whatsapp" });
    expect(result.subject).toBe("");
    expect(result.body).toBe("שלום טל");
  });
});
