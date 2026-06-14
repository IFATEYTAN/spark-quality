// SPARK AI · Tasks — "המשימות שלי היום"
// Aggregates the agent's due client reminders (overdue / today / upcoming) and
// a compact summary of the most urgent untreated triggers (P0/P1). Every row is
// actionable: mark done, dismiss, or reach the client directly.
import { useAuth } from "@/_core/hooks/useAuth";
import { CinematicShell, GlassCard, GoldEyebrow } from "@/components/CinematicShell";
import { trpc } from "@/lib/trpc";
import { TRIGGER_SCENARIOS, type TriggerKey } from "@/lib/triggerScenarios";
import {
  Loader2,
  ListChecks,
  CheckCircle2,
  X,
  Phone,
  Mail,
  CalendarClock,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";

type ReminderRow = {
  reminder: {
    id: number;
    clientId: number;
    triggerKey: string | null;
    note: string | null;
    remindAt: string | Date;
    status: string;
  };
  clientName: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
};

type Bucket = "overdue" | "today" | "upcoming";

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const endOfToday = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

function bucketOf(remindAt: Date): Bucket {
  if (remindAt < startOfToday()) return "overdue";
  if (remindAt <= endOfToday()) return "today";
  return "upcoming";
}

function triggerLabel(key: string | null): string | null {
  if (!key) return null;
  return TRIGGER_SCENARIOS[key as TriggerKey]?.title ?? key;
}

function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned.length >= 7 ? `tel:${cleaned}` : null;
}

const BUCKET_META: Record<Bucket, { label: string; tone: string; dot: string }> = {
  overdue: { label: "באיחור", tone: "text-rose-300", dot: "bg-rose-400" },
  today: { label: "להיום", tone: "text-gold", dot: "bg-gold" },
  upcoming: { label: "קרוב", tone: "text-white/70", dot: "bg-white/40" },
};

