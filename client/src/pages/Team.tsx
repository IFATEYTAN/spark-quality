// SPARK AI · Team Management - ניהול חברי הצוות בבית הסוכן
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Copy, Loader2, Mail, Plus, Sparkles, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

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
      window.location.href = "/";
    }
  }, [loading, isAuthenticated]);

  const userRole = (user as { workspaceRole?: string } | null)?.workspaceRole;
  const isAdmin = userRole === "owner" || userRole === "admin";

  // Redirect if not admin
  useEffect(() => {
    if (user && !isAdmin) {
      toast.error("אין לך הרשאות לגשת למסך הזה");
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
    onSuccess: data => {
      setGeneratedToken(data.token);
      toast.success("ההזמנה נוצרה!");
      utils.workspaces.listInvitations.invalidate();
      setInviteEmail("");
    },
    onError: err => {
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
      <div className="min-h-screen flex items-center justify-center bg-navy-deep">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-deep text-white">
      <header className="border-b border-white/10">
        <div className="container mx-auto py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-gold" />
            <span className="font-serif text-lg text-gold">SPARK AI</span>
          </div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-white/70">
              <ArrowRight className="h-4 w-4 ml-1" />
              לדשבורד
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto py-8 max-w-4xl">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-serif text-white mb-2">ניהול צוות</h1>
            <p className="text-white/60">
              הזמן סוכנים לסוכנות ונהל את ההרשאות שלהם
            </p>
          </div>
          <Button
            onClick={() => {
              setShowInviteForm(true);
              setGeneratedToken(null);
            }}
            className="bg-gold text-navy-deep hover:bg-gold/90"
          >
            <UserPlus className="h-4 w-4 ml-2" />
            הזמנת סוכן חדש
          </Button>
        </div>

        {showInviteForm && (
          <Card className="p-6 mb-6 bg-white/5 border-gold/30">
            <h2 className="text-xl font-serif text-white mb-4">הזמנת סוכן חדש</h2>
            {!generatedToken ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-white/80 mb-2 block">אימייל</Label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="agent@example.com"
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white/80 mb-2 block">הרשאה</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={v => setInviteRole(v as "admin" | "agent")}
                  >
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">
                        סוכן - רואה רק את הלקוחות שלו
                      </SelectItem>
                      <SelectItem value="admin">
                        מנהל - רואה את כל הסוכנות
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowInviteForm(false)}
                    className="border-white/20 text-white hover:bg-white/10"
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
                    disabled={!inviteEmail.includes("@") || inviteMutation.isPending}
                    className="bg-gold text-navy-deep hover:bg-gold/90 flex-1"
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
                <div className="bg-gold/10 border border-gold/30 rounded p-4">
                  <p className="text-sm text-white/80 mb-2">
                    שלח את הקישור הבא לסוכן באימייל או בוואטסאפ:
                  </p>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={inviteUrl ?? ""}
                      className="bg-navy-deep/50 border-white/20 text-white text-xs font-mono"
                    />
                    <Button
                      onClick={copyInviteLink}
                      className="bg-gold text-navy-deep hover:bg-gold/90"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-white/50 mt-2">
                    הקישור פעיל ל-7 ימים
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowInviteForm(false);
                    setGeneratedToken(null);
                  }}
                  className="border-white/20 text-white hover:bg-white/10 w-full"
                >
                  סגירה
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Members list */}
        <Card className="p-6 bg-white/5 border-white/10 mb-6">
          <h2 className="text-xl font-serif text-white mb-4">חברי הצוות הפעילים</h2>
          {membersQuery.isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-gold mx-auto" />
          ) : (membersQuery.data?.length ?? 0) === 0 ? (
            <p className="text-white/50 text-center py-8">
              אין חברי צוות. הזמן סוכן ראשון להתחיל.
            </p>
          ) : (
            <div className="space-y-2">
              {membersQuery.data?.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/5"
                >
                  <div>
                    <div className="text-white font-medium">{member.name || "ללא שם"}</div>
                    <div className="text-xs text-white/50">{member.email}</div>
                  </div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full ${
                      member.workspaceRole === "owner"
                        ? "bg-gold/20 text-gold"
                        : member.workspaceRole === "admin"
                        ? "bg-[var(--plum-soft)]/30 text-white"
                        : "bg-white/10 text-white/70"
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
        </Card>

        {/* Pending invitations */}
        {(invitationsQuery.data?.length ?? 0) > 0 && (
          <Card className="p-6 bg-white/5 border-white/10">
            <h2 className="text-xl font-serif text-white mb-4">הזמנות ממתינות</h2>
            <div className="space-y-2">
              {invitationsQuery.data?.map(inv => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-white/50" />
                    <div>
                      <div className="text-white text-sm">{inv.email}</div>
                      <div className="text-xs text-white/40">
                        {inv.status === "pending" && "ממתין לאישור"}
                        {inv.status === "expired" && "פג תוקף"}
                        {inv.status === "accepted" && "אושר"}
                        {inv.status === "revoked" && "בוטל"}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-white/40">
                    {new Date(inv.createdAt).toLocaleDateString("he-IL")}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
