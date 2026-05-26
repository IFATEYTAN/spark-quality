/**
 * ClientDetailModal — Round 131
 *
 * Full client journey panel that opens when an agent clicks a client name in
 * the trigger list. Renders:
 *  - Client profile (name / age / phone / email / total balance / id number)
 *  - All trigger badges currently matching this client (real, multi-flag)
 *  - Tabs: יומן פעילות (activity timeline) | תזכורות
 *  - Action buttons: 📞 התקשר, 💬 וואטסאפ, 📧 מייל, 🗓 פגישה, 📝 הערה,
 *    ⏰ snooze, ✅ סמן כטופל, 🔄 הקצאה (admins/owners only)
 *
 * All data goes through `trpc.clientJourney.*` which enforces workspace +
 * agent isolation server-side. The reassign dropdown is only visible when
 * `useAuth().user.workspaceRole` is "admin" or "owner".
 */
import { useEffect, useMemo, useState } from "react";
import {
  Phone,
  MessageSquare,
  Mail,
  Calendar as CalendarIcon,
  StickyNote,
  Clock,
  CheckCircle2,
  UserCog,
  X,
  Loader2,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─────────────────────────────────────────────────────────────────
// Static catalogues
// ─────────────────────────────────────────────────────────────────

/** All 16 trigger keys → Hebrew label + bucket color. */
const TRIGGER_CATALOGUE: Record<
  string,
  { label: string; bucket: "urgent" | "opportunity" | "improvement" | "retention" }
> = {
  poaExpired: { label: "ייפוי כוח פג תוקף", bucket: "urgent" },
  poaExpiring90d: { label: "ייפוי כוח פג ב-90 יום", bucket: "urgent" },
  riskTemporary: { label: "ריסק זמני מסתיים", bucket: "urgent" },
  coverageEnding: { label: "כיסויים שפוגים", bucket: "urgent" },
  savingsNoInsurance: { label: "צבירה ללא ביטוח", bucket: "opportunity" },
  noActivePension: { label: "ללא פנסיה פעילה", bucket: "opportunity" },
  vipGoldPremium: { label: "VIP / זהב / פרימיום", bucket: "opportunity" },
  highFees: { label: "דמי ניהול גבוהים", bucket: "improvement" },
  age46NoLongTermCare: { label: "46+ ללא סיעודי", bucket: "improvement" },
  aumFrozen: { label: "AUM מוקפא", bucket: "improvement" },
  trackMismatch: { label: "מסלול לא מתאים לגיל", bucket: "improvement" },
  selfEmployedNoDeposit: { label: "עצמאי שלא הפקיד", bucket: "improvement" },
  concentrationRisk: { label: "ריכוז יתר בחברה", bucket: "improvement" },
  birthdayThisMonth: { label: "יום הולדת החודש", bucket: "retention" },
  birthdayMilestone: { label: "יום הולדת מפנה", bucket: "retention" },
  noEmail: { label: "ללא מייל", bucket: "retention" },
};

const BUCKET_BADGE: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-300 border-red-500/40",
  opportunity: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  improvement: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  retention: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
};

const ACTIVITY_ICON: Record<string, string> = {
  call: "📞",
  whatsapp: "💬",
  email: "📧",
  meeting: "🗓",
  note: "📝",
  sms: "✉️",
};

const ACTIVITY_LABEL: Record<string, string> = {
  call: "שיחת טלפון",
  whatsapp: "וואטסאפ",
  email: "מייל",
  meeting: "פגישה",
  note: "הערה",
  sms: "SMS",
};

