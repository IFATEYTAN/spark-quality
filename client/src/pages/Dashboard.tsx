// SPARK AI · Dashboard - מסך ראשי לסוכנים ולמנהלי בית סוכן
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  Building2,
  Database,
  FileSpreadsheet,
  Loader2,
  LogOut,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";

export default function Dashboard() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();

  // Auth gate
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = "/";
    }
  }, [loading, isAuthenticated]);

  // Onboarding gate - if no workspace, send to onboarding
  useEffect(() => {
    if (
      user &&
      !(user as { workspaceId?: number | null }).workspaceId
    ) {
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
      <div className="min-h-screen flex items-center justify-center bg-navy-deep">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  const workspace = workspaceQuery.data;
  const userRole = (user as { workspaceRole?: string } | null)?.workspaceRole;
  const isAdmin = userRole === "owner" || userRole === "admin";

  const totalClients = clientsQuery.data?.length ?? 0;
  const totalReports = reportsQuery.data?.length ?? 0;

  return (
    <div className="min-h-screen bg-navy-deep text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-navy-deep/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-gold" />
            <div>
              <div className="font-serif text-lg text-gold">SPARK AI</div>
              <div className="text-xs text-white/60">
                {workspace?.name || "סוכנות"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-white/70 text-left hidden sm:block">
              <div>{user?.name}</div>
              <div className="text-xs text-white/40">
                {userRole === "owner"
                  ? "בעלי סוכנות"
                  : userRole === "admin"
                  ? "מנהל"
                  : "סוכן"}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout()}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8">
        {/* Trial banner */}
        {workspace?.plan === "trial" && workspace.trialEndsAt && (
          <div className="bg-gold/10 border border-gold/30 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-gold" />
              <div>
                <div className="text-sm font-medium text-white">
                  תקופת ניסיון פעילה
                </div>
                <div className="text-xs text-white/60">
                  מסתיימת בעוד{" "}
                  {Math.ceil(
                    (new Date(workspace.trialEndsAt).getTime() - Date.now()) /
                      (24 * 60 * 60 * 1000)
                  )}{" "}
                  ימים
                </div>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-gold text-navy-deep hover:bg-gold/90"
            >
              שדרוג
            </Button>
          </div>
        )}

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif text-white mb-2">
            שלום, {user?.name?.split(" ")[0] || "סוכן"}
          </h1>
          <p className="text-white/60">
            {isAdmin
              ? "מבט-על על כל הסוכנות והפעילות של הצוות"
              : "הלקוחות שלך, הדוחות והמשימות שלך - במקום אחד"}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 bg-white/5 border-white/10">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-gold" />
              <span className="text-xs text-white/40">לקוחות</span>
            </div>
            <div className="text-3xl font-serif text-white">{totalClients}</div>
            <div className="text-xs text-white/60 mt-1">
              {isAdmin ? "בכל הסוכנות" : "בתיק שלך"}
            </div>
          </Card>

          <Card className="p-6 bg-white/5 border-white/10">
            <div className="flex items-center justify-between mb-2">
              <FileSpreadsheet className="h-5 w-5 text-gold" />
              <span className="text-xs text-white/40">דוחות</span>
            </div>
            <div className="text-3xl font-serif text-white">{totalReports}</div>
            <div className="text-xs text-white/60 mt-1">סה"כ הועלו</div>
          </Card>

          <Card className="p-6 bg-white/5 border-white/10">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="h-5 w-5 text-gold" />
              <span className="text-xs text-white/40">משימות</span>
            </div>
            <div className="text-3xl font-serif text-white">0</div>
            <div className="text-xs text-white/60 mt-1">פתוחות</div>
          </Card>

          <Card className="p-6 bg-white/5 border-white/10">
            <div className="flex items-center justify-between mb-2">
              <Database className="h-5 w-5 text-gold" />
              <span className="text-xs text-white/40">תוכנית</span>
            </div>
            <div className="text-xl font-serif text-white capitalize">
              {workspace?.plan === "trial"
                ? "ניסיון"
                : workspace?.plan === "basic"
                ? "בסיסית"
                : workspace?.plan === "premium"
                ? "פרימיום"
                : "ארגונית"}
            </div>
            <div className="text-xs text-white/60 mt-1">פעילה</div>
          </Card>
        </div>

        {/* Action cards */}
        <div className="grid md:grid-cols-2 gap-4">
          <Link href="/upload">
            <Card className="p-6 bg-white/5 border-white/10 hover:bg-white/10 hover:border-gold/50 transition-all cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gold/10 rounded-lg">
                  <Upload className="h-6 w-6 text-gold" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-serif text-white mb-1">
                    העלאת דוח חדש
                  </h3>
                  <p className="text-sm text-white/60">
                    טעינת דוח שורנס וניתוח אוטומטי תוך שניות
                  </p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/clients">
            <Card className="p-6 bg-white/5 border-white/10 hover:bg-white/10 hover:border-gold/50 transition-all cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gold/10 rounded-lg">
                  <Users className="h-6 w-6 text-gold" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-serif text-white mb-1">
                    תיק הלקוחות
                  </h3>
                  <p className="text-sm text-white/60">
                    {isAdmin
                      ? "כל הלקוחות של הסוכנות"
                      : "הלקוחות שלך עם פילוח חכם"}
                  </p>
                </div>
              </div>
            </Card>
          </Link>

          {isAdmin && (
            <Link href="/team">
              <Card className="p-6 bg-white/5 border-white/10 hover:bg-white/10 hover:border-gold/50 transition-all cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gold/10 rounded-lg">
                    <Building2 className="h-6 w-6 text-gold" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-serif text-white mb-1">
                      ניהול צוות
                    </h3>
                    <p className="text-sm text-white/60">
                      הזמנת סוכנים, חלוקת לקוחות ובקרת הרשאות
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          )}
        </div>

        {/* Empty state for first-time users */}
        {totalClients === 0 && totalReports === 0 && (
          <Card className="p-12 mt-8 bg-gradient-to-br from-gold/5 to-navy-deep border-gold/20 text-center">
            <Sparkles className="h-12 w-12 text-gold mx-auto mb-4" />
            <h3 className="text-2xl font-serif text-white mb-2">
              מתחילים? בואו נראה לכם איך זה עובד
            </h3>
            <p className="text-white/60 mb-6 max-w-xl mx-auto">
              העלו את דוח השורנס הראשון שלכם, ותראו תוך שניות ניתוח מלא:
              מצב התיק, הזדמנויות שימור, וכל הפעולות שהמערכת מציעה לכם לבצע
            </p>
            <Link href="/upload">
              <Button className="bg-gold text-navy-deep hover:bg-gold/90">
                <Upload className="h-4 w-4 ml-2" />
                העלאת דוח ראשון
              </Button>
            </Link>
          </Card>
        )}
      </main>
    </div>
  );
}
