import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock notifyOwner so the test doesn't depend on the live notification service
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(async () => true),
}));

// Mock sendEmail (Resend) so we don't actually deliver email in tests
vi.mock("./email", () => ({
  sendEmail: vi.fn(async () => ({ ok: true, id: "test-id" })),
}));

import { notifyOwner } from "./_core/notification";
import { sendEmail } from "./email";
import { appRouter } from "./routers";

const mockNotifyOwner = notifyOwner as unknown as ReturnType<typeof vi.fn>;
const mockSendEmail = sendEmail as unknown as ReturnType<typeof vi.fn>;

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
    mockSendEmail.mockClear();
    mockSendEmail.mockResolvedValue({ ok: true, id: "test-id" });
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

  it("calls notifyOwner AND sendEmail to Anat with full payload on valid input", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.contact.send({
      name: "ענת המל",
      email: "anat@example.com",
      phone: "0547395570",
      message: "אשמח לפגישה ביום ראשון בבוקר",
      source: "vitest",
    });

    expect(result).toEqual({ ok: true, delivered: true, emailed: true });

    expect(mockNotifyOwner).toHaveBeenCalledTimes(1);
    const notifyCall = mockNotifyOwner.mock.calls[0][0] as { title: string; content: string };
    expect(notifyCall.title).toContain("ענת המל");
    expect(notifyCall.content).toContain("anat@example.com");
    expect(notifyCall.content).toContain("0547395570");

    // Resend must be called with Anat's address as recipient
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const emailCall = mockSendEmail.mock.calls[0][0] as {
      to: string | string[];
      subject: string;
      html?: string;
      replyTo?: string;
    };
    expect(emailCall.to).toBe("anathemell@gmail.com");
    expect(emailCall.subject).toContain("ענת המל");
    expect(emailCall.replyTo).toBe("anat@example.com");
    expect(emailCall.html).toContain("0547395570");
  });

  it("works without phone (optional) and still emails Anat", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.contact.send({
      name: "Demo User",
      email: "demo@example.com",
      message: "Hello SPARK AI team",
    });

    expect(result.ok).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const emailCall = mockSendEmail.mock.calls[0][0] as { to: string; html?: string };
    expect(emailCall.to).toBe("anathemell@gmail.com");
    expect(emailCall.html).not.toContain("טלפון:");
  });

  it("returns emailed:false when Resend fails but does not throw", async () => {
    mockSendEmail.mockResolvedValueOnce({ ok: false, error: "boom" });
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.contact.send({
      name: "Demo User",
      email: "demo@example.com",
      message: "Hello SPARK AI team",
    });

    expect(result).toEqual({ ok: true, delivered: true, emailed: false });
    expect(mockNotifyOwner).toHaveBeenCalledTimes(1);
  });

  it("returns delivered:false when notifyOwner returns false but still emails Anat", async () => {
    mockNotifyOwner.mockResolvedValueOnce(false);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.contact.send({
      name: "Demo User",
      email: "demo@example.com",
      message: "Hello SPARK AI team",
    });

    expect(result).toEqual({ ok: true, delivered: false, emailed: true });
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });
});
