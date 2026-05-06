import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock notifyOwner so the test doesn't depend on the live notification service
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(async () => true),
}));

import { notifyOwner } from "./_core/notification";
import { appRouter } from "./routers";

const mockNotifyOwner = notifyOwner as unknown as ReturnType<typeof vi.fn>;

function makeCtx() {
  return {
    user: { id: 0, name: "anon", email: "anon@example.com", role: "user", workspaceId: null, workspaceRole: null } as any,
    req: {} as any,
    res: {} as any,
  };
}

describe("contact.send tRPC procedure", () => {
  beforeEach(() => {
    mockNotifyOwner.mockClear();
    mockNotifyOwner.mockResolvedValue(true);
  });

  it("rejects too-short messages and missing email", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.contact.send({
        name: "Anat",
        email: "not-an-email",
        message: "ok",
      })
    ).rejects.toThrow();
  });

  it("calls notifyOwner with full payload on valid input", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.contact.send({
      name: "ענת המל",
      email: "anat@example.com",
      phone: "0547395570",
      message: "אשמח לפגישה ביום ראשון בבוקר",
      source: "vitest",
    });

    expect(result).toEqual({ ok: true, delivered: true });
    expect(mockNotifyOwner).toHaveBeenCalledTimes(1);
    const call = mockNotifyOwner.mock.calls[0][0] as { title: string; content: string };
    expect(call.title).toContain("ענת המל");
    expect(call.content).toContain("anat@example.com");
    expect(call.content).toContain("0547395570");
    expect(call.content).toContain("אשמח לפגישה");
    expect(call.content).toContain("vitest");
  });

  it("works without phone (optional)", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.contact.send({
      name: "Demo User",
      email: "demo@example.com",
      message: "Hello SPARK AI team",
    });

    expect(result.ok).toBe(true);
    const call = mockNotifyOwner.mock.calls[0][0] as { content: string };
    expect(call.content).not.toContain("טלפון:");
  });

  it("propagates failure when notifyOwner returns false", async () => {
    mockNotifyOwner.mockResolvedValueOnce(false);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.contact.send({
      name: "Demo User",
      email: "demo@example.com",
      message: "Hello SPARK AI team",
    });

    expect(result).toEqual({ ok: true, delivered: false });
  });
});
