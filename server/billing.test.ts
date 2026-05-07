import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(async () => true),
}));

vi.mock("./email", () => ({
  sendEmail: vi.fn(async () => ({ ok: true, id: "test-id" })),
}));

import { notifyOwner } from "./_core/notification";
import { sendEmail } from "./email";
import { billingRouter } from "./billing";

const mockNotifyOwner = notifyOwner as unknown as ReturnType<typeof vi.fn>;
const mockSendEmail = sendEmail as unknown as ReturnType<typeof vi.fn>;

function makeCtx(overrides: Partial<{ workspaceId: number | null; email: string | null; name: string | null }> = {}) {
  return {
    user: {
      id: 7,
      openId: "user-open",
      name: overrides.name ?? "ענת המל",
      email: overrides.email ?? "anat@example.com",
      role: "user",
      workspaceId: overrides.workspaceId ?? 1,
      workspaceRole: "owner",
      isSuperAdmin: false,
    } as any,
    req: {} as any,
    res: {} as any,
  };
}

describe("billing router", () => {
  beforeEach(() => {
    mockNotifyOwner.mockClear();
    mockNotifyOwner.mockResolvedValue(true);
    mockSendEmail.mockClear();
    mockSendEmail.mockResolvedValue({ ok: true, id: "test-id" });
  });

  it("plans query returns the canonical price table", async () => {
    const caller = billingRouter.createCaller(makeCtx());
    const result = await caller.plans();
    expect(result.basic.monthly).toBe(150);
    expect(result.basic.yearlyPerMonth).toBe(150);
    expect(result.basic.clientLimit).toBe(300);
    expect(result.pro.monthly).toBe(249);
    expect(result.pro.clientLimit).toBe(1000);
    expect(result.premium.monthly).toBe(389);
    expect(result.premium.clientLimit).toBe(-1);
    expect(typeof result.icountReady).toBe("boolean");
  });

  it("requestCheckout for premium yearly notifies owner + emails Anat with the right amount", async () => {
    const caller = billingRouter.createCaller(makeCtx());
    const result = await caller.requestCheckout({
      plan: "premium",
      period: "yearly",
    });

    expect(result.ok).toBe(true);
    expect(result.mode).toBe("manual_followup");
    expect(result.amount).toBe(389 * 12);

    expect(mockNotifyOwner).toHaveBeenCalledTimes(1);
    const notify = mockNotifyOwner.mock.calls[0][0] as { title: string; content: string };
    expect(notify.title).toContain("Premium");
    expect(notify.title).toContain("שנתי");
    expect(notify.content).toContain("anat@example.com");

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const email = mockSendEmail.mock.calls[0][0] as { to: string; subject: string; html?: string; replyTo?: string };
    expect(email.to).toBe("anathemell@gmail.com");
    expect(email.subject).toContain("Premium");
    expect(email.replyTo).toBe("anat@example.com");
    expect(email.html).toContain((389 * 12).toLocaleString("he-IL"));
  });

  it("requestCheckout for basic monthly uses ₪150", async () => {
    const caller = billingRouter.createCaller(makeCtx());
    const result = await caller.requestCheckout({ plan: "basic", period: "monthly" });
    expect(result.amount).toBe(150);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const email = mockSendEmail.mock.calls[0][0] as { html?: string };
    expect(email.html).toContain("150");
    expect(email.html).toContain("Base");
  });

  it("requestCheckout for pro monthly uses ₪249", async () => {
    const caller = billingRouter.createCaller(makeCtx());
    const result = await caller.requestCheckout({ plan: "pro", period: "monthly" });
    expect(result.amount).toBe(249);
    const email = mockSendEmail.mock.calls[0][0] as { html?: string };
    expect(email.html).toContain("249");
    expect(email.html).toContain("Pro");
  });

  it("includes workspaceName when provided (e.g. fresh signup)", async () => {
    const caller = billingRouter.createCaller(makeCtx({ workspaceId: null }));
    await caller.requestCheckout({
      plan: "premium",
      period: "monthly",
      workspaceName: "ביטוח דניאל",
    });
    const email = mockSendEmail.mock.calls[0][0] as { html?: string };
    expect(email.html).toContain("ביטוח דניאל");
  });

  it("does not throw when notifyOwner fails — still emails Anat", async () => {
    mockNotifyOwner.mockResolvedValueOnce(false);
    const caller = billingRouter.createCaller(makeCtx());
    const result = await caller.requestCheckout({ plan: "basic", period: "yearly" });
    expect(result.ok).toBe(true);
    expect(result.delivered).toBe(false);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("rejects unauthenticated callers", async () => {
    const caller = billingRouter.createCaller({
      user: null as any,
      req: {} as any,
      res: {} as any,
    });
    await expect(
      caller.requestCheckout({ plan: "premium", period: "yearly" })
    ).rejects.toThrow();
  });
});
