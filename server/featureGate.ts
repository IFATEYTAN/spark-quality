// server/featureGate.ts
// ----------------------------------------------------------------------------
// Server-side enforcement of `shared/planFeatures.ts`.
//
// requireFeature(ctx, "ai.composer") loads the workspace's current plan and
// throws a structured TRPCError({ code: "FORBIDDEN" }) if the plan doesn't
// include that feature. The error's `data` payload carries `feature` and
// `requiredPlan` so the React client can pop the UpgradeModal automatically.
// ----------------------------------------------------------------------------
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import {
  FEATURE_MIN_PLAN,
  PLAN_LABEL,
  planAllowsFeature,
  type FeatureKey,
  type PlanKey,
} from "../shared/planFeatures";
import { workspaces } from "../drizzle/schema";
import {
  PLAN_QUOTAS,
  canDowngradeTo,
  type DowngradeUsage,
} from "../shared/planFeatures";
import { countClientsInWorkspace, getDb } from "./db";

/** Narrow the workspace.plan column to a real PlanKey, mapping legacy values. */
export function normalizeWorkspacePlan(raw: string | null | undefined): PlanKey {
  if (raw === "basic" || raw === "pro" || raw === "premium" || raw === "enterprise") {
    return raw;
  }
  // Round 33 removed "trial" — we map any legacy/missing value to basic so the
  // strictest gate applies. Premium/enterprise upgrades happen via callbacks.
  return "basic";
}

/** Tiny ctx shape — kept generic so this works with any protectedProcedure ctx. */
type GateCtx = {
  user: { id: number | string; workspaceId: number | null } | null;
};

/**
 * Loads the current plan for the user's workspace. Returns "basic" as the
 * defensive default when no workspace is attached (which means the user is
 * still in onboarding and shouldn't be hitting gated procedures anyway).
 */
export async function getWorkspacePlan(ctx: GateCtx): Promise<PlanKey> {
  const wsId = ctx.user?.workspaceId;
  if (!wsId) return "basic";

  const d = await getDb();
  if (!d) return "basic";

  const rows = await d
    .select({ plan: workspaces.plan })
    .from(workspaces)
    .where(eq(workspaces.id, wsId))
    .limit(1);

  return normalizeWorkspacePlan(rows[0]?.plan);
}

/**
 * Throws TRPCError FORBIDDEN if the workspace's plan does not include the
 * requested feature. The error's `data` payload is consumed by the React
 * client (UpgradeModal) — keep the keys stable.
 */
export async function requireFeature(
  ctx: GateCtx,
  feature: FeatureKey,
): Promise<PlanKey> {
  const plan = await getWorkspacePlan(ctx);
  if (planAllowsFeature(plan, feature)) return plan;

  const requiredPlan = FEATURE_MIN_PLAN[feature];
  throw new TRPCError({
    code: "FORBIDDEN",
    message: `פיצ'ר זה דורש שדרוג לתוכנית ${PLAN_LABEL[requiredPlan]}.`,
    cause: {
      kind: "feature_gate",
      feature,
      currentPlan: plan,
      requiredPlan,
    },
  });
}

/**
 * Throws TRPCError FORBIDDEN with a Hebrew message if creating one more
 * client would exceed the workspace's plan quota. -1 (unlimited) is allowed.
 */
export async function requireClientQuota(ctx: GateCtx): Promise<void> {
  const wsId = ctx.user?.workspaceId;
  if (!wsId) return; // protectedProcedure path will already reject earlier.
  const plan = await getWorkspacePlan(ctx);
  const limit = PLAN_QUOTAS[plan].maxClients;
  if (limit === -1) return;
  const current = await countClientsInWorkspace(wsId);
  if (current < limit) return;
  throw new TRPCError({
    code: "FORBIDDEN",
    message: `הגעתם למכסת ${limit.toLocaleString("he-IL")} לקוחות בתוכנית ${PLAN_LABEL[plan]}. שדרגו כדי להוסיף לקוחות נוספים.`,
    cause: {
      kind: "quota_clients",
      currentPlan: plan,
      limit,
      current,
    },
  });
}

/**
 * Throws TRPCError BAD_REQUEST listing the specific reasons a downgrade is
 * blocked by current usage. Returns silently when the downgrade is safe.
 */
export function assertDowngradeAllowed(
  currentPlan: PlanKey,
  targetPlan: PlanKey,
  usage: DowngradeUsage,
): void {
  const result = canDowngradeTo(currentPlan, targetPlan, usage);
  if (result.ok) return;
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: `לא ניתן להוריד תוכנית ל-${PLAN_LABEL[targetPlan]}: ${result.reasons.join(" ")}`,
    cause: {
      kind: "downgrade_blocked",
      currentPlan,
      targetPlan,
      reasons: result.reasons,
    },
  });
}
