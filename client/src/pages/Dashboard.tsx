// SPARK AI · Dashboard — בסגנון הסינמטי של הדמו
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { CinematicShell, GlassCard, GoldEyebrow } from "@/components/CinematicShell";
import { PriorityActionGroups } from "@/components/PriorityActionGroups";
import { InteractiveTriggersGrid } from "@/components/InteractiveTriggersGrid";
import { AIBriefingModal } from "@/components/AIBriefingModal";
import { AIQaModal } from "@/components/AIQaModal";
import { trpc } from "@/lib/trpc";
import {
  Building2,
  Crown,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  TrendingUp,
  Upload,
  Users,
  ArrowLeft,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

export default function Dashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [qaOpen, setQaOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    if (user && !(user as { workspaceId?: number | null }).workspaceId) {
      navigate("/onboarding", { replace: true });
    }
  }, [user, navigate]);

  const workspaceQuery = trpc.workspaces.current.useQuery(undefined, {
    enabled: Boolean((user as { workspaceId?: number } | null)?.workspaceId),
    retry: false,
  });

  const clientsQuery = trpc.clients.list.useQuery(undefined, {
    enabled: Boolean((user as { workspaceId?: number } | null)?.workspaceId),
    retry: false,
  });

  const reportsQuery = trpc.reports.list.useQuery(undefined, {
    enabled: Boolean((user as { workspaceId?: number } | null)?.workspaceId),
    retry: false,
  });

  const metricsQuery = trpc.workspaces.metrics.useQuery(undefined, {
    enabled: Boolean((user as { workspaceId?: number } | null)?.workspaceId),
    retry: false,
  });

  if (loading || workspaceQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06101F]">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  const workspace = workspaceQuery.data;
  const userRole = (user as { workspaceRole?: string } | null)?.workspaceRole;
  const isAdmin = userRole === "owner" || userRole === "admin";

  const totalClients = metricsQuery.data?.totalClients ?? clientsQuery.data?.length ?? 0;
  const totalReports = reportsQuery.data?.length ?? 0;
  const vipCount = metricsQuery.data?.vipClients ?? 0;
  const liquidFundsCount = metricsQuery.data?.liquidFunds ?? 0;
  const totalAum = metricsQuery.data?.totalAum ?? 0;
  const formatIls = (n: number) => {
    if (n >= 1_000_000) return `₪${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `₪${(n / 1_000).toFixed(0)}K`;
    return `₪${n.toLocaleString("he-IL")}`;
  };
  const firstName = user?.name?.split(" ")[0] || "סוכן";

  // Trial flow removed: every account is paid from day one (Round 33).

  return (
    <CinematicShell heroAsset="hero" overlayStrength={88} showSidebar>
      <div className="container py-6 sm:py-10 lg:py-14">
        {/* Welcome header */}
        <div className="mb-6 sm:mb-10 animate-fade-up">
          <GoldEyebrow>
            דשבורד · {workspace?.name || "סוכנות"}
          </GoldEyebrow>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-6xl font-black text-white tracking-tighter leading-[1.1]">
            שלום, <span className="text-gold">{firstName}</span>
            <span className="text-gold">.</span>
          </h1>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base lg:text-lg text-white/70 max-w-2xl leading-relaxed">
            {isAdmin
              ? "מבט-על על כל הסוכנות והפעילות של הצוות."
              : "הלקוחות שלכם, הדוחות והמשימות שלכם — במקום אחד."}
          </p>
        </div>

        {/* AI Actions Bar */}
        {totalClients > 0 && (
          <div className="flex flex-wrap gap-3 mb-6">
            <Button
              onClick={() => setBriefingOpen(true)}
              className="bg-gold hover:bg-gold/90 text-navy-deep font-bold"
            >
              <Sparkles className="h-4 w-4 me-2" />
              תדריך בוקר עם AI
            </Button>
            <Button
              onClick={() => setQaOpen(true)}
              variant="outline"
              className="border-gold/30 text-gold hover:bg-gold/10"
            >
              <Sparkles className="h-4 w-4 me-2" />
              שאל את ה-AI על הנתונים
            </Button>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10">
          <GlassCard className="p-4 sm:p-6 hover:border-gold/30 hover:bg-white/[0.07] transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-md bg-gold/15 border border-gold/30 flex items-center justify-center">
                <Users className="h-4 w-4 text-gold" />
              </div>
              <span className="text-[10px] tracking-[0.25em] uppercase text-white/45">
                לקוחות
              </span>
            </div>
            <div className="font-display text-3xl sm:text-4xl font-black text-white">
              {totalClients.toLocaleString("he-IL")}
            </div>
            <div className="text-xs text-white/55 mt-1">
              {isAdmin ? "בכל הסוכנות" : "בתיק שלכם"}
            </div>
          </GlassCard>

          <GlassCard className="p-4 sm:p-6 hover:border-gold/30 hover:bg-white/[0.07] transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-md bg-gold/15 border border-gold/30 flex items-center justify-center">
                <FileSpreadsheet className="h-4 w-4 text-gold" />
              </div>
              <span className="text-[10px] tracking-[0.25em] uppercase text-white/45">
                דוחות
              </span>
            </div>
            <div className="font-display text-3xl sm:text-4xl font-black text-white">
              {totalReports.toLocaleString("he-IL")}
            </div>
            <div className="text-xs text-white/55 mt-1">סה&quot;כ הועלו</div>
          </GlassCard>

          <GlassCard className="p-4 sm:p-6 hover:border-gold/30 hover:bg-white/[0.07] transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-md bg-gold/15 border border-gold/30 flex items-center justify-center">
                <Crown className="h-4 w-4 text-gold" />
              </div>
              <span className="text-[10px] tracking-[0.25em] uppercase text-white/45">
                לקוחות VIP
              </span>
            </div>
            <div className="font-display text-3xl sm:text-4xl font-black text-white">
              {vipCount.toLocaleString("he-IL")}
            </div>
            <div className="text-xs text-white/55 mt-1">עתירי נכסים</div>
          </GlassCard>

          <GlassCard className="p-4 sm:p-6 hover:border-gold/30 hover:bg-white/[0.07] transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-md bg-gold/15 border border-gold/30 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-gold" />
              </div>
              <span className="text-[10px] tracking-[0.25em] uppercase text-white/45">
                ס"כ AUM
              </span>
            </div>
            <div className="font-display text-xl sm:text-2xl font-black text-white mono-num">
              {formatIls(totalAum)}
            </div>
            <div className="text-xs text-white/55 mt-1">
              {liquidFundsCount > 0
                ? `מהם · ${liquidFundsCount} קרנות השתלמות נזילות`
                : "סך צבירות בתיק"}
            </div>
          </GlassCard>
        </div>

        {/* Round 93 — Interactive Triggers Queue (top, fast actions) */}
        {totalClients > 0 && (
          <div className="mb-8 sm:mb-10">
            <InteractiveTriggersGrid
              agentName={user?.name ?? "סוכן"}
              counts={{
                poaExpired: metricsQuery.data?.poaExpired ?? 0,
                poaExpiring90d: metricsQuery.data?.poaExpiring90d ?? 0,
                riskTemporary: metricsQuery.data?.riskTemporary ?? 0,
                coverageEnding: metricsQuery.data?.coverageEnding ?? 0,
                savingsNoInsurance: metricsQuery.data?.savingsNoInsurance ?? 0,
                noActivePension: metricsQuery.data?.noActivePension ?? 0,
                age46NoLongTermCare: metricsQuery.data?.age46NoLongTermCare ?? 0,
                aumFrozen: metricsQuery.data?.aumFrozen ?? 0,
                highFees: metricsQuery.data?.highFees ?? 0,
                trackMismatch: metricsQuery.data?.trackMismatch ?? 0,
                selfEmployedNoDeposit: metricsQuery.data?.selfEmployedNoDeposit ?? 0,
                concentrationRisk: metricsQuery.data?.concentrationRisk ?? 0,
                birthdayMilestone: metricsQuery.data?.birthdayMilestone ?? 0,
                birthdayThisMonth: metricsQuery.data?.birthdayThisMonth ?? 0,
                vipGoldPremium: metricsQuery.data?.vipGoldPremium ?? 0,
                noEmail: metricsQuery.data?.noEmail ?? 0,
              }}
            />
          </div>
        )}

        {/* Priority Action Groups — full 16-trigger view in 5 priority buckets (P0–P4) */}
        {totalClients > 0 && (
          <PriorityActionGroups
            counts={{
              poaExpired: metricsQuery.data?.poaExpired ?? 0,
              poaExpiring90d: metricsQuery.data?.poaExpiring90d ?? 0,
              riskTemporary: metricsQuery.data?.riskTemporary ?? 0,
              coverageEnding: metricsQuery.data?.coverageEnding ?? 0,
              savingsNoInsurance: metricsQuery.data?.savingsNoInsurance ?? 0,
              noActivePension: metricsQuery.data?.noActivePension ?? 0,
              age46NoLongTermCare: metricsQuery.data?.age46NoLongTermCare ?? 0,
              aumFrozen: metricsQuery.data?.aumFrozen ?? 0,
              highFees: metricsQuery.data?.highFees ?? 0,
              trackMismatch: metricsQuery.data?.trackMismatch ?? 0,
              selfEmployedNoDeposit: metricsQuery.data?.selfEmployedNoDeposit ?? 0,
              concentrationRisk: metricsQuery.data?.concentrationRisk ?? 0,
              birthdayMilestone: metricsQuery.data?.birthdayMilestone ?? 0,
              birthdayThisMonth: metricsQuery.data?.birthdayThisMonth ?? 0,
              vipGoldPremium: metricsQuery.data?.vipGoldPremium ?? 0,
              noEmail: metricsQuery.data?.noEmail ?? 0,
            }}
            distinctClientsWithAnyTrigger={metricsQuery.data?.distinctClientsWithAnyTrigger ?? 0}
            totalClients={metricsQuery.data?.totalClients ?? 0}
            subtitle="כל לקוח, כל הזדמנות, כל סיכון — מסודרים לפי דחיפות. טאב זו = מסך התראות ברמת עדיפות."
          />
        )}

        {/* Action cards */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
          <Link href="/upload" className="block">
            <GlassCard className="p-7 hover:bg-white/[0.08] hover:border-gold/40 hover:shadow-[0_8px_32px_rgba(201,169,97,0.18)] transition-all cursor-pointer group h-full">
              <div className="flex items-start gap-5">
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-gold/25 to-gold/5 border border-gold/40 flex items-center justify-center shrink-0">
                  <Upload className="h-5 w-5 text-gold" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-xl font-bold text-white mb-2 tracking-tight">
                    העלאת דוח חדש
                  </h3>
                  <p className="text-sm text-white/65 leading-relaxed mb-4">
                    טעינת דוח מוצרים בניהול וניתוח אוטומטי תוך שניות.
                  </p>
                  <div className="flex items-center gap-2 text-gold text-sm font-semibold opacity-80 group-hover:opacity-100 transition-opacity">
                    התחל
                    <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </GlassCard>
          </Link>

          <Link href="/clients" className="block">
            <GlassCard className="p-7 hover:bg-white/[0.08] hover:border-gold/40 hover:shadow-[0_8px_32px_rgba(201,169,97,0.18)] transition-all cursor-pointer group h-full">
              <div className="flex items-start gap-5">
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-gold/25 to-gold/5 border border-gold/40 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-gold" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-xl font-bold text-white mb-2 tracking-tight">
                    תיק הלקוחות
                  </h3>
                  <p className="text-sm text-white/65 leading-relaxed mb-4">
                    {isAdmin
                      ? "כל הלקוחות של הסוכנות, פילוח חכם וחיפוש מהיר."
                      : "הלקוחות שלכם עם פילוח לפי גיל, יצרן ופרמיות."}
                  </p>
                  <div className="flex items-center gap-2 text-gold text-sm font-semibold opacity-80 group-hover:opacity-100 transition-opacity">
                    פתיחת התיק
                    <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </GlassCard>
          </Link>

          {isAdmin && (
            <Link href="/team" className="block md:col-span-2">
              <GlassCard className="p-7 hover:bg-white/[0.08] hover:border-gold/40 hover:shadow-[0_8px_32px_rgba(201,169,97,0.18)] transition-all cursor-pointer group">
                <div className="flex items-start gap-5">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-gold/25 to-gold/5 border border-gold/40 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-gold" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-xl font-bold text-white mb-2 tracking-tight">
                      ניהול צוות
                    </h3>
                    <p className="text-sm text-white/65 leading-relaxed mb-4">
                      הזמנת סוכנים, חלוקת לקוחות ובקרת הרשאות. רק למנהלי
                      סוכנות.
                    </p>
                    <div className="flex items-center gap-2 text-gold text-sm font-semibold opacity-80 group-hover:opacity-100 transition-opacity">
                      ניהול
                      <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </GlassCard>
            </Link>
          )}
        </div>

        {/* AI Modals */}
        <AIBriefingModal
          isOpen={briefingOpen}
          onClose={() => setBriefingOpen(false)}
          analysisContext={metricsQuery.data}
        />
        <AIQaModal
          isOpen={qaOpen}
          onClose={() => setQaOpen(false)}
          analysisContext={metricsQuery.data}
        />

        {/* Empty state */}
        {totalClients === 0 && totalReports === 0 && (
          <GlassCard
            goldAccent
            className="mt-10 p-12 text-center bg-gradient-to-br from-gold/8 to-[#06101F]/40"
          >
            <div className="h-16 w-16 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="h-7 w-7 text-gold" />
            </div>
            <h3 className="font-display text-2xl lg:text-3xl font-black text-white tracking-tight mb-3">
              מתחילים? <span className="text-gold">בואו נראה לכם איך זה עובד.</span>
            </h3>
            <p className="text-base text-white/70 mb-8 max-w-xl mx-auto leading-relaxed">
              העלו את דוח "מוצרים בניהול" הראשון שלכם, ותראו תוך שניות ניתוח מלא: מצב
              התיק, הזדמנויות שימור, וכל הפעולות שהמערכת מציעה.
            </p>
            <Link href="/upload">
              <Button className="bg-gradient-to-br from-gold to-[#B89346] text-[#06101F] hover:scale-105 font-bold shadow-lg shadow-gold/30">
                <Upload className="h-4 w-4 ml-2" />
                העלאת דוח ראשון
              </Button>
            </Link>
          </GlassCard>
        )}
      </div>
    </CinematicShell>
  );
}
