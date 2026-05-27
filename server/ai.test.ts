// Verifies the ai.composeMessage tRPC procedure: workspace guard, access
// isolation, and graceful template fallback when the LLM is unavailable.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

const mockGetClientById = vi.fn();
const mockGetClientPolicies = vi.fn();
const mockInvokeLLM = vi.fn();
const mockCreateOutreachMessage = vi.fn();

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getClientById: (...args: unknown[]) => mockGetClientById(...args),
    getClientPolicies: (...args: unknown[]) => mockGetClientPolicies(...args),
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
    mockGetClientPolicies.mockReset();
    mockInvokeLLM.mockReset();
    mockCreateOutreachMessage.mockReset();
    mockGetClientPolicies.mockResolvedValue([]);
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

  it("enriches the LLM prompt with computed age and top active policies", async () => {
    // Birthdate ~62 years ago
    const sixtyTwoYearsAgo = new Date();
    sixtyTwoYearsAgo.setFullYear(sixtyTwoYearsAgo.getFullYear() - 62);
    mockGetClientById.mockResolvedValue({
      id: 12,
      workspaceId: 42,
      ownerUserId: 7,
      fullName: "יעקב שפירא",
      email: "yaakov@example.com",
      phone: "0541112222",
      isVip: false,
      flagStatus: "tikun_190",
      totalBalance: "450000",
      birthDate: sixtyTwoYearsAgo,
    });
    mockGetClientPolicies.mockResolvedValue([
      {
        id: 1,
        clientId: 12,
        workspaceId: 42,
        company: "מגדל",
        productType: "חיסכון פרט",
        balance: "300000",
        monthlyPremium: "0",
        endDate: null,
        status: "active",
      },
      {
        id: 2,
        clientId: 12,
        workspaceId: 42,
        company: "הפניקס",
        productType: "ריסק זמני",
        balance: "0",
        monthlyPremium: "850",
        endDate: new Date("2026-01-31"),
        status: "active",
      },
      {
        id: 3,
        clientId: 12,
        workspaceId: 42,
        company: "old",
        productType: "x",
        balance: "9999999",
        monthlyPremium: "0",
        endDate: null,
        status: "inactive", // should be filtered out
      },
    ]);
    mockInvokeLLM.mockResolvedValue({
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({ subject: "ok", body: "ok" }),
          },
          finish_reason: "stop",
        },
      ],
    });
    const caller = appRouter.createCaller(makeCtx());
    await caller.ai.composeMessage({ clientId: 12, channel: "email" });

    expect(mockInvokeLLM).toHaveBeenCalledOnce();
    const sentMessages = mockInvokeLLM.mock.calls[0][0].messages;
    const userMessage = sentMessages[sentMessages.length - 1].content as string;
    // Age line is present and shows a sensible 60s value (61 or 62 depending
    // on leap-year alignment — we just want a real number near the target).
    const ageMatch = userMessage.match(/גיל: (\d+)/);
    expect(ageMatch).not.toBeNull();
    expect(Number(ageMatch![1])).toBeGreaterThanOrEqual(60);
    expect(Number(ageMatch![1])).toBeLessThanOrEqual(63);
    // Active policies are present
    expect(userMessage).toContain("פוליסות פעילות");
    expect(userMessage).toContain("מגדל");
    expect(userMessage).toContain("הפניקס");
    // Inactive policy is filtered out
    expect(userMessage).not.toContain("old");
    // Prompt instructs the LLM to reference specific details, not generic
    expect(userMessage).toContain("אל תכתוב/י הודעה גנרית");
  });

  it("omits the age line when birthDate is missing", async () => {
    mockGetClientById.mockResolvedValue({
      id: 13,
      workspaceId: 42,
      fullName: "אנונימי",
      email: null,
      phone: "0501234567",
      isVip: false,
      flagStatus: "regular",
      totalBalance: "0",
      birthDate: null,
    });
    mockInvokeLLM.mockResolvedValue({
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: JSON.stringify({ subject: "", body: "hi" }) },
          finish_reason: "stop",
        },
      ],
    });
    const caller = appRouter.createCaller(makeCtx());
    await caller.ai.composeMessage({ clientId: 13, channel: "whatsapp" });

    const userMessage = mockInvokeLLM.mock.calls[0][0].messages.at(-1).content as string;
    expect(userMessage).not.toContain("גיל:");
    expect(userMessage).not.toContain("פוליסות פעילות");
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
