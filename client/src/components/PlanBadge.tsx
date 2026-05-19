// client/src/components/PlanBadge.tsx
// ----------------------------------------------------------------------------
// Tiny status pill that renders next to the user profile in the sidebar
// footer. Shows the active plan label and the live "X / Y לקוחות" usage.
// Clicking it routes to /pricing for the unified billing settings page (the
// legacy /account/billing route was removed in Round 117). Falls back to a
// quiet "טוען…" pill while data is in flight, and
// hides itself entirely if both queries fail (so the layout never breaks).
// ----------------------------------------------------------------------------

import { useMemo } from "react";
import { useLocation } from "wouter";
import { CreditCard } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  PLAN_LABEL,
  PLAN_QUOTAS,
  type PlanKey,
} from "@shared/planFeatures";

interface PlanBadgeProps {
  /** When true, renders an icon-only pill (sidebar collapsed / mobile). */
  iconOnly?: boolean;
  /** Override the click target if the parent wants a different route. */
  href?: string;
}

const isPlanKey = (raw: unknown): raw is PlanKey =>
  raw === "basic" || raw === "pro" || raw === "premium" || raw === "enterprise";

export function PlanBadge({ iconOnly = false, href = "/pricing" }: PlanBadgeProps) {
  const [, navigate] = useLocation();

  // Both queries are cheap and already cached elsewhere — staleTime keeps the
  // badge from re-fetching every navigation.
  const accessQuery = trpc.billing.myAccessStatus.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const metricsQuery = trpc.workspaces.metrics.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const plan = useMemo<PlanKey | null>(() => {
    const raw = (accessQuery.data as { plan?: string } | undefined)?.plan;
    return isPlanKey(raw) ? raw : null;
  }, [accessQuery.data]);

  const usage = useMemo(() => {
    const m = metricsQuery.data as { totalClients?: number } | undefined;
    return typeof m?.totalClients === "number" ? m.totalClients : null;
  }, [metricsQuery.data]);

  // While both queries are pending, render a neutral skeleton pill so the
  // sidebar layout doesn't reflow when data arrives.
  if (accessQuery.isPending && !accessQuery.data) {
    return (
      <div
        className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] text-white/40"
        aria-busy="true"
      >
        <CreditCard className="h-3 w-3 shrink-0" />
        {!iconOnly && <span>טוען…</span>}
      </div>
    );
  }

  // Hide entirely if access query failed — better to drop the badge than
  // show a stale or wrong plan in the chrome.
  if (!plan) return null;

  const quota = PLAN_QUOTAS[plan];
  const label = PLAN_LABEL[plan];
  const usageLabel = (() => {
    if (usage === null) return null;
    if (quota.maxClients === -1) {
      return `${usage.toLocaleString("he-IL")} לקוחות`;
    }
    return `${usage.toLocaleString("he-IL")} / ${quota.maxClients.toLocaleString("he-IL")}`;
  })();

  return (
    <button
      type="button"
      onClick={() => navigate(href)}
      title={usageLabel ? `${label} · ${usageLabel}` : label}
      aria-label={`התוכנית הפעילה: ${label}${usageLabel ? `. ${usageLabel} לקוחות` : ""}. לחצו לעבור להגדרות חיוב.`}
      className="group inline-flex items-center gap-1.5 rounded-full bg-gold/10 border border-gold/30 px-2.5 py-1 text-[11px] font-medium text-gold hover:bg-gold/20 hover:border-gold/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
    >
      <CreditCard className="h-3 w-3 shrink-0" />
      {iconOnly ? null : (
        <>
          <span>{label}</span>
          {usageLabel && (
            <span className="text-gold/70 hidden md:inline">· {usageLabel}</span>
          )}
        </>
      )}
    </button>
  );
}
