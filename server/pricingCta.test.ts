import { describe, expect, it } from "vitest";
import { decidePricingCta } from "../shared/pricingCta";

describe("decidePricingCta — Round 115 (status-aware CTA on /pricing)", () => {
  it("anonymous visitor sees 'הצטרפו' and is routed to OAuth signup", () => {
    const result = decidePricingCta({
      isAuthenticated: false,
      workspaceId: null,
      accessStatus: null,
      currentPlan: null,
      planName: "SPARK Quality",
    });
    expect(result).toEqual({
      label: "הצטרפו ל-SPARK Quality",
      disabled: false,
      action: "signup",
    });
  });

  it("authenticated user with no workspace is sent to onboarding", () => {
    const result = decidePricingCta({
      isAuthenticated: true,
      workspaceId: null,
      accessStatus: null,
      currentPlan: null,
      planName: "SPARK Quality",
    });
    expect(result.action).toBe("onboarding");
    expect(result.label).toBe("הצטרפו ל-SPARK Quality");
    expect(result.disabled).toBe(false);
  });

  it("support@leandolini bug — pending_payment workspace must NOT be marked active", () => {
    // Exactly the scenario reported by the user.
    const result = decidePricingCta({
      isAuthenticated: true,
      workspaceId: 360001,
      accessStatus: "blocked", // pending_payment → blocked
      currentPlan: "basic",
      planName: "SPARK Quality",
    });
    expect(result.label).toBe("הסדרת תשלום");
    // Round 117 — action moved from "billing" (static screen) to "checkout" (direct iCount).
    expect(result.action).toBe("checkout");
    expect(result.disabled).toBe(false);
  });

  it("workspace with active subscription shows 'התוכנית שלכם פעילה' and is disabled", () => {
    const result = decidePricingCta({
      isAuthenticated: true,
      workspaceId: 1,
      accessStatus: "active",
      currentPlan: "premium",
      planName: "SPARK Quality",
    });
    expect(result.label).toBe("התוכנית שלכם פעילה");
    expect(result.action).toBe("noop");
    expect(result.disabled).toBe(true);
  });

  it("grace period also counts as 'פעילה' (don't ask paying customers to pay again mid-grace)", () => {
    const result = decidePricingCta({
      isAuthenticated: true,
      workspaceId: 1,
      accessStatus: "grace",
      currentPlan: "basic",
      planName: "SPARK Quality",
    });
    expect(result.label).toBe("התוכנית שלכם פעילה");
    expect(result.action).toBe("noop");
    expect(result.disabled).toBe(true);
  });

  it("cancelled subscription is sent to checkout to renew (Round 117)", () => {
    const result = decidePricingCta({
      isAuthenticated: true,
      workspaceId: 1,
      accessStatus: "cancelled",
      currentPlan: "basic",
      planName: "SPARK Quality",
    });
    expect(result.action).toBe("checkout");
    expect(result.label).toBe("הסדרת תשלום");
  });
});
