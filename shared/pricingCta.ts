/**
 * Pure helper used by /pricing to decide the CTA label + action.
 *
 * Centralized so the rule "התוכנית שלכם פעילה" only shows up when the
 * subscription is actually active or in grace can be unit-tested without
 * having to render the whole React tree.
 *
 * Round 115 — fixes the bug where a workspace with plan='basic' but
 * subscriptionStatus='pending_payment' was incorrectly marked as "פעילה"
 * on /pricing while /billing said the opposite.
 */

export type AccessStatus = "active" | "grace" | "blocked" | "cancelled";

export type PricingCtaInput = {
  isAuthenticated: boolean;
  workspaceId: number | null;
  /** Server-computed access status from billing.myAccessStatus */
  accessStatus: AccessStatus | null | undefined;
  /** SPARK Quality plan key the workspace currently sits on (basic/pro/...). */
  currentPlan: string | null;
  /** Display name shown inside the button text */
  planName: string;
};

export type PricingCtaDecision = {
  label: string;
  /** UI must disable the button when this is true */
  disabled: boolean;
  /** What happens when the user clicks: where the funnel sends them */
  action: "signup" | "onboarding" | "checkout" | "noop";
};

export function decidePricingCta(input: PricingCtaInput): PricingCtaDecision {
  const hasActiveSubscription =
    input.accessStatus === "active" || input.accessStatus === "grace";

  // Authenticated user whose workspace already has an active SPARK Quality plan.
  if (
    input.isAuthenticated &&
    input.workspaceId &&
    input.currentPlan &&
    hasActiveSubscription
  ) {
    return {
      label: "התוכנית שלכם פעילה",
      disabled: true,
      action: "noop",
    };
  }

  // Authenticated user with a workspace but subscription not active —
  // they should be sent straight to the iCount checkout flow to finish
  // paying for the EXISTING subscription. Round 117: no detour through a
  // static /account/billing screen; the CTA fires billing.startCheckoutViaMake
  // directly and opens the iCount payUrl in a new tab.
  if (input.isAuthenticated && input.workspaceId && !hasActiveSubscription) {
    return {
      label: "הסדרת תשלום",
      disabled: false,
      action: "checkout",
    };
  }

  // Authenticated user without a workspace yet → onboarding to create one.
  if (input.isAuthenticated && !input.workspaceId) {
    return {
      label: `הצטרפו ל-${input.planName}`,
      disabled: false,
      action: "onboarding",
    };
  }

  // Anonymous visitor → OAuth signup.
  return {
    label: `הצטרפו ל-${input.planName}`,
    disabled: false,
    action: "signup",
  };
}
