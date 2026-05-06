// SPARK AI · Admin Panel — Super-Admin cross-workspace management (SPARK staff only)
import { useAuth } from "@/_core/hooks/useAuth";
import { CinematicShell, GlassCard, GoldEyebrow } from "@/components/CinematicShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import {
  AlertCircle,
  Building2,
  Inbox,
  Loader2,
  Mail,
  Pause,
  Play,
  Phone,
  ScrollText,
  ShieldCheck,
  ShieldOff,
  Users as UsersIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const ILS = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});

const STATUS_HE: Record<string, string> = {
  new: "חדש",
  read: "נקרא",
  replied: "נענה",
  archived: "בארכיון",
};

const PLAN_HE: Record<string, string> = {
  trial: "ניסיון",
  basic: "בסיסי",
  premium: "פרימיום",
  enterprise: "ארגוני",
};

export default function AdminPanel() {
  const { user, loading, isAuthenticated } = useAuth();
  const isSuperAdmin = !!user?.isSuperAdmin;

  if (loading) {
    return (
      <CinematicShell heroAsset="hero" showSidebar>
        <div className="flex items-center justify-center min-h-[60vh] text-white/70">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          טוען...
        </div>
      </CinematicShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <CinematicShell heroAsset="hero" showSidebar>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
          <ShieldCheck className="h-12 w-12 text-gold/70" />
          <h2 className="text-2xl text-white font-light">אזור מנהל מערכת</h2>
          <p className="text-white/60 max-w-md">
            יש להתחבר עם חשבון Super-Admin של SPARK AI כדי לצפות בפאנל הניהול.
          </p>
          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            className="bg-gold hover:bg-gold/90 text-black"
          >
            התחברות
          </Button>
        </div>
      </CinematicShell>
    );
  }

  if (!isSuperAdmin) {
    return (
      <CinematicShell heroAsset="hero" showSidebar>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
          <AlertCircle className="h-12 w-12 text-red-400/80" />
          <h2 className="text-2xl text-white font-light">אין הרשאה</h2>
          <p className="text-white/60 max-w-md">
            אזור זה מיועד לצוות SPARK AI בלבד. אם את חושבת שזו טעות, פני לאחת מ-Super-Admins הקיימות לקבלת הרשאה.
          </p>
        </div>
      </CinematicShell>
    );
  }

  return (
    <CinematicShell heroAsset="hero" showSidebar>
      <div className="px-4 lg:px-8 py-8 max-w-7xl mx-auto space-y-6">
        <header>
          <GoldEyebrow>SPARK AI · ניהול מערכת</GoldEyebrow>
          <h1 className="text-3xl lg:text-4xl text-white font-light tracking-tight">
            פאנל מנהל מערכת
          </h1>
          <p className="text-white/60 mt-2 max-w-2xl">
            מבט-על על כל הסוכנויות, המשתמשים, הפניות והפעולות במערכת. רק Super-Admins של SPARK AI רואים את האזור הזה.
          </p>
        </header>

        <DashboardStats />

        <Tabs defaultValue="workspaces" className="w-full" dir="rtl">
          <TabsList className="bg-white/[0.04] border border-white/10 backdrop-blur-md p-1 h-auto flex-wrap gap-1 justify-start">
            <TabsTrigger
              value="workspaces"
              className="data-[state=active]:bg-gold/20 data-[state=active]:text-gold data-[state=active]:border-gold/40 border border-transparent text-white/70 hover:text-white hover:bg-white/[0.06] transition px-4 py-2 rounded-md"
            >
              <Building2 className="h-4 w-4 ml-2" />
              סוכנויות
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="data-[state=active]:bg-gold/20 data-[state=active]:text-gold data-[state=active]:border-gold/40 border border-transparent text-white/70 hover:text-white hover:bg-white/[0.06] transition px-4 py-2 rounded-md"
            >
              <UsersIcon className="h-4 w-4 ml-2" />
              משתמשים
            </TabsTrigger>
            <TabsTrigger
              value="contacts"
              className="data-[state=active]:bg-gold/20 data-[state=active]:text-gold data-[state=active]:border-gold/40 border border-transparent text-white/70 hover:text-white hover:bg-white/[0.06] transition px-4 py-2 rounded-md"
            >
              <Inbox className="h-4 w-4 ml-2" />
              פניות
            </TabsTrigger>
            <TabsTrigger
              value="audit"
              className="data-[state=active]:bg-gold/20 data-[state=active]:text-gold data-[state=active]:border-gold/40 border border-transparent text-white/70 hover:text-white hover:bg-white/[0.06] transition px-4 py-2 rounded-md"
            >
              <ScrollText className="h-4 w-4 ml-2" />
              לוג פעולות
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workspaces" className="mt-6">
            <WorkspacesTab />
          </TabsContent>
          <TabsContent value="users" className="mt-6">
            <UsersTab currentUserId={user?.id ?? 0} />
          </TabsContent>
          <TabsContent value="contacts" className="mt-6">
            <ContactsTab />
          </TabsContent>
          <TabsContent value="audit" className="mt-6">
            <AuditTab />
          </TabsContent>
        </Tabs>
      </div>
    </CinematicShell>
  );
}