type ActivityType = "call" | "whatsapp" | "email" | "meeting" | "note" | "sms";

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function fmtIls(n: number | string | null | undefined): string {
  const num = typeof n === "string" ? Number(n) : n;
  if (!num || num === 0 || Number.isNaN(num)) return "—";
  if (num >= 1_000_000) return `₪${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `₪${(num / 1_000).toFixed(0)}K`;
  return `₪${num.toLocaleString("he-IL")}`;
}

function ageFromBirthDate(birthDate: Date | string | null | undefined): number | null {
  if (!birthDate) return null;
  const d = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Sanitize phone for tel: link — strip spaces, dashes, parens. */
function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned.length >= 7 ? `tel:${cleaned}` : null;
}

function mailtoHref(email: string | null | undefined, name: string | null | undefined): string | null {
  if (!email) return null;
  const subject = encodeURIComponent("בנושא תיק הביטוח");
  const greeting = name ? `שלום ${name},\n\n` : "שלום,\n\n";
  return `mailto:${email}?subject=${subject}&body=${encodeURIComponent(greeting)}`;
}

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

interface Props {
  clientId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional — the trigger context the modal was opened from, used to default-tag activities. */
  triggerContext?: string;
  /** Called after a "טפלתי" click so the parent list can refresh. */
  onMarkHandled?: (clientId: number) => void;
}

export function ClientDetailModal({
  clientId,
  open,
  onOpenChange,
  triggerContext,
  onMarkHandled,
}: Props) {
  const { user } = useAuth();
  const role = (user as { workspaceRole?: string } | null)?.workspaceRole;
  const canReassign = role === "admin" || role === "owner";

  const utils = trpc.useUtils();
  const detailQuery = trpc.clientJourney.getDetail.useQuery(
    { clientId: clientId ?? 0 },
    { enabled: open && !!clientId, refetchOnWindowFocus: false },
  );

  // Note composer state
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteType, setNoteType] = useState<ActivityType>("note");
  const [noteOutcome, setNoteOutcome] = useState<string>("");
  const [noteContent, setNoteContent] = useState("");

  // Snooze state
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [snoozeDays, setSnoozeDays] = useState<string>("3");
  const [snoozeNote, setSnoozeNote] = useState("");

  // Reassign state
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignTarget, setReassignTarget] = useState<string>("");

  // Reset transient state every time the modal closes / opens for a new client
  useEffect(() => {
    if (!open) {
      setNoteOpen(false);
      setSnoozeOpen(false);
      setReassignOpen(false);
      setNoteContent("");
      setSnoozeNote("");
      setReassignTarget("");
    }
  }, [open, clientId]);

  // Members list — only fetched if user can reassign
  const membersQuery = trpc.workspaces.listMembers.useQuery(undefined, {
    enabled: canReassign && reassignOpen,
    refetchOnWindowFocus: false,
  });

  const logActivityMutation = trpc.clientJourney.logActivity.useMutation({
    onSuccess: () => {
      void utils.clientJourney.getDetail.invalidate({ clientId: clientId ?? 0 });
    },
  });

  const createReminderMutation = trpc.clientJourney.createReminder.useMutation({
    onSuccess: () => {
      void utils.clientJourney.getDetail.invalidate({ clientId: clientId ?? 0 });
    },
  });

  const setReminderStatusMutation = trpc.clientJourney.setReminderStatus.useMutation({
    onSuccess: () => {
      void utils.clientJourney.getDetail.invalidate({ clientId: clientId ?? 0 });
    },
  });

  const reassignMutation = trpc.clientJourney.reassign.useMutation({
    onSuccess: () => {
      void utils.clientJourney.getDetail.invalidate({ clientId: clientId ?? 0 });
      void utils.triggers.listClients.invalidate();
      void utils.workspaces.metrics.invalidate();
      toast.success("הלקוח הוקצה לסוכן אחר");
      setReassignOpen(false);
    },
    onError: e => toast.error("הקצאה נכשלה", { description: e.message }),
  });

  const markHandledMutation = trpc.triggers.markHandled.useMutation({
    onSuccess: () => {
      void utils.triggers.listClients.invalidate();
      void utils.triggers.handledCounts.invalidate();
    },
  });

  const detail = detailQuery.data ?? null;
  const client = detail?.client ?? null;
  const triggers: string[] = useMemo(() => detail?.triggers ?? [], [detail]);
  const activities = detail?.activities ?? [];
  const reminders = detail?.reminders ?? [];

  const clientName = client?.fullName ?? "לקוח ללא שם";
  const phone = client?.phone ?? null;
  const email = client?.email ?? null;
  const age = ageFromBirthDate(client?.birthDate);

  // Build action handlers
  const handleCall = () => {
    const href = telHref(phone);
    if (!href) {
      toast.error("אין מספר טלפון תקין ללקוח זה");
      return;
    }
    window.location.href = href;
    if (clientId) {
      logActivityMutation.mutate(
        {
          clientId,
          type: "call",
          triggerKey: triggerContext,
          content: "התקשר ללקוח (כפתור התקשר)",
        },
        {
          onSuccess: () => toast.success("השיחה נרשמה ביומן"),
        },
      );
    }
  };

  const handleEmail = () => {
    const href = mailtoHref(email, clientName);
    if (!href) {
      toast.error("אין כתובת מייל ללקוח זה");
      return;
    }
    window.location.href = href;
    if (clientId) {
      logActivityMutation.mutate(
        {
          clientId,
          type: "email",
          triggerKey: triggerContext,
          content: "פתח מייל ללקוח",
        },
        { onSuccess: () => toast.success("המייל נרשם ביומן") },
      );
    }
  };

  const handleSaveNote = () => {
    if (!clientId) return;
    if (!noteContent.trim()) {
      toast.error("צריך לכתוב תוכן");
      return;
    }
    logActivityMutation.mutate(
      {
        clientId,
        type: noteType,
        outcome: noteOutcome || undefined,
        content: noteContent.trim(),
        triggerKey: triggerContext,
      },
      {
        onSuccess: () => {
          toast.success("נוסף ליומן");
          setNoteContent("");
          setNoteOutcome("");
          setNoteOpen(false);
        },
        onError: e => toast.error("שמירה נכשלה", { description: e.message }),
      },
    );
  };

  const handleSnooze = () => {
    if (!clientId) return;
    const days = Number(snoozeDays);
    if (!Number.isFinite(days) || days < 1) {
      toast.error("מספר ימים לא תקין");
      return;
    }
    const remindAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    createReminderMutation.mutate(
      {
        clientId,
        remindAt,
        triggerKey: triggerContext,
        note: snoozeNote.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(`תזכורת נקבעה ל-${remindAt.toLocaleDateString("he-IL")}`);
          setSnoozeNote("");
          setSnoozeOpen(false);
        },
        onError: e => toast.error("יצירת תזכורת נכשלה", { description: e.message }),
      },
    );
  };

  const handleMarkHandled = () => {
    if (!clientId) return;
    if (!triggerContext) {
      toast.error("חסרה התראה לסימון");
      return;
    }
    markHandledMutation.mutate(
      { clientId, triggerKey: triggerContext as never },
      {
        onSuccess: () => {
          toast.success("סומן כטופל");
          onMarkHandled?.(clientId);
          onOpenChange(false);
        },
      },
    );
  };

  const handleReassignSubmit = () => {
    if (!clientId) return;
    const targetId = Number(reassignTarget);
    if (!Number.isFinite(targetId) || targetId <= 0) {
      toast.error("בחר סוכן לקבל את הלקוח");
      return;
    }
    reassignMutation.mutate({ clientId, newOwnerUserId: targetId });
  };

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="max-w-3xl max-h-[calc(100vh-1rem)] overflow-y-auto bg-card text-card-foreground"
      >
        <DialogHeader className="text-right">
          <DialogTitle className="text-xl flex items-center justify-between gap-2">
            <span>{clientName}</span>
            {age ? (
              <span className="text-sm font-normal text-muted-foreground">גיל {age}</span>
            ) : null}
          </DialogTitle>
          <DialogDescription className="text-right">
            ניהול מלא של הלקוח — שיחות, פגישות, תזכורות והערות.
          </DialogDescription>
        </DialogHeader>

        {detailQuery.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !client ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            הלקוח לא זמין (אין הרשאה או נמחק).
          </div>
        ) : (
          <>
            {/* Profile + triggers */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 mt-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">טלפון</div>
                  <div className="font-medium" dir="ltr">
                    {phone ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">מייל</div>
                  <div className="font-medium truncate" dir="ltr">
                    {email ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">צבירה</div>
                  <div className="font-medium">{fmtIls(client.totalBalance)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">ת״ז</div>
                  <div className="font-medium" dir="ltr">
                    {client.idNumber ?? "—"}
                  </div>
                </div>
              </div>

              {triggers.length > 0 ? (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="text-xs text-muted-foreground mb-2">
                    התראות פעילות ({triggers.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {triggers.map(t => {
                      const meta = TRIGGER_CATALOGUE[t];
                      return (
                        <Badge
                          key={t}
                          variant="outline"
                          className={`${meta ? BUCKET_BADGE[meta.bucket] : ""} text-xs`}
                        >
                          {meta?.label ?? t}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Action buttons row */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCall}
                disabled={!phone}
              >
                <Phone className="h-4 w-4 me-1" />
                התקשר
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleEmail}
                disabled={!email}
              >
                <Mail className="h-4 w-4 me-1" />
                מייל
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setNoteType("whatsapp");
                  setNoteOpen(true);
                }}
              >
                <MessageSquare className="h-4 w-4 me-1" />
                וואטסאפ (רישום)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setNoteType("meeting");
                  setNoteOpen(true);
                }}
              >
                <CalendarIcon className="h-4 w-4 me-1" />
                פגישה
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setNoteType("note");
                  setNoteOpen(true);
                }}
              >
                <StickyNote className="h-4 w-4 me-1" />
                הערה
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSnoozeOpen(true)}
              >
                <Clock className="h-4 w-4 me-1" />
                תזכורת
              </Button>
              {triggerContext ? (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleMarkHandled}
                  disabled={markHandledMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 me-1" />
                  טפלתי
                </Button>
              ) : null}
              {canReassign ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setReassignOpen(v => !v)}
                >
                  <UserCog className="h-4 w-4 me-1" />
                  הקצאה לסוכן אחר
                </Button>
              ) : null}
            </div>

            {/* Inline note composer */}
            {noteOpen ? (
              <div className="mt-4 rounded-lg border border-border bg-background p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">
                    {ACTIVITY_ICON[noteType]} רישום: {ACTIVITY_LABEL[noteType]}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setNoteOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Select value={noteType} onValueChange={v => setNoteType(v as ActivityType)}>
                    <SelectTrigger>
                      <SelectValue placeholder="סוג פעולה" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">📞 שיחת טלפון</SelectItem>
                      <SelectItem value="whatsapp">💬 וואטסאפ</SelectItem>
                      <SelectItem value="email">📧 מייל</SelectItem>
                      <SelectItem value="meeting">🗓 פגישה</SelectItem>
                      <SelectItem value="note">📝 הערה</SelectItem>
                      <SelectItem value="sms">✉️ SMS</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={noteOutcome || "_none"}
                    onValueChange={v => setNoteOutcome(v === "_none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="תוצאה (לא חובה)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— ללא —</SelectItem>
                      <SelectItem value="answered">ענה</SelectItem>
                      <SelectItem value="no_answer">לא ענה</SelectItem>
                      <SelectItem value="scheduled">תואמה פגישה</SelectItem>
                      <SelectItem value="not_interested">לא רלוונטי</SelectItem>
                      <SelectItem value="converted">סגירה</SelectItem>
                      <SelectItem value="needs_followup">דורש מעקב</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  placeholder="מה היה / מה הצעד הבא?"
                  rows={3}
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleSaveNote}
                    disabled={logActivityMutation.isPending || !noteContent.trim()}
                  >
                    <Send className="h-4 w-4 me-1" />
                    שמור
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Snooze panel */}
            {snoozeOpen ? (
              <div className="mt-4 rounded-lg border border-border bg-background p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">⏰ קביעת תזכורת</div>
                  <Button size="sm" variant="ghost" onClick={() => setSnoozeOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Select value={snoozeDays} onValueChange={setSnoozeDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">מחר</SelectItem>
                    <SelectItem value="3">בעוד 3 ימים</SelectItem>
                    <SelectItem value="7">בעוד שבוע</SelectItem>
                    <SelectItem value="14">בעוד שבועיים</SelectItem>
                    <SelectItem value="30">בעוד חודש</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="הערה לתזכורת (לא חובה)"
                  rows={2}
                  value={snoozeNote}
                  onChange={e => setSnoozeNote(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleSnooze}
                    disabled={createReminderMutation.isPending}
                  >
                    <Clock className="h-4 w-4 me-1" />
                    קבע תזכורת
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Reassign panel */}
            {reassignOpen && canReassign ? (
              <div className="mt-4 rounded-lg border border-border bg-background p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">🔄 הקצאה לסוכן אחר</div>
                  <Button size="sm" variant="ghost" onClick={() => setReassignOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Select value={reassignTarget} onValueChange={setReassignTarget}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוכן" />
                  </SelectTrigger>
                  <SelectContent>
                    {(membersQuery.data ?? []).map(m => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.name ?? m.email ?? `משתמש #${m.id}`}
                        {m.workspaceRole ? ` · ${m.workspaceRole}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleReassignSubmit}
                    disabled={!reassignTarget || reassignMutation.isPending}
                  >
                    <UserCog className="h-4 w-4 me-1" />
                    אשר הקצאה
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Tabs: activities + reminders */}
            <Tabs defaultValue="activities" className="mt-4" dir="rtl">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="activities">
                  יומן פעילות ({activities.length})
                </TabsTrigger>
                <TabsTrigger value="reminders">
                  תזכורות ({reminders.filter(r => r.status === "pending").length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="activities" className="mt-3">
                {activities.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    אין עדיין פעולות מתועדות. תיעוד שיחה / מייל יופיע כאן.
                  </div>
                ) : (
                  <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {activities.map(a => (
                      <li
                        key={a.id}
                        className="rounded-md border border-border bg-muted/20 p-2.5"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span>
                            {ACTIVITY_ICON[a.type] ?? "•"}{" "}
                            <span className="font-medium text-foreground">
                              {ACTIVITY_LABEL[a.type] ?? a.type}
                            </span>
                            {a.outcome ? <span className="ms-1">· {a.outcome}</span> : null}
                          </span>
                          <span>{fmtDateTime(a.createdAt)}</span>
                        </div>
                        {a.content ? (
                          <div className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                            {a.content}
                          </div>
                        ) : null}
                        {a.triggerKey ? (
                          <Badge variant="outline" className="mt-1.5 text-[10px]">
                            {TRIGGER_CATALOGUE[a.triggerKey]?.label ?? a.triggerKey}
                          </Badge>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="reminders" className="mt-3">
                {reminders.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    אין תזכורות פעילות.
                  </div>
                ) : (
                  <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {reminders.map(r => (
                      <li
                        key={r.id}
                        className={`rounded-md border border-border p-2.5 ${
                          r.status === "pending" ? "bg-amber-500/5" : "bg-muted/10 opacity-70"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span>
                            ⏰ <span className="font-medium text-foreground">להזכיר</span> ·{" "}
                            {fmtDateTime(r.remindAt)}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {r.status === "pending"
                              ? "פעילה"
                              : r.status === "fired"
                                ? "הוצגה"
                                : r.status === "dismissed"
                                  ? "בוטלה"
                                  : "סגורה"}
                          </Badge>
                        </div>
                        {r.note ? (
                          <div className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                            {r.note}
                          </div>
                        ) : null}
                        {r.status === "pending" ? (
                          <div className="mt-2 flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setReminderStatusMutation.mutate(
                                  { reminderId: r.id, status: "dismissed" },
                                  {
                                    onSuccess: () => toast.success("תזכורת בוטלה"),
                                  },
                                )
                              }
                              disabled={setReminderStatusMutation.isPending}
                            >
                              ביטול
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setReminderStatusMutation.mutate(
                                  { reminderId: r.id, status: "fired" },
                                  {
                                    onSuccess: () => toast.success("סומנה כסגורה"),
                                  },
                                )
                              }
                              disabled={setReminderStatusMutation.isPending}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 me-1" />
                              סגור
                            </Button>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}

        <div className="flex justify-end mt-4 pt-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 me-1" />
            סגירה
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
