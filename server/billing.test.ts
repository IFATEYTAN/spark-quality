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

  it("plans query returns the single-tier SPARK Quality price table", async () => {
    const caller = billingRouter.createCaller(makeCtx());
    const result = await caller.plans();
    // Every plan key resolves to the same SPARK Quality price (₪349/mo).
    expect(result.basic.monthly).toBe(349);
    expect(result.pro.monthly).toBe(349);
    expect(result.premium.monthly).toBe(349);
    // Yearly is 15% off, billed once.
    const expectedYearly = Math.round(349 * 12 * 0.85);
    expect(result.basic.yearlyTotal).toBe(expectedYearly);
    expect(result.premium.yearlyTotal).toBe(expectedYearly);
    // All plans are unlimited clients (single-tier model).
    expect(result.basic.clientLimit).toBe(-1);
    expect(result.pro.clientLimit).toBe(-1);
    expect(result.premium.clientLimit).toBe(-1);
    expect(typeof result.icountReady).toBe("boolean");
  });

  it("requestCheckout (yearly) notifies owner + emails Anat with the SPARK Quality yearly amount", async () => {
    const caller = billingRouter.createCaller(makeCtx());
    const yearlyAmount = Math.round(349 * 12 * 0.85);
    const result = await caller.requestCheckout({
      plan: "premium",
      period: "yearly",
    });

    expect(result.ok).toBe(true);
    expect(result.mode).toBe("manual_followup");
    expect(result.amount).toBe(yearlyAmount);

    expect(mockNotifyOwner).toHaveBeenCalledTimes(1);
    const notify = mockNotifyOwner.mock.calls[0][0] as { title: string; content: string };
    expect(notify.title).toContain("SPARK Quality");
    expect(notify.title).toContain("שנתי");
    expect(notify.content).toContain("anat@example.com");

    // requestCheckout sends 2 emails: Anat (owner alert) + customer confirmation.
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
    const email = mockSendEmail.mock.calls[0][0] as { to: string; subject: string; html?: string; replyTo?: string };
    expect(email.to).toBe("anathemell@gmail.com");
    expect(email.subject).toContain("SPARK Quality");
    expect(email.replyTo).toBe("anat@example.com");
    expect(email.html).toContain(yearlyAmount.toLocaleString("he-IL"));
  });

  it("requestCheckout (monthly) uses ₪349 regardless of plan key", async () => {
    const caller = billingRouter.createCaller(makeCtx());
    const result = await caller.requestCheckout({ plan: "basic", period: "monthly" });
    expect(result.amount).toBe(349);
    // Anat alert + customer confirmation = 2 emails.
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
    const email = mockSendEmail.mock.calls[0][0] as { html?: string };
    expect(email.html).toContain("349");
    expect(email.html).toContain("SPARK Quality");
  });

  it("requestCheckout for pro key also resolves to ₪349 (legacy slug)", async () => {
    const caller = billingRouter.createCaller(makeCtx());
    const result = await caller.requestCheckout({ plan: "pro", period: "monthly" });
    expect(result.amount).toBe(349);
    const email = mockSendEmail.mock.calls[0][0] as { html?: string };
    expect(email.html).toContain("349");
    expect(email.html).toContain("SPARK Quality");
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
    // 2 emails still go out (Anat alert + customer confirmation).
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
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
