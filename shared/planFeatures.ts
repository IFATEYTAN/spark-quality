// shared/planFeatures.ts
// ----------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH for what every subscription plan can do.
//
// This file is read by BOTH the React client (Pricing page, UpgradeModal,
// useFeatureGate hook) AND the tRPC server (requireFeature helper, downgrade
// blocker). When a plan's capabilities change, edit ONLY this file — the
// comparison table on /pricing, the FORBIDDEN errors, and the upgrade modal
// will all stay in sync.
//
// Design rules:
//   • Plans are an ordered hierarchy: basic < pro < premium < enterprise.
//     A higher plan strictly contains every feature of the plan below it,
//     except where explicitly overridden.
//   • Every gated capability has a key (e.g. "ai.composer") and a minimum plan.
//   • Quotas (max clients, max active flags) are part of the plan, not part
//     of the feature key — they are enforced at insertion/activation time.
//   • -1 means "unlimited" for any numeric quota.
// ----------------------------------------------------------------------------

export const PLAN_KEYS = ["basic", "pro", "premium", "enterprise"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

/** Strictly increasing rank — used by `planAtLeast` and `requireFeature`. */
export const PLAN_RANK: Readonly<Record<PlanKey, number>> = {
  basic: 0,
  pro: 1,
  premium: 2,
  enterprise: 3,
};

export const PLAN_LABEL: Readonly<Record<PlanKey, string>> = {
  basic: "Base",
  pro: "Pro",
  premium: "Premium",
  enterprise: "Enterprise",
};

/**
 * Every capability that requires a plan check. The string is intentionally
 * namespaced (e.g. "trigger.p0", "ai.composer") so callers can read intent
 * at the call site.
 */
export type FeatureKey =
  // Trigger access — by priority bucket
  | "trigger.p0" // ייפוי כוח
  | "trigger.p1" // ריסק זמני
  | "trigger.p2" // פנסיה / ביטוח / סיעוד / AUM
  | "trigger.p3" // דמי ניהול / מסלול / עצמאים
  | "trigger.p4" // ימי הולדת / VIP / ללא מייל
  // AI capabilities
  | "ai.composer" // הודעות מוכנות לשליחה
  | "ai.dailyTasks" // רשימת משימות יומית
  | "ai.smartQA" // Q&A על הדוח
  | "ai.briefing" // תדריך AI
  // Operations
  | "ops.exportFull" // ייצוא נתונים מלא
  | "ops.automations" // אוטומציות שליחה (WhatsApp / Email)
  | "ops.weeklyReport" // דוח שבועי
  | "ops.dailyReport" // דוח יומי
  // Support tier
  | "support.email"
  | "support.whatsapp"
  | "support.vip";

/** Minimum plan required for each capability. */
export const FEATURE_MIN_PLAN: Readonly<Record<FeatureKey, PlanKey>> = {
  // Triggers
  "trigger.p0": "pro",
  "trigger.p1": "basic",
  "trigger.p2": "basic", // basic gets a small subset; pro gets full
  "trigger.p3": "basic", // same — handled by quota count, not by key
  "trigger.p4": "premium",
  // AI
  "ai.composer": "pro",
  "ai.dailyTasks": "premium",
  "ai.smartQA": "premium",
  "ai.briefing": "pro",
  // Operations
  "ops.exportFull": "premium",
  "ops.automations": "premium",
  "ops.weeklyReport": "pro",
  "ops.dailyReport": "premium",
  // Support
  "support.email": "basic",
  "support.whatsapp": "pro",
  "support.vip": "premium",
};

/** Quotas — per-plan numeric limits. -1 = unlimited. */
export interface PlanQuotas {
  /** Maximum number of clients in the workspace. */
  maxClients: number;
  /** Maximum number of simultaneously active flags / triggers. */
  maxActiveFlags: number;
  /** Cap on how many distinct triggers (out of 16) can be enabled. */
  maxTriggerKeys: number;
}

export const PLAN_QUOTAS: Readonly<Record<PlanKey, PlanQuotas>> = {
  basic: { maxClients: 300, maxActiveFlags: 50, maxTriggerKeys: 3 },
  pro: { maxClients: 1000, maxActiveFlags: 200, maxTriggerKeys: 10 },
  premium: { maxClients: -1, maxActiveFlags: -1, maxTriggerKeys: 16 },
  enterprise: { maxClients: -1, maxActiveFlags: -1, maxTriggerKeys: 16 },
};

// ----------------------------------------------------------------------------
// Helpers — pure functions, safe to call from both client and server.
// ----------------------------------------------------------------------------

/** True when `actualPlan` is at least `requiredPlan` in rank. */
export function planAtLeast(actualPlan: PlanKey, requiredPlan: PlanKey): boolean {
  return PLAN_RANK[actualPlan] >= PLAN_RANK[requiredPlan];
}

/** True when the given plan grants access to the given feature. */
export function planAllowsFeature(plan: PlanKey, feature: FeatureKey): boolean {
  return planAtLeast(plan, FEATURE_MIN_PLAN[feature]);
}

/**
 * Returns whether downgrading from `currentPlan` to `targetPlan` is safe given
 * the user's current usage. Used to BLOCK downgrades that would leave the
 * workspace over-quota (decision: blocking, not freezing).
 */
export interface DowngradeUsage {
  clientCount: number;
  activeFlagCount: number;
  enabledTriggerCount: number;
}

export interface DowngradeCheckResult {
  ok: boolean;
  /** Specific reasons the downgrade is rejected, in Hebrew. */
  reasons: string[];
}

export function canDowngradeTo(
  currentPlan: PlanKey,
  targetPlan: PlanKey,
  usage: DowngradeUsage,
): DowngradeCheckResult {
  // No-op or upgrade — always allowed.
  if (PLAN_RANK[targetPlan] >= PLAN_RANK[currentPlan]) {
    return { ok: true, reasons: [] };
  }

  const target = PLAN_QUOTAS[targetPlan];
  const reasons: string[] = [];

  if (target.maxClients !== -1 && usage.clientCount > target.maxClients) {
    reasons.push(
      `בתיק שלכם ${usage.clientCount.toLocaleString("he-IL")} לקוחות, אך תוכנית ${PLAN_LABEL[targetPlan]} מוגבלת ל-${target.maxClients.toLocaleString("he-IL")}.`,
    );
  }
  if (target.maxActiveFlags !== -1 && usage.activeFlagCount > target.maxActiveFlags) {
    reasons.push(
      `יש לכם ${usage.activeFlagCount.toLocaleString("he-IL")} דגלים פעילים, אך תוכנית ${PLAN_LABEL[targetPlan]} מוגבלת ל-${target.maxActiveFlags.toLocaleString("he-IL")}.`,
    );
  }
  if (target.maxTriggerKeys !== -1 && usage.enabledTriggerCount > target.maxTriggerKeys) {
    reasons.push(
      `הופעלו ${usage.enabledTriggerCount} טריגרים, אך תוכנית ${PLAN_LABEL[targetPlan]} מאפשרת ${target.maxTriggerKeys}.`,
    );
  }

  return { ok: reasons.length === 0, reasons };
}

/**
 * Returns the LOWEST plan that allows the given feature. Used by the upgrade
 * modal to suggest the cheapest path forward.
 */
export function minPlanFor(feature: FeatureKey): PlanKey {
  return FEATURE_MIN_PLAN[feature];
}
