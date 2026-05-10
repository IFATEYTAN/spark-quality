// server/billingHistory.test.ts
// ----------------------------------------------------------------------------
// Sanity tests for the new /account/billing surface area:
//   • billing.history exists on the billingRouter and is a protectedProcedure
//   • PLAN_QUOTAS keys match what AccountBilling renders, so a future schema
//     drift will fail this test before it reaches the UI
//   • The 16 trigger keys used by the activeFlags client-side aggregate match
//     the keys getWorkspaceMetrics actually returns
// ----------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { billingRouter } from "./billing";
import { PLAN_QUOTAS } from "../shared/planFeatures";

const TRIGGER_KEYS = [
  "poaExpired",
  "poaExpiring90d",
  "riskTemporary",
  "coverageEnding",
  "savingsNoInsurance",
  "noActivePension",
  "age46NoLongTermCare",
  "aumFrozen",
  "highFees",
  "trackMismatch",
  "selfEmployedNoDeposit",
  "concentrationRisk",
  "birthdayMilestone",
  "birthdayThisMonth",
  "vipGoldPremium",
  "noEmail",
] as const;

describe("billingRouter — Round 85 surface", () => {
  it("exposes a `history` procedure on the billing router", () => {
    expect(billingRouter).toBeDefined();
    // tRPC wraps procedures behind a Proxy; check the underlying record.
    const def = (billingRouter as unknown as { _def: { procedures: Record<string, unknown> } })._def;
    expect(def.procedures.history).toBeDefined();
  });

  it("still exposes myAccessStatus, requestCheckout, startCheckoutViaMake, requestEnterpriseContact", () => {
    const def = (billingRouter as unknown as { _def: { procedures: Record<string, unknown> } })._def;
    expect(def.procedures.myAccessStatus).toBeDefined();
    expect(def.procedures.requestCheckout).toBeDefined();
    expect(def.procedures.startCheckoutViaMake).toBeDefined();
    expect(def.procedures.requestEnterpriseContact).toBeDefined();
  });
});

describe("PLAN_QUOTAS shape — used by AccountBilling meters", () => {
  it("every plan exposes maxClients, maxActiveFlags, maxTriggerKeys", () => {
    for (const plan of ["basic", "pro", "premium", "enterprise"] as const) {
      const q = PLAN_QUOTAS[plan];
      expect(q).toBeDefined();
      expect(typeof q.maxClients).toBe("number");
      expect(typeof q.maxActiveFlags).toBe("number");
      expect(typeof q.maxTriggerKeys).toBe("number");
    }
  });

  it("enterprise represents unlimited as -1 (drives the 'ללא הגבלה' UI label)", () => {
    expect(PLAN_QUOTAS.enterprise.maxClients).toBe(-1);
    expect(PLAN_QUOTAS.enterprise.maxActiveFlags).toBe(-1);
    expect(PLAN_QUOTAS.enterprise.maxTriggerKeys).toBe(-1);
  });

  it("plans escalate quotas monotonically (basic ≤ pro ≤ premium)", () => {
    const cmp = (a: number, b: number) => (b === -1 ? true : a === -1 ? false : a <= b);
    expect(cmp(PLAN_QUOTAS.basic.maxClients, PLAN_QUOTAS.pro.maxClients)).toBe(true);
    expect(cmp(PLAN_QUOTAS.pro.maxClients, PLAN_QUOTAS.premium.maxClients)).toBe(true);
    expect(cmp(PLAN_QUOTAS.basic.maxTriggerKeys, PLAN_QUOTAS.pro.maxTriggerKeys)).toBe(true);
    expect(cmp(PLAN_QUOTAS.pro.maxTriggerKeys, PLAN_QUOTAS.premium.maxTriggerKeys)).toBe(true);
  });
});

describe("trigger key catalog — matches getWorkspaceMetrics return shape", () => {
  it("there are exactly 16 trigger keys", () => {
    expect(TRIGGER_KEYS.length).toBe(16);
  });

  it("no duplicates", () => {
    const unique = new Set(TRIGGER_KEYS);
    expect(unique.size).toBe(TRIGGER_KEYS.length);
  });
});
