// SPARK AI · Dashboard — בסגנון הסינמטי של הדמו
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { CinematicShell, GlassCard, GoldEyebrow } from "@/components/CinematicShell";
import { ActionCenter } from "@/components/ActionCenter";
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
import { useEffect } from "react";
import { Link, useLocation } from "wouter";

export default function Dashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = "/";
    }
  }, [loading, isAuthenticated]);

  useEffect(() => {
    if (user && !(user as { workspaceId?: number | null }).workspaceId) {
      navigate("/onboarding");
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
  const isFirstRun = totalClients === 0 && totalReports === 0 && !clientsQuery.isLoading && !reportsQuery.isLoading;

  return (
    <CinematicShell heroAsset="hero" overlayStrength={88} showSidebar>
      <div className="container py-10 lg:py-14">
        {/* Welcome header */}
        <div className="mb-10 animate-fade-up">
          <GoldEyebrow>
            דשבורד · {workspace?.name || "סוכנות"}
          </GoldEyebrow>
          <h1 className="font-display text-4xl lg:text-6xl font-black text-white tracking-tighter leading-[1.05]">
            שלום, <span className="text-gold">{firstName}</span>
            <span className="text-gold">.</span>
          </h1>
          <p className="mt-4 text-base lg:text-lg text-white/70 max-w-2xl leading-relaxed">
            {isFirstRun
              ? "ברוכ/ה הבא/ה ל-SPARK Quality. כדי שנציג לך את התובנות על תיק הלקוחות — נתחיל בהעלאת הדוח הראשון."
              : isAdmin
                ? "מבט-על על כל הסוכנות והפעילות של הצוות."
                : "הלקוחות שלך, הדוחות והמשימות שלך — במקום אחד."}
          </p>
        </div>

        {/* First-run onboarding hero (replaces stats/action-center when there's no data yet) */}
        {isFirstRun && (
          <GlassCard
            goldAccent
            className="mb-10 p-8 lg:p-12 bg-gradient-to-br from-gold/[0.08] to-[#06101F]/40 animate-fade-up"
          >
            <div className="flex items-start gap-6 mb-8">
              <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-gold to-[#B89346] border border-gold/60 flex items-center justify-center shrink-0 shadow-lg shadow-gold/30">
                <Sparkles className="h-7 w-7 text-[#06101F]" strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <h2 className="font-display text-2xl lg:text-4xl font-black text-white tracking-tight mb-2">
                  3 צעדים, ואת בפנים.
                </h2>
                <p className="text-sm lg:text-base text-white/65 leading-relaxed max-w-2xl">
                  ה-AI שלנו עושה את העבודה הקשה. תוך פחות מדקה תקבלי תיק לקוחות
                  מנותח, מסומן בדגלים, ועם הצעות פעולה ברורות.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
                <div className="font-display text-3xl font-black text-gold mb-1">1</div>
                <div className="font-display text-base font-bold text-white mb-1">העלי את דוח השורנס</div>
                <div className="text-xs text-white/60 leading-relaxed">
                  גרירה והשלמה של קובץ ה-Excel — אנחנו מבינים את כל הגיליונות אוטומטית.
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
                <div className="font-display text-3xl font-black text-gold mb-1">2</div>
                <div className="font-display text-base font-bold text-white mb-1">קבלי ניתוח חכם</div>
                <div className="text-xs text-white/60 leading-relaxed">
                  זיהוי VIP, תיקון 190, השתלמויות נזילות וריסקים שמסתיימים — בכל לקוח.
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
                <div className="font-display text-3xl font-black text-gold mb-1">3</div>
                <div className="font-display text-base font-bold text-white mb-1">פעלי בלחיצה</div>
                <div className="text-xs text-white/60 leading-relaxed">
                  ה-AI מנסח לך אימייל / WhatsApp מותאם לכל לקוח — ושומר היסטוריה.
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/upload">
                <Button className="bg-gradient-to-br from-gold to-[#B89346] text-[#06101F] hover:scale-105 hover:shadow-xl hover:shadow-gold/40 font-bold text-base px-6 py-6">
                  <Upload className="h-4 w-4 ml-2" />
                  התחילי כאן · העלאת דוח ראשון
                </Button>
              </Link>
              <Link href="/demo">
                <Button
                  variant="outline"
                  className="border-white/20 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:border-gold/40 font-semibold"
                >
                  לא מוכנה? צפי בדמו של 90 שניות
                </Button>
              </Link>
            </div>
          </GlassCard>
        )}

        {/* Stats grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <GlassCard className="p-6 hover:border-gold/30 hover:bg-white/[0.07] transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-md bg-gold/15 border border-gold/30 flex items-center justify-center">
                <Users className="h-4 w-4 text-gold" />
              </div>
              <span className="text-[10px] tracking-[0.25em] uppercase text-white/45">
                לקוחות
              </span>
            </div>
            <div className="font-display text-4xl font-black text-white">
              {totalClients.toLocaleString("he-IL")}
            </div>
            <div className="text-xs text-white/55 mt-1">
              {isAdmin ? "בכל הסוכנות" : "בתיק שלך"}
            </div>
          </GlassCard>

          <GlassCard className="p-6 hover:border-gold/30 hover:bg-white/[0.07] transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-md bg-gold/15 border border-gold/30 flex items-center justify-center">
                <FileSpreadsheet className="h-4 w-4 text-gold" />
              </div>
              <span className="text-[10px] tracking-[0.25em] uppercase text-white/45">
                דוחות
              </span>
            </div>
            <div className="font-display text-4xl font-black text-white">
              {totalReports.toLocaleString("he-IL")}
            </div>
            <div className="text-xs text-white/55 mt-1">סה&quot;כ הועלו</div>
          </GlassCard>

          <GlassCard className="p-6 hover:border-gold/30 hover:bg-white/[0.07] transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-md bg-gold/15 border border-gold/30 flex items-center justify-center">
                <Crown className="h-4 w-4 text-gold" />
              </div>
              <span className="text-[10px] tracking-[0.25em] uppercase text-white/45">
                לקוחות VIP
              </span>
            </div>
            <div className="font-display text-4xl font-black text-white">
              {vipCount.toLocaleString("he-IL")}
            </div>
            <div className="text-xs text-white/55 mt-1">עתירי נכסים</div>
          </GlassCard>

          <GlassCard className="p-6 hover:border-gold/30 hover:bg-white/[0.07] transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-md bg-gold/15 border border-gold/30 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-gold" />
              </div>
              <span className="text-[10px] tracking-[0.25em] uppercase text-white/45">
                ס"כ AUM
              </span>
            </div>
            <div className="font-display text-2xl font-black text-white mono-num">
              {formatIls(totalAum)}
            </div>
            <div className="text-xs text-white/55 mt-1">
              {liquidFundsCount > 0
                ? `מהם · ${liquidFundsCount} קרנות השתלמות נזילות`
                : "סך צבירות בתיק"}
            </div>
          </GlassCard>
        </div>

        {/* Action Center — surfaces post-import next steps */}
        {totalClients > 0 && (
          <ActionCenter
            counts={{
              vipClients: metricsQuery.data?.vipClients ?? 0,
              liquidFunds: metricsQuery.data?.liquidFunds ?? 0,
              tikun190Candidates: metricsQuery.data?.tikun190Candidates ?? 0,
              highFees: metricsQuery.data?.highFees ?? 0,
              riskEnding: metricsQuery.data?.riskEnding ?? 0,
              coverageGaps: metricsQuery.data?.coverageGaps ?? 0,
            }}
            subtitle="זיהינו את הקטגוריות הפעילות בתיק שלך — לחצי על קטגוריה כדי לראות את תרשים הזרימה האוטומטי ואת הצעד הבא."
          />
        )}

        {/* Action cards */}
        <div className="grid md:grid-cols-2 gap-5">
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
                    טעינת דוח שורנס וניתוח אוטומטי תוך שניות.
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
                      : "הלקוחות שלך עם פילוח לפי גיל, יצרן ופרמיות."}
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
      </div>
    </CinematicShell>
  );
}
