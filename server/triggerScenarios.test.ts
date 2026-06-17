import { describe, it, expect } from "vitest";
import {
  TRIGGER_SCENARIOS,
  mergeOutcomeWithAnalysis,
  type TriggerKey,
} from "../client/src/lib/triggerScenarios";
import { FLOWCHART_DATA } from "../client/src/components/InteractiveFlowchart";

const TRIGGER_KEYS: TriggerKey[] = [
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
];

describe("triggerScenarios registry", () => {
  it("contains exactly 16 distinct scenarios", () => {
    expect(Object.keys(TRIGGER_SCENARIOS).sort()).toEqual([...TRIGGER_KEYS].sort());
  });

  it.each(TRIGGER_KEYS)("%s has all required content fields", (key) => {
    const s = TRIGGER_SCENARIOS[key];
    expect(s.triggerKey).toBe(key);
    expect(s.title.length).toBeGreaterThan(5);
    expect(s.pain.length).toBeGreaterThan(10);
    expect(s.trigger.length).toBeGreaterThan(5);
    expect(s.exampleCustomer.name.length).toBeGreaterThan(0);
    expect(s.exampleCustomer.flag.length).toBeGreaterThan(0);
    expect(s.exampleCustomer.channel.length).toBeGreaterThan(0);
    expect(s.outcome).toHaveLength(3);
    expect(["P0", "P1", "P2", "P3", "P4"]).toContain(s.priority);
    // Each scenario must reference a flowchart; the set of keys grew with the
    // 16-trigger model, so assert presence rather than a brittle fixed list.
    expect(typeof s.flowchartKey).toBe("string");
    expect(s.flowchartKey.length).toBeGreaterThan(0);
  });

  // Regression guard: every trigger's flowchartKey must resolve to a real
  // flowchart with nodes. Otherwise CategoryScenarioModal renders a blank modal
  // (the bug that hid the explainer for 9 of the 16 production triggers).
  it.each(TRIGGER_KEYS)("%s resolves to a flowchart with nodes", (key) => {
    const fc = FLOWCHART_DATA[TRIGGER_SCENARIOS[key].flowchartKey];
    expect(fc, `flowchart "${TRIGGER_SCENARIOS[key].flowchartKey}" is missing`).toBeTruthy();
    expect(fc.nodes.length).toBeGreaterThan(0);
  });

  it("titles are unique across all 16 scenarios", () => {
    const titles = TRIGGER_KEYS.map((k) => TRIGGER_SCENARIOS[k].title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe("mergeOutcomeWithAnalysis", () => {
  it("injects the live count into the first outcome slot when it was a placeholder", () => {
    const scenario = TRIGGER_SCENARIOS.savingsNoInsurance;
    const merged = mergeOutcomeWithAnalysis(scenario, null, 47);
    expect(merged[0].value).toBe("47");
  });

  it("does not overwrite the second/third outcome metrics", () => {
    const scenario = TRIGGER_SCENARIOS.vipGoldPremium;
    const merged = mergeOutcomeWithAnalysis(scenario, null, 999);
    // [0] is the placeholder slot — it gets the live count
    expect(merged[0].value).toBe("999");
    // [1] and [2] are static narrative metrics — never touched
    expect(merged[1].value).toBe(scenario.outcome[1].value);
    expect(merged[2].value).toBe(scenario.outcome[2].value);
  });

  it("falls back to LLM kpis when count is not provided", () => {
    const scenario = TRIGGER_SCENARIOS.riskTemporary;
    const merged = mergeOutcomeWithAnalysis(scenario, { kpis: { risk_zmani: 31 } }, undefined);
    expect(merged[0].value).toBe("31");
  });

  it("returns a defensive copy (does not mutate the registry)", () => {
    const scenario = TRIGGER_SCENARIOS.poaExpired;
    const before = scenario.outcome.map((m) => ({ ...m }));
    mergeOutcomeWithAnalysis(scenario, null, 12);
    expect(scenario.outcome).toEqual(before);
  });
});
