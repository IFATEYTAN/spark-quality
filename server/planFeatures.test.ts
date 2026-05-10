// server/planFeatures.test.ts
// ----------------------------------------------------------------------------
// SPARK Quality moved to a single-tier model (Round 97). All four plan keys
// still exist for backwards compatibility with the billing pipeline + invoice
// history, but every feature is unlocked on every key, every quota is
// unlimited (-1), and `canDowngradeTo` always returns ok. This test pins that
// contract so we cannot accidentally re-introduce gating.
// ----------------------------------------------------------------------------
import { describe, it, expect } from "vitest";
import {
  PLAN_KEYS,
  PLAN_RANK,
  PLAN_QUOTAS,
  FEATURE_MIN_PLAN,
  planAllowsFeature,
  planAtLeast,
  canDowngradeTo,
  type FeatureKey,
  type PlanKey,
} from "../shared/planFeatures";

describe("plan features matrix (single-tier mode)", () => {
  it("declares all four legacy plan keys for backwards compatibility", () => {
    expect(PLAN_KEYS).toEqual(["basic", "pro", "premium", "enterprise"]);
    expect(PLAN_RANK.basic).toBeLessThanOrEqual(PLAN_RANK.pro);
    expect(PLAN_RANK.pro).toBeLessThanOrEqual(PLAN_RANK.premium);
    expect(PLAN_RANK.premium).toBeLessThanOrEqual(PLAN_RANK.enterprise);
  });

  it("every gated feature points to a real plan", () => {
    for (const [feat, plan] of Object.entries(FEATURE_MIN_PLAN)) {
      expect(PLAN_KEYS, `${feat} → ${plan}`).toContain(plan);
    }
  });

  it("every feature is unlocked on every plan (single-tier guarantee)", () => {
    for (const feat of Object.keys(FEATURE_MIN_PLAN) as FeatureKey[]) {
      for (const plan of PLAN_KEYS) {
        expect(planAllowsFeature(plan, feat), `${plan} should allow ${feat}`).toBe(true);
      }
    }
  });

  it("all client quotas are unlimited (-1)", () => {
    for (const plan of PLAN_KEYS) {
      expect(PLAN_QUOTAS[plan].maxClients, `${plan}.maxClients`).toBe(-1);
    }
  });

  it("planAtLeast respects the rank hierarchy", () => {
    expect(planAtLeast("premium", "basic")).toBe(true);
    expect(planAtLeast("basic", "basic")).toBe(true);
    expect(planAtLeast("enterprise", "premium")).toBe(true);
  });
});

describe("canDowngradeTo (single-tier mode)", () => {
  const heavyUsage = { clientCount: 10_000, activeFlagCount: 9_000, enabledTriggerCount: 16 };

  it("allows every transition regardless of usage", () => {
    for (const from of PLAN_KEYS) {
      for (const to of PLAN_KEYS) {
        const r = canDowngradeTo(from as PlanKey, to as PlanKey, heavyUsage);
        expect(r.ok, `${from} → ${to}`).toBe(true);
      }
    }
  });
});
