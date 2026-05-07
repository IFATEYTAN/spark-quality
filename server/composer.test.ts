import { beforeEach, describe, expect, it, vi } from "vitest";

// invokeLLM is mocked per-test. The mock factory captures the spy so the
// procedure's `try`-fallback paths can be exercised deterministically.
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

// We toggle ENV.forgeApiKey via a mutable mock so the no-key fallback path
// is reachable without mucking with process.env at runtime.
vi.mock("./_core/env", () => ({
  ENV: { forgeApiKey: "test-key", forgeApiUrl: "https://example.test" },
}));

import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";
import { appRouter } from "./routers";

const mockInvokeLLM = invokeLLM as unknown as ReturnType<typeof vi.fn>;

function makeCtx() {
  return {
    user: {
      id: 1,
      name: "Test Agent",
      email: "agent@example.com",
      role: "user",
      workspaceId: 1,
      workspaceRole: "agent",
    } as any,
    req: {} as any,
    res: {} as any,
  };
}

const baseCustomer = {
  name: "דני כהן",
  age: 42,
  city: "תל אביב",
  product: "הפניקס - בריאות",
  insurer: "הפניקס",
  accumulation: 850_000,
  status: "ריסק זמני",
};

describe("composer.draft tRPC procedure", () => {
  beforeEach(() => {
    mockInvokeLLM.mockReset();
    (ENV as { forgeApiKey: string }).forgeApiKey = "test-key";
  });

  it("returns LLM-drafted email when the model responds with valid JSON", async () => {
    mockInvokeLLM.mockResolvedValueOnce({
      id: "x",
      created: 0,
      model: "gemini-2.5-flash",
      choices: [
        {
          index: 0,
          finish_reason: "stop",
          message: {
            role: "assistant",
            content: JSON.stringify({
              subject: "דני, חידוש פוליסת הריסק שלך",
              body: "שלום דני,\n\nכאן יפעת. נדבר השבוע על חידוש הריסק.\n\nיפעת | SPARK AI",
            }),
          },
        },
      ],
    });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.composer.draft({
      channel: "email",
      customer: baseCustomer,
    });

    expect(result.source).toBe("llm");
    expect(result.subject).toBe("דני, חידוש פוליסת הריסק שלך");
    expect(result.body).toContain("יפעת");
    expect(mockInvokeLLM).toHaveBeenCalledTimes(1);

    // System prompt must reach the model and JSON schema must be requested.
    const args = mockInvokeLLM.mock.calls[0][0] as {
      messages: Array<{ role: string; content: string }>;
      responseFormat?: { type: string; json_schema?: { name: string } };
    };
    expect(args.messages[0].role).toBe("system");
    expect(args.messages[1].content).toContain("דני כהן");
    expect(args.responseFormat?.type).toBe("json_schema");
    expect(args.responseFormat?.json_schema?.name).toBe("outreach_message");
  });

  it("returns whatsapp body without subject and skips empty subject from the model", async () => {
    mockInvokeLLM.mockResolvedValueOnce({
      id: "x",
      created: 0,
      model: "gemini-2.5-flash",
      choices: [
        {
          index: 0,
          finish_reason: "stop",
          message: {
            role: "assistant",
            content: JSON.stringify({
              subject: "",
              body: "שלום דני 👋 בוא נדבר על חידוש הריסק.",
            }),
          },
        },
      ],
    });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.composer.draft({
      channel: "whatsapp",
      customer: baseCustomer,
    });

    expect(result.source).toBe("llm");
    expect(result.subject).toBe("");
    expect(result.body).toContain("דני");
  });

  it("falls back to the deterministic template when LLM throws", async () => {
    mockInvokeLLM.mockRejectedValueOnce(new Error("upstream 500"));

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.composer.draft({
      channel: "email",
      customer: baseCustomer,
    });

    expect(result.source).toBe("fallback");
    expect(result.body).toContain("דני");
    expect(result.body).toContain("יפעת איתן | SPARK AI");
    expect(result.subject.length).toBeGreaterThan(0);
  });

  it("falls back without calling the LLM when forgeApiKey is missing", async () => {
    (ENV as { forgeApiKey: string }).forgeApiKey = "";

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.composer.draft({
      channel: "whatsapp",
      customer: baseCustomer,
    });

    expect(result.source).toBe("fallback");
    expect(result.subject).toBe("");
    expect(result.body).toContain("דני");
    expect(mockInvokeLLM).not.toHaveBeenCalled();
  });

  it("falls back when the LLM returns malformed JSON", async () => {
    mockInvokeLLM.mockResolvedValueOnce({
      id: "x",
      created: 0,
      model: "gemini-2.5-flash",
      choices: [
        {
          index: 0,
          finish_reason: "stop",
          message: {
            role: "assistant",
            content: "this is not json at all",
          },
        },
      ],
    });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.composer.draft({
      channel: "email",
      customer: baseCustomer,
    });

    expect(result.source).toBe("fallback");
    expect(result.subject.length).toBeGreaterThan(0);
    expect(result.body.length).toBeGreaterThan(0);
  });

  it("rejects unauthenticated callers (protectedProcedure)", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    } as any);
    await expect(
      caller.composer.draft({ channel: "email", customer: baseCustomer }),
    ).rejects.toThrow();
  });
});
