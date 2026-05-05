// SPARK AI · Onboarding — בסגנון הסינמטי של הדמו (רקע נייבי + תמונת hero + חלקיקי זהב)
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CinematicShell, GlassCard, GoldEyebrow } from "@/components/CinematicShell";
import { trpc } from "@/lib/trpc";
import { Building2, Loader2, Users, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type Mode = "choose" | "create" | "join";

export default function Onboarding() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>("choose");
  const [workspaceName, setWorkspaceName] = useState("");
  const [inviteToken, setInviteToken] = useState("");

  const utils = trpc.useUtils();
  const createWorkspace = trpc.workspaces.create.useMutation({
    onSuccess: async () => {
      toast.success("הסוכנות נוצרה בהצלחה!", {
        description: "מעבירים אותך לדשבורד...",
      });
      await utils.auth.me.invalidate();
      navigate("/dashboard");
    },
    onError: (err) => {
      toast.error("שגיאה ביצירת הסוכנות", { description: err.message });
    },
  });

  const acceptInvite = trpc.workspaces.acceptInvite.useMutation({
    onSuccess: async () => {
      toast.success("הצטרפת לסוכנות בהצלחה!");
      await utils.auth.me.invalidate();
      navigate("/dashboard");
    },
    onError: (err) => {
      toast.error("ההזמנה לא תקפה", { description: err.message });
    },
  });

  // Read invite token from URL if exists
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite");
    if (token) {
      setInviteToken(token);
      setMode("join");
    }
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = "/";
    }
  }, [loading, isAuthenticated]);

  // If user already has a workspace, redirect to dashboard
  useEffect(() => {
    if (user && (user as { workspaceId?: number }).workspaceId) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06101F]">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  const firstName = user?.name?.split(" ")[0] || "סוכן יקר";

  return (
    <CinematicShell heroAsset="hero" overlayStrength={85}>
      <div className="container py-16 lg:py-24">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-up">
            <GoldEyebrow>SPARK AI · הקמת סביבה</GoldEyebrow>
            <h1 className="font-display text-4xl lg:text-6xl font-black text-white tracking-tighter leading-[1.05]">
              ברוכים הבאים,
              <br />
              <span className="text-gold">{firstName}</span>
              <span className="text-gold">.</span>
            </h1>
            <p className="mt-6 text-base lg:text-lg text-white/70 max-w-xl mx-auto leading-relaxed">
              לפני שמתחילים — בואו נחבר אותך לסביבת העבודה הנכונה.
            </p>
          </div>

          {/* Choose mode */}
          {mode === "choose" && (
            <div
              className="grid md:grid-cols-2 gap-5 animate-fade-up"
              style={{ animationDelay: "0.2s" }}
            >
              <GlassCard
                goldAccent
                className="p-8 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-[0_8px_40px_rgba(201,169,97,0.25)]"
              >
                <button
                  onClick={() => setMode("create")}
                  className="w-full text-right"
                >
                  <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-gold/30 to-gold/10 border border-gold/40 flex items-center justify-center mb-6">
                    <Building2 className="h-6 w-6 text-gold" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-white mb-3 tracking-tight">
                    הקמת סוכנות חדשה
                  </h2>
                  <p className="text-sm text-white/65 leading-relaxed mb-5">
                    אני סוכן עצמאי או מנהל בית-סוכן, ורוצה לפתוח סביבת עבודה
                    חדשה. ניסיון 14 יום בחינם.
                  </p>
                  <div className="flex items-center gap-2 text-gold text-sm font-semibold">
                    התחל
                    <ArrowRight className="h-4 w-4 -rotate-180" />
                  </div>
                </button>
              </GlassCard>

              <GlassCard className="p-8 cursor-pointer transition-all hover:scale-[1.02] hover:border-white/30">
                <button
                  onClick={() => setMode("join")}
                  className="w-full text-right"
                >
                  <div className="h-14 w-14 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center mb-6">
                    <Users className="h-6 w-6 text-white/80" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-white mb-3 tracking-tight">
                    הצטרפות לסוכנות קיימת
                  </h2>
                  <p className="text-sm text-white/65 leading-relaxed mb-5">
                    קיבלתי הזמנה ממנהל בית-הסוכן עם קוד הזמנה.
                  </p>
                  <div className="flex items-center gap-2 text-white/80 text-sm font-semibold">
                    הזן קוד
                    <ArrowRight className="h-4 w-4 -rotate-180" />
                  </div>
                </button>
              </GlassCard>
            </div>
          )}

          {/* Create mode */}
          {mode === "create" && (
            <GlassCard
              goldAccent
              className="p-8 lg:p-10 animate-fade-up"
            >
              <GoldEyebrow>פתיחת סוכנות חדשה</GoldEyebrow>
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-white tracking-tight mb-8">
                איך נקרא לסוכנות שלך?
              </h2>
              <div className="space-y-5">
                <div>
                  <Label htmlFor="name" className="text-white/85 mb-2 block text-sm font-semibold">
                    שם הסוכנות
                  </Label>
                  <Input
                    id="name"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder='לדוגמה: "ביטוח דניאל" או "בית-הסוכן הירוק"'
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/35 h-12 text-base"
                  />
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  תקופת ניסיון של 14 יום ללא צורך בכרטיס אשראי. תוכלו להזמין
                  צוות, לבטל בכל רגע.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 pt-3">
                  <Button
                    variant="outline"
                    onClick={() => setMode("choose")}
                    className="border-white/25 bg-white/5 text-white hover:bg-white/10"
                  >
                    חזרה
                  </Button>
                  <Button
                    onClick={() =>
                      createWorkspace.mutate({ name: workspaceName.trim() })
                    }
                    disabled={
                      workspaceName.trim().length < 2 ||
                      createWorkspace.isPending
                    }
                    className="bg-gradient-to-br from-gold to-[#B89346] text-[#06101F] hover:scale-[1.02] hover:shadow-lg hover:shadow-gold/30 flex-1 font-bold"
                  >
                    {createWorkspace.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "יצירת הסוכנות"
                    )}
                  </Button>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Join mode */}
          {mode === "join" && (
            <GlassCard className="p-8 lg:p-10 animate-fade-up">
              <GoldEyebrow>הצטרפות לסוכנות קיימת</GoldEyebrow>
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-white tracking-tight mb-8">
                הזיני את קוד ההזמנה
              </h2>
              <div className="space-y-5">
                <div>
                  <Label htmlFor="token" className="text-white/85 mb-2 block text-sm font-semibold">
                    קוד הזמנה
                  </Label>
                  <Input
                    id="token"
                    value={inviteToken}
                    onChange={(e) => setInviteToken(e.target.value)}
                    placeholder="הדבק כאן את קוד ההזמנה שקיבלת"
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/35 font-mono h-12 text-base"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-3">
                  <Button
                    variant="outline"
                    onClick={() => setMode("choose")}
                    className="border-white/25 bg-white/5 text-white hover:bg-white/10"
                  >
                    חזרה
                  </Button>
                  <Button
                    onClick={() =>
                      acceptInvite.mutate({ token: inviteToken.trim() })
                    }
                    disabled={
                      inviteToken.trim().length < 5 || acceptInvite.isPending
                    }
                    className="bg-gradient-to-br from-gold to-[#B89346] text-[#06101F] hover:scale-[1.02] hover:shadow-lg hover:shadow-gold/30 flex-1 font-bold"
                  >
                    {acceptInvite.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "הצטרפות לסוכנות"
                    )}
                  </Button>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </CinematicShell>
  );
}
