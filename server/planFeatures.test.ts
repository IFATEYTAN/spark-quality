// server/planFeatures.test.ts
// ----------------------------------------------------------------------------
// Validates the contract of the shared plan-features matrix. The matrix is
// imported by both client and server, so any drift here means broken gates in
// production. We verify:
//  1. Every feature key in FEATURE_MIN_PLAN points to a real plan
//  2. Plan ordering is monotonic by capability (basic ⊆ pro ⊆ premium ⊆ ent.)
//  3. Quotas are sane (basic < pro < premium ≤ enterprise)
//  4. canDowngradeTo correctly rejects over-quota downgrades and allows safe ones
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
  minPlanFor,
  type FeatureKey,
  type PlanKey,
} from "../shared/planFeatures";

describe("plan features matrix", () => {
  it("declares all four plan keys in increasing rank", () => {
    expect(PLAN_KEYS).toEqual(["basic", "pro", "premium", "enterprise"]);
    expect(PLAN_RANK.basic).toBeLessThan(PLAN_RANK.pro);
    expect(PLAN_RANK.pro).toBeLessThan(PLAN_RANK.premium);
    expect(PLAN_RANK.premium).toBeLessThan(PLAN_RANK.enterprise);
  });

  it("every gated feature points to a real plan", () => {
    for (const [feat, plan] of Object.entries(FEATURE_MIN_PLAN)) {
      expect(PLAN_KEYS, `${feat} → ${plan}`).toContain(plan);
    }
  });

  it("enterprise has access to every feature", () => {
    for (const feat of Object.keys(FEATURE_MIN_PLAN) as FeatureKey[]) {
      expect(planAllowsFeature("enterprise", feat), feat).toBe(true);
    }
  });

  it("access is monotonic across plan ranks (no leaks downward)", () => {
    for (const feat of Object.keys(FEATURE_MIN_PLAN) as FeatureKey[]) {
      const allowed = (p: PlanKey) => planAllowsFeature(p, feat);
      // If basic is allowed, every plan above must be allowed.
      if (allowed("basic")) {
        expect(allowed("pro"), feat).toBe(true);
        expect(allowed("premium"), feat).toBe(true);
      }
      if (allowed("pro")) {
        expect(allowed("premium"), feat).toBe(true);
      }
    }
  });

  it("client quotas grow with the plan rank (premium is unlimited)", () => {
    expect(PLAN_QUOTAS.basic.maxClients).toBeLessThan(PLAN_QUOTAS.pro.maxClients);
    expect(PLAN_QUOTAS.premium.maxClients).toBe(-1);
    expect(PLAN_QUOTAS.enterprise.maxClients).toBe(-1);
  });

  it("AI Composer is locked to pro+ (the smoking-gun bug we fixed)", () => {
    expect(planAllowsFeature("basic", "ai.composer")).toBe(false);
    expect(planAllowsFeature("pro", "ai.composer")).toBe(true);
    expect(planAllowsFeature("premium", "ai.composer")).toBe(true);
    expect(planAllowsFeature("enterprise", "ai.composer")).toBe(true);
    expect(minPlanFor("ai.composer")).toBe("pro");
  });

  it("planAtLeast respects the rank hierarchy", () => {
    expect(planAtLeast("premium", "basic")).toBe(true);
    expect(planAtLeast("basic", "premium")).toBe(false);
    expect(planAtLeast("pro", "pro")).toBe(true);
  });
});

describe("canDowngradeTo", () => {
  const safeUsage = { clientCount: 10, activeFlagCount: 5, enabledTriggerCount: 2 };

  it("allows upgrades and same-plan transitions unconditionally", () => {
    expect(canDowngradeTo("basic", "premium", safeUsage).ok).toBe(true);
    expect(canDowngradeTo("pro", "pro", safeUsage).ok).toBe(true);
  });

  it("blocks downgrade when client count exceeds the target plan", () => {
    // 800 clients, downgrading from premium (unlimited) to basic (300)
    const result = canDowngradeTo("premium", "basic", {
      clientCount: 800,
      activeFlagCount: 5,
      enabledTriggerCount: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons[0]).toContain("800");
    expect(result.reasons[0]).toContain("Base");
  });

  it("blocks downgrade when active flags exceed the target plan", () => {
    // 80 active flags, downgrading to basic (50)
    const result = canDowngradeTo("pro", "basic", {
      clientCount: 100,
      activeFlagCount: 80,
      enabledTriggerCount: 2,
    });
    expect(result.ok).toBe(false);
    expect(result.reasons.some(r => r.includes("80"))).toBe(true);
  });

  it("blocks downgrade when too many trigger keys are enabled", () => {
    // 12 triggers enabled, downgrading premium → basic (3)
    const result = canDowngradeTo("premium", "basic", {
      clientCount: 100,
      activeFlagCount: 5,
      enabledTriggerCount: 12,
    });
    expect(result.ok).toBe(false);
    expect(result.reasons.some(r => r.includes("12"))).toBe(true);
  });

  it("allows safe downgrades when usage is under the target quotas", () => {
    const result = canDowngradeTo("premium", "basic", safeUsage);
    expect(result.ok).toBe(true);
    expect(result.reasons).toEqual([]);
  });
});
