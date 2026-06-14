// SPARK AI · Analytics — honest activity dashboard built only from data we
// actually collect: the activity journal, reminders, and trigger handling.
// No fabricated "response/conversion" rates we cannot measure.
import { useAuth } from "@/_core/hooks/useAuth";
import { CinematicShell, GlassCard, GoldEyebrow } from "@/components/CinematicShell";
import { trpc } from "@/lib/trpc";
import { TRIGGER_SCENARIOS, type TriggerKey } from "@/lib/triggerScenarios";
import {
  Loader2,
  BarChart3,
  Phone,
  MessageSquare,
  Mail,
  CalendarDays,
  StickyNote,
  Smartphone,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

const ACTIVITY_META: Record<string, { label: string; icon: typeof Phone }> = {
  call: { label: "שיחות", icon: Phone },
  whatsapp: { label: "וואטסאפ", icon: MessageSquare },
  email: { label: "מיילים", icon: Mail },
  meeting: { label: "פגישות", icon: CalendarDays },
  note: { label: "הערות", icon: StickyNote },
  sms: { label: "SMS", icon: Smartphone },
};

const TRIGGER_ORDER: TriggerKey[] = [
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

function fmt(n: number) {
  return n.toLocaleString("he-IL");
}

export default function Analytics() {
  const { loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/", { replace: true });
  }, [loading, isAuthenticated, navigate]);

  const overviewQuery = trpc.analytics.overview.useQuery(
    { rangeDays: 30 },
    { enabled: isAuthenticated },
  );
  const metricsQuery = trpc.workspaces.metrics.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const handledQuery = trpc.triggers.handledCounts.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const overview = overviewQuery.data;
  const metrics = (metricsQuery.data ?? {}) as Record<string, number>;
  const handled = (handledQuery.data ?? {}) as Record<string, number>;

  const activityMax = Math.max(
    1,
    ...Object.values(overview?.activities.byType ?? {}).map((n) => Number(n)),
  );

  const triggerRows = TRIGGER_ORDER.map((key) => ({
    key,
    label: TRIGGER_SCENARIOS[key]?.title ?? key,
    total: metrics[key] ?? 0,
    handled: handled[key] ?? 0,
  })).filter((r) => r.total > 0 || r.handled > 0);

  const isLoading = overviewQuery.isLoading || metricsQuery.isLoading;

  return (
    <CinematicShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <GoldEyebrow>SPARK QUALITY · מדידה</GoldEyebrow>
        <h1 className="font-display text-2xl lg:text-3xl font-black text-white tracking-tight mt-2 flex items-center gap-3">
          <BarChart3 className="h-7 w-7 text-gold" />
          אנליטיקה
        </h1>
        <p className="mt-2 text-sm text-white/65">
          הפעילות שלך ב-30 הימים האחרונים, וטיפול בטריגרים — מנתוני האמת שנאספים ביומן.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-white/50">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-7">
              <GlassCard className="p-5">
                <div className="text-[11px] text-white/45 mb-1">פעולות (30 ימים)</div>
                <div className="mono-num text-3xl font-black text-white">
                  {fmt(overview?.activities.total ?? 0)}
                </div>
              </GlassCard>
              <GlassCard className="p-5">
                <div className="text-[11px] text-white/45 mb-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> תזכורות פתוחות
                </div>
                <div className="mono-num text-3xl font-black text-gold">
                  {fmt(overview?.reminders.pending ?? 0)}
                </div>
              </GlassCard>
              <GlassCard className="p-5">
                <div className="text-[11px] text-white/45 mb-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> תזכורות שטופלו
                </div>
                <div className="mono-num text-3xl font-black text-emerald-300">
                  {fmt(overview?.reminders.fired ?? 0)}
                </div>
              </GlassCard>
              <GlassCard className="p-5">
                <div className="text-[11px] text-white/45 mb-1">טריגרים שטופלו</div>
                <div className="mono-num text-3xl font-black text-white">
                  {fmt(Object.values(handled).reduce((s, n) => s + Number(n), 0))}
                </div>
              </GlassCard>
            </div>

            {/* Activity by type */}
            <h2 className="font-display text-lg font-bold text-white mt-9 mb-3">
              פעילות לפי ערוץ
            </h2>
            <GlassCard className="p-5">
              {overview && overview.activities.total > 0 ? (
                <div className="space-y-3">
                  {Object.entries(ACTIVITY_META).map(([key, meta]) => {
                    const count = Number(overview.activities.byType[key] ?? 0);
                    const Icon = meta.icon;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <div className="flex items-center gap-2 w-28 shrink-0 text-sm text-white/75">
                          <Icon className="h-4 w-4 text-gold/80" />
                          {meta.label}
                        </div>
                        <div className="flex-1 h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-l from-gold to-[#B89346]"
                            style={{ width: `${(count / activityMax) * 100}%` }}
                          />
                        </div>
                        <div className="mono-num text-sm font-bold text-white w-12 text-left">
                          {fmt(count)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-white/50 text-center py-6">
                  עדיין אין פעילות מתועדת. פעולות שתבצע מכרטיס הלקוח יופיעו כאן.
                </p>
              )}
            </GlassCard>

            {/* Triggers handled */}
            <h2 className="font-display text-lg font-bold text-white mt-9 mb-3">
              טיפול בטריגרים
            </h2>
            <GlassCard className="p-5">
              {triggerRows.length > 0 ? (
                <div className="space-y-3">
                  {triggerRows.map((r) => {
                    const pct = r.total > 0 ? Math.min(100, Math.round((r.handled / r.total) * 100)) : 0;
                    return (
                      <div key={r.key} className="flex items-center gap-3">
                        <div className="w-44 shrink-0 text-sm text-white/75 truncate" title={r.label}>
                          {r.label}
                        </div>
                        <div className="flex-1 h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-emerald-600"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="mono-num text-xs text-white/70 w-24 text-left whitespace-nowrap">
                          {fmt(r.handled)} / {fmt(r.total)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-white/50 text-center py-6">
                  אין עדיין טריגרים פעילים. העלה דוח כדי להתחיל.
                </p>
              )}
            </GlassCard>
          </>
        )}
      </div>
    </CinematicShell>
  );
}
