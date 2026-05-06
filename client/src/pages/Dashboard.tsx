// SPARK AI · Dashboard — בסגנון הסינמטי של הדמו
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { CinematicShell, GlassCard, GoldEyebrow } from "@/components/CinematicShell";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
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

  const totalClients = clientsQuery.data?.length ?? 0;
  const totalReports = reportsQuery.data?.length ?? 0;
  const firstName = user?.name?.split(" ")[0] || "סוכן";

  const trialDaysLeft =
    workspace?.plan === "trial" && workspace.trialEndsAt
      ? Math.max(
          0,
          Math.ceil(
            (new Date(workspace.trialEndsAt).getTime() - Date.now()) /
              (24 * 60 * 60 * 1000)
          )
        )
      : null;

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
            {isAdmin
              ? "מבט-על על כל הסוכנות והפעילות של הצוות."
              : "הלקוחות שלך, הדוחות והמשימות שלך — במקום אחד."}
          </p>
        </div>

        {/* Trial banner */}
        {trialDaysLeft !== null && (
          <GlassCard
            goldAccent
            className="mb-8 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-up"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5 text-gold" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">
                  תקופת ניסיון פעילה
                </div>
                <div className="text-xs text-white/65 mt-0.5">
                  מסתיימת בעוד {trialDaysLeft} ימים — שדרגו לפני כדי לא לאבד
                  גישה.
                </div>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-gradient-to-br from-gold to-[#B89346] text-[#06101F] hover:scale-[1.02] font-bold shrink-0"
            >
              שדרוג עכשיו
            </Button>
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
            <div className="font-display text-4xl font-black text-white">0</div>
            <div className="text-xs text-white/55 mt-1">עתירי נכסים</div>
          </GlassCard>

          <GlassCard className="p-6 hover:border-gold/30 hover:bg-white/[0.07] transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-md bg-gold/15 border border-gold/30 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-gold" />
              </div>
              <span className="text-[10px] tracking-[0.25em] uppercase text-white/45">
                הון נזיל
              </span>
            </div>
            <div className="font-display text-2xl font-black text-white">₪0</div>
            <div className="text-xs text-white/55 mt-1">קרנות השתלמות נזילות</div>
          </GlassCard>
        </div>

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
              העלו את דוח השורנס הראשון שלכם, ותראו תוך שניות ניתוח מלא: מצב
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
