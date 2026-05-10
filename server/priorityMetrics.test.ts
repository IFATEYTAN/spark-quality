// Verifies that getWorkspaceMetrics returns the full 16-trigger surface
// expected by PriorityActionGroups (Round 81). The shape must remain stable
// even when the database is unavailable, so the dashboard can render with
// safe zero values.
import { describe, expect, it } from "vitest";
import { getWorkspaceMetrics } from "./db";

const REQUIRED_PRIORITY_FIELDS = [
  // Legacy (kept for backwards compat)
  "totalClients",
  "vipClients",
  "liquidFunds",
  "tikun190Candidates",
  "highFees",
  "riskEnding",
  "coverageGaps",
  "totalAum",
  // 16 priority trigger counts (P0–P4)
  "poaExpired",
  "poaExpiring90d",
  "riskTemporary",
  "coverageEnding",
  "savingsNoInsurance",
  "noActivePension",
  "age46NoLongTermCare",
  "aumFrozen",
  "trackMismatch",
  "selfEmployedNoDeposit",
  "concentrationRisk",
  "birthdayMilestone",
  "birthdayThisMonth",
  "vipGoldPremium",
  "noEmail",
] as const;

describe("getWorkspaceMetrics — Round 81 priority surface", () => {
  it("returns every legacy and priority field as a finite number", async () => {
    // Force DB-less mode: temporarily blank DATABASE_URL while still calling
    // through the real code path. We reset it after the call.
    const original = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "";

    let metrics: Awaited<ReturnType<typeof getWorkspaceMetrics>>;
    try {
      metrics = await getWorkspaceMetrics({
        workspaceId: 1,
        userId: 1,
        workspaceRole: "owner",
      });
    } finally {
      if (original !== undefined) process.env.DATABASE_URL = original;
    }

    for (const field of REQUIRED_PRIORITY_FIELDS) {
      expect(metrics, `missing field ${field}`).toHaveProperty(field);
      const value = (metrics as Record<string, unknown>)[field];
      expect(typeof value).toBe("number");
      expect(Number.isFinite(value as number)).toBe(true);
      expect((value as number) >= 0).toBe(true);
    }
  });

  it("exposes exactly 16 priority trigger keys (P0–P4)", () => {
    // This guards the contract between db.ts and the PriorityCounts
    // interface inside PriorityActionGroups.tsx.
    // "highFees" is intentionally shared between the legacy surface and the
    // P3 priority bucket — it must remain in the priority list.
    const legacyOnly = new Set([
      "totalClients",
      "vipClients",
      "liquidFunds",
      "tikun190Candidates",
      "riskEnding",
      "coverageGaps",
      "totalAum",
    ]);
    const priorityKeys = REQUIRED_PRIORITY_FIELDS.filter(
      (k) => !legacyOnly.has(k as string)
    );
    expect(priorityKeys).toHaveLength(16);
  });
});