export default function Tasks() {
  const { loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/", { replace: true });
  }, [loading, isAuthenticated, navigate]);

  const remindersQuery = trpc.clientJourney.listDueReminders.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const metricsQuery = trpc.workspaces.metrics.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const setStatus = trpc.clientJourney.setReminderStatus.useMutation({
    onSuccess: () => {
      utils.clientJourney.listDueReminders.invalidate();
    },
    onError: (err) => toast.error("שגיאה בעדכון התזכורת", { description: err.message }),
  });

  const grouped = useMemo(() => {
    const rows = (remindersQuery.data ?? []) as ReminderRow[];
    const out: Record<Bucket, ReminderRow[]> = { overdue: [], today: [], upcoming: [] };
    for (const r of rows) {
      out[bucketOf(new Date(r.reminder.remindAt))].push(r);
    }
    return out;
  }, [remindersQuery.data]);

  const totalReminders =
    grouped.overdue.length + grouped.today.length + grouped.upcoming.length;

  // Most urgent untreated triggers (P0 + P1) for a compact "also waiting" strip.
  const urgent = useMemo(() => {
    const m = metricsQuery.data;
    if (!m) return [] as { key: TriggerKey; count: number }[];
    const keys: TriggerKey[] = [
      "poaExpired",
      "poaExpiring90d",
      "riskTemporary",
      "coverageEnding",
    ];
    return keys
      .map((key) => ({ key, count: (m as Record<string, number>)[key] ?? 0 }))
      .filter((t) => t.count > 0);
  }, [metricsQuery.data]);

  const handleDone = (id: number) =>
    setStatus.mutate({ reminderId: id, status: "fired" });
  const handleDismiss = (id: number) =>
    setStatus.mutate({ reminderId: id, status: "dismissed" });

  const renderRow = (r: ReminderRow) => {
    const tel = telHref(r.clientPhone);
    const label = triggerLabel(r.reminder.triggerKey);
    const due = new Date(r.reminder.remindAt);
    return (
      <div
        key={r.reminder.id}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors"
      >
        <div className="min-w-0">
          <div className="font-display font-bold text-white truncate">
            {r.clientName || "לקוח"}
          </div>
          {r.reminder.note && (
            <div className="text-sm text-white/65 truncate">{r.reminder.note}</div>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {label && (
              <span className="rounded bg-gold/15 px-2 py-0.5 text-[11px] font-bold text-gold">
                {label}
              </span>
            )}
            <span className="text-[11px] text-white/45 mono-num">
              {due.toLocaleDateString("he-IL")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {tel && (
            <a
              href={tel}
              className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/[0.06]"
            >
              <Phone className="h-3.5 w-3.5" /> חיוג
            </a>
          )}
          {r.clientEmail && (
            <a
              href={`mailto:${r.clientEmail}`}
              className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/[0.06]"
            >
              <Mail className="h-3.5 w-3.5" /> מייל
            </a>
          )}
          <button
            type="button"
            onClick={() => handleDone(r.reminder.id)}
            disabled={setStatus.isPending}
            className="inline-flex items-center gap-1 rounded-md bg-gold text-[#06101F] px-2.5 py-1.5 text-xs font-bold hover:bg-gold-light disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> בוצע
          </button>
          <button
            type="button"
            onClick={() => handleDismiss(r.reminder.id)}
            disabled={setStatus.isPending}
            className="inline-flex items-center justify-center rounded-md border border-white/15 p-1.5 text-white/60 hover:bg-white/[0.06] disabled:opacity-50"
            aria-label="התעלם מהתזכורת"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  };

  const renderBucket = (bucket: Bucket) => {
    const rows = grouped[bucket];
    if (rows.length === 0) return null;
    const meta = BUCKET_META[bucket];
    return (
      <div key={bucket} className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden />
          <span className={`text-sm font-bold ${meta.tone}`}>{meta.label}</span>
          <span className="mono-num text-xs text-white/45">
            {rows.length.toLocaleString("he-IL")}
          </span>
        </div>
        <GlassCard className="overflow-hidden p-0">{rows.map(renderRow)}</GlassCard>
      </div>
    );
  };

  return (
    <CinematicShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <GoldEyebrow>SPARK QUALITY · יום העבודה שלך</GoldEyebrow>
        <h1 className="font-display text-2xl lg:text-3xl font-black text-white tracking-tight mt-2 flex items-center gap-3">
          <ListChecks className="h-7 w-7 text-gold" />
          המשימות שלי היום
        </h1>
        <p className="mt-2 text-sm text-white/65">
          תזכורות שקבעת ללקוחות — מסודרות לפי דחיפות. סמן "בוצע" אחרי טיפול.
        </p>

        {/* Urgent triggers strip */}
        {urgent.length > 0 && (
          <Link
            href="/dashboard"
            className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-rose-400/30 bg-rose-500/[0.06] px-4 py-3 hover:bg-rose-500/[0.1] transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="h-4 w-4 text-rose-300 shrink-0" />
              <span className="text-sm text-white/85 truncate">
                גם ממתינים: {urgent.map((u) => `${triggerLabel(u.key)} (${u.count})`).join(" · ")}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-gold whitespace-nowrap">
              לדשבורד <ArrowLeft className="h-3.5 w-3.5" />
            </span>
          </Link>
        )}

        <div className="mt-7">
          {remindersQuery.isLoading ? (
            <div className="flex items-center justify-center py-20 text-white/50">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : totalReminders === 0 ? (
            <GlassCard className="p-10 text-center">
              <CalendarClock className="h-10 w-10 text-white/30 mx-auto mb-4" />
              <div className="font-display font-bold text-white mb-1">אין תזכורות פתוחות</div>
              <p className="text-sm text-white/55">
                כשתקבע תזכורת מתוך כרטיס לקוח, היא תופיע כאן ביום שבחרת.
              </p>
            </GlassCard>
          ) : (
            <>
              {renderBucket("overdue")}
              {renderBucket("today")}
              {renderBucket("upcoming")}
            </>
          )}
        </div>
      </div>
    </CinematicShell>
  );
}
