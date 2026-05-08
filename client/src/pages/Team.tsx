// SPARK AI · Team — ניהול חברי הצוות בסגנון הסינמטי של הדמו
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CinematicShell, GlassCard, GoldEyebrow } from "@/components/CinematicShell";
import { trpc } from "@/lib/trpc";
import { Copy, Loader2, Mail, UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Team() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "agent">("agent");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  const utils = trpc.useUtils();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  const userRole = (user as { workspaceRole?: string } | null)?.workspaceRole;
  const isAdmin = userRole === "owner" || userRole === "admin";

  useEffect(() => {
    if (user && !isAdmin) {
      toast.error("אין לכם הרשאות לגשת למסך הזה");
      navigate("/dashboard");
    }
  }, [user, isAdmin, navigate]);

  const membersQuery = trpc.workspaces.listMembers.useQuery(undefined, {
    enabled: isAdmin,
    retry: false,
  });

  const invitationsQuery = trpc.workspaces.listInvitations.useQuery(undefined, {
    enabled: isAdmin,
    retry: false,
  });

  const inviteMutation = trpc.workspaces.invite.useMutation({
    onSuccess: (data) => {
      setGeneratedToken(data.token);
      toast.success("ההזמנה נוצרה!");
      utils.workspaces.listInvitations.invalidate();
      setInviteEmail("");
    },
    onError: (err) => {
      toast.error("שגיאה ביצירת ההזמנה", { description: err.message });
    },
  });

  const inviteUrl = generatedToken
    ? `${window.location.origin}/onboarding?invite=${generatedToken}`
    : null;

  const copyInviteLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    toast.success("קישור ההזמנה הועתק!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06101F]">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <CinematicShell heroAsset="hero" overlayStrength={90} showSidebar>
      <div className="container py-6 sm:py-10 lg:py-14 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6 mb-6 sm:mb-10 animate-fade-up">
          <div>
            <GoldEyebrow>ניהול צוות</GoldEyebrow>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter leading-[1.1]">
              הצוות <span className="text-gold">שלך</span>
            </h1>
            <p className="mt-3 text-sm lg:text-base text-white/65 leading-relaxed max-w-xl">
              הזמיני סוכנים לסוכנות ונהלי את ההרשאות שלהם. כל סוכן רואה רק את
              הלקוחות שלו — בידוד מלא.
            </p>
          </div>
          <Button
            onClick={() => {
              setShowInviteForm(true);
              setGeneratedToken(null);
            }}
            className="bg-gradient-to-br from-gold to-[#B89346] text-[#06101F] hover:scale-[1.02] hover:shadow-lg hover:shadow-gold/30 font-bold"
          >
            <UserPlus className="h-4 w-4 ml-2" />
            הזמנת סוכן חדש
          </Button>
        </div>

        {/* Invite form */}
        {showInviteForm && (
          <GlassCard goldAccent className="p-5 sm:p-7 mb-6 animate-fade-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-white tracking-tight">
                הזמנת סוכן חדש
              </h2>
              <button
                onClick={() => {
                  setShowInviteForm(false);
                  setGeneratedToken(null);
                }}
                className="h-8 w-8 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
                aria-label="סגירה"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!generatedToken ? (
              <div className="space-y-5">
                <div>
                  <Label className="text-white/85 mb-2 block text-sm font-semibold">
                    אימייל
                  </Label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="agent@example.com"
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/35 h-11"
                  />
                </div>
                <div>
                  <Label className="text-white/85 mb-2 block text-sm font-semibold">
                    הרשאה
                  </Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(v) => setInviteRole(v as "admin" | "agent")}
                  >
                    <SelectTrigger className="bg-white/5 border-white/20 text-white h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">
                        סוכן · רואה רק את הלקוחות שלו
                      </SelectItem>
                      <SelectItem value="admin">
                        מנהל · רואה את כל הסוכנות
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setShowInviteForm(false)}
                    className="border-white/25 bg-white/5 text-white hover:bg-white/10"
                  >
                    ביטול
                  </Button>
                  <Button
                    onClick={() =>
                      inviteMutation.mutate({
                        email: inviteEmail.trim(),
                        workspaceRole: inviteRole,
                      })
                    }
                    disabled={
                      !inviteEmail.includes("@") || inviteMutation.isPending
                    }
                    className="bg-gradient-to-br from-gold to-[#B89346] text-[#06101F] hover:scale-[1.02] hover:shadow-lg hover:shadow-gold/30 flex-1 font-bold"
                  >
                    {inviteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "יצירת קישור הזמנה"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gold/10 border border-gold/30 rounded-md p-5">
                  <p className="text-sm text-white/85 mb-3 font-semibold">
                    שלחו את הקישור הבא לסוכן באימייל או בוואטסאפ:
                  </p>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={inviteUrl ?? ""}
                      className="bg-[#06101F]/60 border-white/20 text-white text-xs font-mono h-11"
                    />
                    <Button
                      onClick={copyInviteLink}
                      className="bg-gradient-to-br from-gold to-[#B89346] text-[#06101F] hover:scale-[1.02] font-bold shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-white/55 mt-3">
                    הקישור פעיל ל-7 ימים.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowInviteForm(false);
                    setGeneratedToken(null);
                  }}
                  className="border-white/25 bg-white/5 text-white hover:bg-white/10 w-full"
                >
                  סגירה
                </Button>
              </div>
            )}
          </GlassCard>
        )}

        {/* Members list */}
        <GlassCard className="p-7 mb-6">
          <h2 className="font-display text-xl font-bold text-white tracking-tight mb-5">
            חברי הצוות הפעילים
          </h2>
          {membersQuery.isLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-gold mx-auto" />
            </div>
          ) : (membersQuery.data?.length ?? 0) === 0 ? (
            <p className="text-white/55 text-center py-10 text-sm">
              אין עדיין חברי צוות. הזמיני סוכן ראשון להתחיל.
            </p>
          ) : (
            <div className="space-y-2">
              {membersQuery.data?.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 p-4 bg-white/[0.04] rounded-md border border-white/10 hover:bg-white/[0.07] hover:border-white/20 transition-all"
                >
                  <div className="min-w-0">
                    <div className="font-display text-base font-bold text-white tracking-tight">
                      {member.name || "ללא שם"}
                    </div>
                    <div className="text-xs text-white/55 mt-0.5 truncate">
                      {member.email}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-3 py-1.5 rounded-full font-semibold tracking-[0.15em] uppercase ${
                      member.workspaceRole === "owner"
                        ? "bg-gold/20 text-gold border border-gold/40"
                        : member.workspaceRole === "admin"
                          ? "bg-gold/10 text-gold-soft border border-gold/25"
                          : "bg-white/10 text-white/70 border border-white/15"
                    }`}
                  >
                    {member.workspaceRole === "owner"
                      ? "בעלים"
                      : member.workspaceRole === "admin"
                        ? "מנהל"
                        : "סוכן"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Pending invitations */}
        {(invitationsQuery.data?.length ?? 0) > 0 && (
          <GlassCard className="p-5 sm:p-7">
            <h2 className="font-display text-xl font-bold text-white tracking-tight mb-5">
              הזמנות ממתינות
            </h2>
            <div className="space-y-2">
              {invitationsQuery.data?.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-3 p-4 bg-white/[0.04] rounded-md border border-white/10"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-white/5 border border-white/15 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-white/50" />
                    </div>
                    <div>
                      <div className="text-sm text-white truncate">{inv.email}</div>
                      <div className="text-[11px] text-white/45 mt-0.5">
                        {inv.status === "pending" && "ממתין לאישור"}
                        {inv.status === "expired" && "פג תוקף"}
                        {inv.status === "accepted" && "אושר"}
                        {inv.status === "revoked" && "בוטל"}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-white/45 font-mono">
                    {new Date(inv.createdAt).toLocaleDateString("he-IL")}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </CinematicShell>
  );
}