// ============================================================
// Dashboard Stats
// ============================================================
function DashboardStats() {
  const { data, isLoading } = trpc.admin.dashboard.useQuery();
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <GlassCard key={i} className="p-4">
            <div className="h-12 animate-pulse bg-white/5 rounded" />
          </GlassCard>
        ))}
      </div>
    );
  }

  const items = [
    { label: "סוכנויות פעילות", value: `${data.workspaces.active}/${data.workspaces.total}` },
    { label: "משתמשים", value: data.users.toLocaleString("he-IL") },
    { label: "לקוחות במערכת", value: data.clients.toLocaleString("he-IL") },
    { label: "AUM כולל", value: ILS.format(data.aum) },
    { label: "דוחות שעלו", value: data.reports.toLocaleString("he-IL") },
    { label: "פניות חדשות", value: data.contactsNew.toLocaleString("he-IL"), accent: data.contactsNew > 0 },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {items.map(it => (
        <GlassCard key={it.label} className="p-4 min-w-0" goldAccent={it.accent}>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/55 mb-2 whitespace-nowrap overflow-hidden text-ellipsis" dir="rtl">
            {it.label}
          </p>
          <p className={`text-2xl font-semibold leading-tight whitespace-nowrap overflow-hidden text-ellipsis ${it.accent ? "text-gold" : "text-white"}`} dir="ltr">
            {it.value}
          </p>
        </GlassCard>
      ))}
    </div>
  );
}

