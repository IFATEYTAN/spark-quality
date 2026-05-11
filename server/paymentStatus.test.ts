import { describe, expect, it } from "vitest";
import { getPaymentStatusDescriptor } from "../shared/paymentStatus";

// Round 112 — the /admin payment-status column. These tests pin the
// descriptor mapping so future refactors don't silently regress.

describe("getPaymentStatusDescriptor", () => {
  it("returns neutral 'ללא סוכנות' when the user has no workspace", () => {
    const d = getPaymentStatusDescriptor({
      subscriptionStatus: null,
      workspaceSuspendedAt: null,
      hasWorkspace: false,
    });
    expect(d.label).toBe("ללא סוכנות");
    expect(d.tone).toBe("neutral");
  });

  it("treats an admin-suspended workspace as red 'מושעית' even if status=active", () => {
    const d = getPaymentStatusDescriptor({
      subscriptionStatus: "active",
      workspaceSuspendedAt: new Date(),
      hasWorkspace: true,
    });
    expect(d.label).toBe("מושעית");
    expect(d.tone).toBe("red");
  });

  it("returns green 'שולם' for active subscriptions", () => {
    const d = getPaymentStatusDescriptor({
      subscriptionStatus: "active",
      workspaceSuspendedAt: null,
      hasWorkspace: true,
    });
    expect(d.label).toBe("שולם");
    expect(d.tone).toBe("green");
  });

  it("returns amber 'ממתין לתשלום' for pending_payment", () => {
    const d = getPaymentStatusDescriptor({
      subscriptionStatus: "pending_payment",
      workspaceSuspendedAt: null,
      hasWorkspace: true,
    });
    expect(d.label).toBe("ממתין לתשלום");
    expect(d.tone).toBe("amber");
  });

  it("returns amber 'ממתין לתשלום' when subscriptionStatus is null but workspace exists", () => {
    const d = getPaymentStatusDescriptor({
      subscriptionStatus: null,
      workspaceSuspendedAt: null,
      hasWorkspace: true,
    });
    expect(d.label).toBe("ממתין לתשלום");
    expect(d.tone).toBe("amber");
  });

  it("returns red 'פג תוקף' for past_due", () => {
    const d = getPaymentStatusDescriptor({
      subscriptionStatus: "past_due",
      workspaceSuspendedAt: null,
      hasWorkspace: true,
    });
    expect(d.label).toBe("פג תוקף");
    expect(d.tone).toBe("red");
  });

  it("returns red 'בוטל' for cancelled", () => {
    const d = getPaymentStatusDescriptor({
      subscriptionStatus: "cancelled",
      workspaceSuspendedAt: null,
      hasWorkspace: true,
    });
    expect(d.label).toBe("בוטל");
    expect(d.tone).toBe("red");
  });

  it("returns red 'מושעית' for status=suspended even without workspaceSuspendedAt", () => {
    const d = getPaymentStatusDescriptor({
      subscriptionStatus: "suspended",
      workspaceSuspendedAt: null,
      hasWorkspace: true,
    });
    expect(d.label).toBe("מושעית");
    expect(d.tone).toBe("red");
  });

  it("falls back to amber for unknown future statuses", () => {
    const d = getPaymentStatusDescriptor({
      subscriptionStatus: "trial" as unknown as string,
      workspaceSuspendedAt: null,
      hasWorkspace: true,
    });
    expect(d.label).toBe("trial");
    expect(d.tone).toBe("amber");
  });
});
