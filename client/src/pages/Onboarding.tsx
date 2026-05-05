// SPARK AI · Onboarding - מסך הקליטה לאחר התחברות ראשונה
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Building2, Loader2, Sparkles, Users } from "lucide-react";
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
    onError: err => {
      toast.error("שגיאה ביצירת הסוכנות", { description: err.message });
    },
  });

  const acceptInvite = trpc.workspaces.acceptInvite.useMutation({
    onSuccess: async () => {
      toast.success("הצטרפת לסוכנות בהצלחה!");
      await utils.auth.me.invalidate();
      navigate("/dashboard");
    },
    onError: err => {
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
      <div className="min-h-screen flex items-center justify-center bg-navy-deep">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-deep flex flex-col items-center justify-center p-6 text-white">
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-gold" />
        <span className="font-serif text-xl text-gold">SPARK AI</span>
      </div>

      <div className="w-full max-w-2xl">
        <h1 className="text-3xl md:text-4xl font-serif text-white mb-3 text-center">
          ברוכים הבאים, {user?.name?.split(" ")[0] || "סוכן יקר"}
        </h1>
        <p className="text-white/60 text-center mb-10 text-lg">
          איך תרצו להתחיל?
        </p>

        {mode === "choose" && (
          <div className="grid md:grid-cols-2 gap-4">
            <Card
              className="p-8 cursor-pointer transition-all hover:scale-105 bg-navy-deep border-gold/30 hover:border-gold"
              onClick={() => setMode("create")}
            >
              <Building2 className="h-12 w-12 text-gold mb-4" />
              <h2 className="text-xl font-serif text-white mb-2">
                הקמת סוכנות חדשה
              </h2>
              <p className="text-white/60 text-sm">
                אני סוכן עצמאי או מנהל בית סוכן ורוצה לפתוח סביבת עבודה חדשה
              </p>
            </Card>

            <Card
              className="p-8 cursor-pointer transition-all hover:scale-105 bg-navy-deep border-white/20 hover:border-white/50"
              onClick={() => setMode("join")}
            >
              <Users className="h-12 w-12 text-white/80 mb-4" />
              <h2 className="text-xl font-serif text-white mb-2">
                הצטרפות לסוכנות קיימת
              </h2>
              <p className="text-white/60 text-sm">
                קיבלתי הזמנה ממנהל בית הסוכן עם קוד הזמנה
              </p>
            </Card>
          </div>
        )}

        {mode === "create" && (
          <Card className="p-8 bg-navy-deep border-gold/30">
            <h2 className="text-2xl font-serif text-white mb-6">
              פתיחת סוכנות חדשה
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-white/80 mb-2 block">
                  שם הסוכנות
                </Label>
                <Input
                  id="name"
                  value={workspaceName}
                  onChange={e => setWorkspaceName(e.target.value)}
                  placeholder='לדוגמה: "ביטוח דניאל" או "בית הסוכן קוואליטי"'
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
                />
              </div>
              <p className="text-xs text-white/50">
                תקופת ניסיון של 14 יום ללא צורך בכרטיס אשראי. תוכל להזמין צוות,
                לבטל בכל רגע.
              </p>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setMode("choose")}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  חזרה
                </Button>
                <Button
                  onClick={() =>
                    createWorkspace.mutate({ name: workspaceName.trim() })
                  }
                  disabled={
                    workspaceName.trim().length < 2 || createWorkspace.isPending
                  }
                  className="bg-gold text-navy-deep hover:bg-gold/90 flex-1"
                >
                  {createWorkspace.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "יצירת הסוכנות"
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {mode === "join" && (
          <Card className="p-8 bg-navy-deep border-white/30">
            <h2 className="text-2xl font-serif text-white mb-6">
              הצטרפות לסוכנות קיימת
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="token" className="text-white/80 mb-2 block">
                  קוד הזמנה
                </Label>
                <Input
                  id="token"
                  value={inviteToken}
                  onChange={e => setInviteToken(e.target.value)}
                  placeholder="הדבק כאן את קוד ההזמנה שקיבלת"
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/30 font-mono"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setMode("choose")}
                  className="border-white/20 text-white hover:bg-white/10"
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
                  className="bg-gold text-navy-deep hover:bg-gold/90 flex-1"
                >
                  {acceptInvite.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "הצטרפות"
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