// ============================================================
// Workspaces Tab
// ============================================================
function WorkspacesTab() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.listWorkspaces.useQuery();
  const suspendMut = trpc.admin.setWorkspaceSuspended.useMutation({
    onSuccess: () => {
      utils.admin.listWorkspaces.invalidate();
      utils.admin.dashboard.invalidate();
    },
  });
  const planMut = trpc.admin.setWorkspacePlan.useMutation({
    onSuccess: () => utils.admin.listWorkspaces.invalidate(),
  });
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(w => w.name.toLowerCase().includes(q));
  }, [data, search]);

  if (isLoading) return <SkeletonRows />;

  return (
    <div className="space-y-3">
      <Input
        placeholder="חיפוש סוכנות..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="bg-white/5 border-white/10 text-white max-w-sm"
      />
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-white/5 text-white/60 text-xs">
              <tr>
                <th className="px-4 py-3 font-normal">שם</th>
                <th className="px-4 py-3 font-normal">חבילה</th>
                <th className="px-4 py-3 font-normal">סטטוס</th>
                <th className="px-4 py-3 font-normal">חברים</th>
                <th className="px-4 py-3 font-normal">לקוחות</th>
                <th className="px-4 py-3 font-normal">דוחות</th>
                <th className="px-4 py-3 font-normal">AUM</th>
                <th className="px-4 py-3 font-normal">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-white/40">לא נמצאו סוכנויות.</td>
                </tr>
              )}
              {filtered.map(w => (
                <tr key={w.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 text-white">{w.name}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={w.plan}
                      onValueChange={v =>
                        planMut.mutate(
                          { workspaceId: w.id, plan: v as "trial" | "basic" | "premium" | "enterprise" },
                          {
                            onSuccess: () => toast.success(`חבילה עודכנה ל-${PLAN_HE[v] ?? v}`),
                            onError: e => toast.error(e.message),
                          }
                        )
                      }
                    >
                      <SelectTrigger className="h-8 w-32 bg-white/5 border-white/10 text-xs text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trial">{PLAN_HE.trial}</SelectItem>
                        <SelectItem value="basic">{PLAN_HE.basic}</SelectItem>
                        <SelectItem value="premium">{PLAN_HE.premium}</SelectItem>
                        <SelectItem value="enterprise">{PLAN_HE.enterprise}</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    {w.suspendedAt ? (
                      <Badge variant="destructive" className="bg-red-500/20 text-red-300 border-red-500/30">
                        מושעית
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">פעילה</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/80">{w.memberCount}</td>
                  <td className="px-4 py-3 text-white/80">{w.clientCount}</td>
                  <td className="px-4 py-3 text-white/80">{w.reportCount}</td>
                  <td className="px-4 py-3 text-gold">{ILS.format(w.totalAum)}</td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white/80 hover:bg-white/10"
                      onClick={() =>
                        suspendMut.mutate(
                          { workspaceId: w.id, suspended: !w.suspendedAt },
                          {
                            onSuccess: () =>
                              toast.success(w.suspendedAt ? "הסוכנות הופעלה מחדש" : "הסוכנות הושעתה"),
                            onError: e => toast.error(e.message),
                          }
                        )
                      }
                    >
                      {w.suspendedAt ? <Play className="h-3 w-3 ml-1" /> : <Pause className="h-3 w-3 ml-1" />}
                      {w.suspendedAt ? "הפעלה" : "השעיה"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

// ============================================================
// Users Tab
// ============================================================
function UsersTab({ currentUserId }: { currentUserId: number }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.listUsers.useQuery();
  const suspendMut = trpc.admin.setUserSuspended.useMutation({
    onSuccess: () => utils.admin.listUsers.invalidate(),
  });
  const superAdminMut = trpc.admin.setUserSuperAdmin.useMutation({
    onSuccess: () => utils.admin.listUsers.invalidate(),
  });
  const roleMut = trpc.admin.setUserWorkspaceRole.useMutation({
    onSuccess: () => utils.admin.listUsers.invalidate(),
  });
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      u =>
        (u.name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.workspaceName ?? "").toLowerCase().includes(q)
    );
  }, [data, search]);

  if (isLoading) return <SkeletonRows />;

  return (
    <div className="space-y-3">
      <Input
        placeholder="חיפוש משתמש (שם / מייל / סוכנות)..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="bg-white/5 border-white/10 text-white max-w-sm"
      />
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-white/5 text-white/60 text-xs">
              <tr>
                <th className="px-4 py-3 font-normal">שם</th>
                <th className="px-4 py-3 font-normal">מייל</th>
                <th className="px-4 py-3 font-normal">סוכנות</th>
                <th className="px-4 py-3 font-normal">תפקיד</th>
                <th className="px-4 py-3 font-normal">סטטוס</th>
                <th className="px-4 py-3 font-normal">חיבור אחרון</th>
                <th className="px-4 py-3 font-normal">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-white/40">לא נמצאו משתמשים.</td>
                </tr>
              )}
              {filtered.map(u => (
                <tr key={u.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 text-white">
                    {u.name ?? "—"}
                    {u.isSuperAdmin && (
                      <Badge className="bg-gold/20 text-gold border-gold/30 mr-2 text-[10px]">SUPER</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/70">{u.email ?? "—"}</td>
                  <td className="px-4 py-3 text-white/70">{u.workspaceName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={u.workspaceRole ?? "agent"}
                      onValueChange={v =>
                        roleMut.mutate(
                          { userId: u.id, role: v as "owner" | "admin" | "agent" },
                          {
                            onSuccess: () => toast.success("התפקיד עודכן"),
                            onError: e => toast.error(e.message),
                          }
                        )
                      }
                    >
                      <SelectTrigger className="h-8 w-28 bg-white/5 border-white/10 text-xs text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">בעלים</SelectItem>
                        <SelectItem value="admin">מנהל</SelectItem>
                        <SelectItem value="agent">סוכן</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    {u.suspendedAt ? (
                      <Badge variant="destructive" className="bg-red-500/20 text-red-300 border-red-500/30">
                        מושעה
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">פעיל</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs">
                    {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleString("he-IL") : "—"}
                  </td>
                  <td className="px-4 py-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white/80 hover:bg-white/10 h-7 text-xs"
                      disabled={u.id === currentUserId}
                      onClick={() =>
                        suspendMut.mutate(
                          { userId: u.id, suspended: !u.suspendedAt },
                          {
                            onSuccess: () => toast.success(u.suspendedAt ? "המשתמש הופעל" : "המשתמש הושעה"),
                            onError: e => toast.error(e.message),
                          }
                        )
                      }
                    >
                      {u.suspendedAt ? "הפעלה" : "השעיה"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-7 text-xs ${
                        u.isSuperAdmin
                          ? "border-red-500/30 text-red-300 hover:bg-red-500/10"
                          : "border-gold/30 text-gold hover:bg-gold/10"
                      }`}
                      disabled={u.id === currentUserId && u.isSuperAdmin}
                      onClick={() =>
                        superAdminMut.mutate(
                          { userId: u.id, value: !u.isSuperAdmin },
                          {
                            onSuccess: () =>
                              toast.success(
                                u.isSuperAdmin ? "הרשאת Super-Admin הוסרה" : "הרשאת Super-Admin הוקצתה"
                              ),
                            onError: e => toast.error(e.message),
                          }
                        )
                      }
                    >
                      {u.isSuperAdmin ? <ShieldOff className="h-3 w-3 ml-1" /> : <ShieldCheck className="h-3 w-3 ml-1" />}
                      {u.isSuperAdmin ? "הסר Super" : "הפוך ל-Super"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

// ============================================================
// Contacts Tab
// ============================================================
function ContactsTab() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "read" | "replied" | "archived">("all");
  const { data, isLoading } = trpc.admin.listContactSubmissions.useQuery(
    statusFilter === "all" ? undefined : { status: statusFilter }
  );
  const updateMut = trpc.admin.updateContactSubmissionStatus.useMutation({
    onSuccess: () => {
      utils.admin.listContactSubmissions.invalidate();
      utils.admin.dashboard.invalidate();
    },
  });
  const [openId, setOpenId] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  if (isLoading) return <SkeletonRows />;

  const opened = data?.find(d => d.id === openId);

  return (
    <div className="space-y-3">
      <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)}>
        <SelectTrigger className="bg-white/5 border-white/10 text-white max-w-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">כל הפניות</SelectItem>
          <SelectItem value="new">חדשות</SelectItem>
          <SelectItem value="read">נקראו</SelectItem>
          <SelectItem value="replied">נענו</SelectItem>
          <SelectItem value="archived">בארכיון</SelectItem>
        </SelectContent>
      </Select>

      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-white/5 text-white/60 text-xs">
              <tr>
                <th className="px-4 py-3 font-normal">שם</th>
                <th className="px-4 py-3 font-normal">מייל</th>
                <th className="px-4 py-3 font-normal">טלפון</th>
                <th className="px-4 py-3 font-normal">מקור</th>
                <th className="px-4 py-3 font-normal">סטטוס</th>
                <th className="px-4 py-3 font-normal">תאריך</th>
                <th className="px-4 py-3 font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {(!data || data.length === 0) && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-white/40">אין פניות לתצוגה.</td>
                </tr>
              )}
              {data?.map(c => (
                <tr key={c.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 text-white">{c.name}</td>
                  <td className="px-4 py-3 text-white/70 ltr-num">
                    <a href={`mailto:${c.email}`} className="hover:text-gold inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {c.email}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-white/70 ltr-num">
                    {c.phone ? (
                      <a href={`tel:${c.phone}`} className="hover:text-gold inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {c.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs">{c.source ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        c.status === "new"
                          ? "bg-gold/20 text-gold border-gold/30"
                          : c.status === "replied"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : c.status === "archived"
                              ? "bg-white/10 text-white/60 border-white/20"
                              : "bg-white/10 text-white/80 border-white/20"
                      }
                    >
                      {STATUS_HE[c.status] ?? c.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs">
                    {new Date(c.createdAt).toLocaleString("he-IL")}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white/80 hover:bg-white/10 h-7 text-xs"
                      onClick={() => {
                        setOpenId(c.id);
                        setNoteDraft(c.adminNote ?? "");
                      }}
                    >
                      פתח
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <Dialog
        open={openId !== null}
        onOpenChange={open => {
          if (!open) setOpenId(null);
        }}
      >
        <DialogContent className="bg-[#06101F] border border-white/10 text-white max-w-xl">
          <DialogHeader>
            <DialogTitle>פנייה מ-{opened?.name}</DialogTitle>
            <DialogDescription className="text-white/50">
              {opened?.email} · {opened?.phone ?? "ללא טלפון"} ·{" "}
              {opened?.createdAt ? new Date(opened.createdAt).toLocaleString("he-IL") : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-md p-4 text-sm whitespace-pre-wrap">
              {opened?.message}
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">הערה פנימית</label>
              <Textarea
                value={noteDraft}
                onChange={e => setNoteDraft(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 flex-wrap">
            {(["read", "replied", "archived"] as const).map(s => (
              <Button
                key={s}
                size="sm"
                onClick={() => {
                  if (!opened) return;
                  updateMut.mutate(
                    { id: opened.id, status: s, adminNote: noteDraft || undefined },
                    {
                      onSuccess: () => {
                        toast.success(`הפנייה סומנה כ${STATUS_HE[s]}`);
                        setOpenId(null);
                      },
                      onError: e => toast.error(e.message),
                    }
                  );
                }}
                className={
                  s === "replied"
                    ? "bg-gold hover:bg-gold/90 text-black"
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                }
              >
                סמן כ{STATUS_HE[s]}
              </Button>
            ))}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Audit Tab
// ============================================================
function AuditTab() {
  const { data, isLoading } = trpc.admin.listAuditLog.useQuery();
  if (isLoading) return <SkeletonRows />;
  return (
    <GlassCard className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-white/5 text-white/60 text-xs">
            <tr>
              <th className="px-4 py-3 font-normal">זמן</th>
              <th className="px-4 py-3 font-normal">משתמש</th>
              <th className="px-4 py-3 font-normal">פעולה</th>
              <th className="px-4 py-3 font-normal">ישות</th>
              <th className="px-4 py-3 font-normal">פירוט</th>
            </tr>
          </thead>
          <tbody>
            {(!data || data.length === 0) && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-white/40">אין פעולות מתועדות עדיין.</td>
              </tr>
            )}
            {data?.map(row => (
              <tr key={row.id} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-4 py-3 text-white/50 text-xs">
                  {new Date(row.createdAt).toLocaleString("he-IL")}
                </td>
                <td className="px-4 py-3 text-white">{row.actorName ?? row.actorEmail ?? "מערכת"}</td>
                <td className="px-4 py-3 text-gold font-mono text-xs">{row.action}</td>
                <td className="px-4 py-3 text-white/70">
                  {row.entityType ?? "—"}
                  {row.entityId ? `#${row.entityId}` : ""}
                </td>
                <td className="px-4 py-3 text-white/60 text-xs">{row.detail ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

function SkeletonRows() {
  return (
    <GlassCard className="p-4 space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-10 bg-white/5 animate-pulse rounded" />
      ))}
    </GlassCard>
  );
}
