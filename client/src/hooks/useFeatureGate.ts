// client/src/hooks/useFeatureGate.ts
// ----------------------------------------------------------------------------
// Front-end half of the plan gating system. Reads the current workspace plan
// from `trpc.billing.myAccessStatus`, then resolves whether a given FeatureKey
// is allowed. Returns a `prompt()` callback that opens the UpgradeModal.
//
// Usage:
//   const composer = useFeatureGate("ai.composer");
//   <Button onClick={() => composer.allowed ? doThing() : composer.prompt()} />
//   <UpgradeModal {...composer.modalProps} />
// ----------------------------------------------------------------------------
import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  FEATURE_MIN_PLAN,
  PLAN_LABEL,
  planAllowsFeature,
  type FeatureKey,
  type PlanKey,
} from "@shared/planFeatures";

function normalize(raw: string | null | undefined): PlanKey {
  if (raw === "basic" || raw === "pro" || raw === "premium" || raw === "enterprise") {
    return raw;
  }
  return "basic";
}

export interface FeatureGateResult {
  /** The user's current plan (defaults to "basic" while loading or unauthenticated). */
  currentPlan: PlanKey;
  /** True when the current plan satisfies the feature's minimum plan. */
  allowed: boolean;
  /** Lowest plan that grants this feature. */
  requiredPlan: PlanKey;
  /** Open the UpgradeModal. */
  prompt: () => void;
  /** Spread onto <UpgradeModal /> to render the modal. */
  modalProps: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    feature: string;
    requiredPlan: Exclude<PlanKey, "enterprise">;
    description?: string;
  };
}

const FEATURE_LABELS: Partial<Record<FeatureKey, string>> = {
  "ai.composer": "כתיבת הודעות AI",
  "ai.briefing": "תדריך AI יומי",
  "ai.dailyTasks": "רשימת משימות יומית",
  "ai.smartQA": "שאלות חכמות (Smart Q&A)",
  "ops.exportFull": "ייצוא נתונים מלא",
  "ops.automations": "אוטומציות שליחה",
  "ops.weeklyReport": "דוח שבועי",
  "ops.dailyReport": "דוח יומי",
  "trigger.p0": "טריגרי P0 — ייפוי כוח",
  "trigger.p4": "טריגרי P4 — ימי הולדת ו-VIP",
};

export function useFeatureGate(feature: FeatureKey): FeatureGateResult {
  // CRITICAL: billing.myAccessStatus is a protectedProcedure. If it runs for
  // an anonymous visitor (e.g., during the public /demo flow that mounts
  // ActionsStage → useFeatureGate), the server throws UNAUTHED_ERR_MSG, and
  // the global error interceptor in main.tsx forwards the page to /app-auth.
  // Gate the query on isAuthenticated so anonymous visitors stay on /demo.
  const { isAuthenticated } = useAuth();
  const { data } = trpc.billing.myAccessStatus.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
  const [open, setOpen] = useState(false);

  const currentPlan = useMemo(
    () => normalize(data?.plan as string | undefined),
    [data?.plan],
  );
  const requiredPlan = FEATURE_MIN_PLAN[feature];
  const allowed = planAllowsFeature(currentPlan, feature);

  const prompt = useCallback(() => {
    if (allowed) return;
    setOpen(true);
  }, [allowed]);

  // UpgradeModal currently doesn't render an "enterprise" tier (it points to
  // /pricing where the contact-card lives instead). Map enterprise → premium
  // for the modal copy; the user is sent to /pricing where they can pick the
  // enterprise card.
  const modalRequired: Exclude<PlanKey, "enterprise"> =
    requiredPlan === "enterprise" ? "premium" : (requiredPlan as Exclude<PlanKey, "enterprise">);

  return {
    currentPlan,
    allowed,
    requiredPlan,
    prompt,
    modalProps: {
      open,
      onOpenChange: setOpen,
      feature: FEATURE_LABELS[feature] ?? feature,
      requiredPlan: modalRequired,
      description: `הפיצ'ר "${FEATURE_LABELS[feature] ?? feature}" זמין רק בתוכנית ${PLAN_LABEL[requiredPlan]} ומעלה. שדרגו כדי להפעיל אותו.`,
    },
  };
}
