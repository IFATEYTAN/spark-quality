// SPARK AI · ClientDetailDrawer — מציג פרטי לקוח מלאים + עריכת VIP/הערות/דגל
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  Crown,
  Mail,
  Phone,
  X,
  User,
  Save,
  Loader2,
  Wallet,
  Sparkles,
  TrendingUp,
  Shield,
  FileWarning,
  Calendar,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ClientDetailModal } from "./ClientDetailModal";
import { Sparkles as SparklesIcon, Rocket } from "lucide-react";

/** Hebrew label + bucket for each trigger key shown as a badge. */
const TRIGGER_LABELS: Record<string, { label: string; bucket: "urgent" | "opportunity" | "improvement" | "retention" }> = {
  noActivePension: { label: "ללא פנסיה פעילה", bucket: "opportunity" },
  vipGoldPremium: { label: "VIP / זהב", bucket: "opportunity" },
  highFees: { label: "דמי ניהול גבוהים", bucket: "improvement" },
  age46NoLongTermCare: { label: "46+ ללא סיעודי", bucket: "improvement" },
  liquidContinuingEducation: { label: "השתלמות נזילה", bucket: "opportunity" },
  tikun190Eligible: { label: "זכאי לתיקון 190", bucket: "opportunity" },
  riskEnding: { label: "ריסק מסתיים", bucket: "urgent" },
  coverageGaps: { label: "חוסרי כיסוי", bucket: "urgent" },
  poaExpiring: { label: "ייפוי כוח פוקע", bucket: "urgent" },
  birthdayThisMonth: { label: "יום הולדת החודש", bucket: "retention" },
  noEmail: { label: "חסר מייל", bucket: "improvement" },
  inactive: { label: "חוסר מגע שנתי", bucket: "retention" },
  noLifeInsurance: { label: "אין ביטוח חיים", bucket: "urgent" },
  noHealth: { label: "אין ביטוח בריאות", bucket: "improvement" },
  underInsured: { label: "תת-ביטוח", bucket: "improvement" },
  highBalance: { label: "צבירה גבוהה", bucket: "opportunity" },
};

const BUCKET_BADGE: Record<string, string> = {
  urgent: "bg-rose-500/15 text-rose-300 border-rose-400/40",
  opportunity: "bg-gold/15 text-gold border-gold/50",
  improvement: "bg-amber-500/15 text-amber-200 border-amber-400/40",
  retention: "bg-emerald-500/15 text-emerald-200 border-emerald-400/40",
};

type FlagStatus =
  | "regular"
  | "liquid_fund"
  | "tikun_190"
  | "high_fees"
  | "risk_ending"
  | "coverage_gaps";

const FLAG_OPTIONS: { value: FlagStatus; label: string; icon: typeof Sparkles }[] = [
  { value: "regular", label: "רגיל", icon: User },
  { value: "liquid_fund", label: "השתלמות נזילה", icon: Sparkles },
  { value: "tikun_190", label: "תיקון 190", icon: Wallet },
  { value: "high_fees", label: "דמי ניהול גבוהים", icon: TrendingUp },
  { value: "risk_ending", label: "ריסק מסתיים", icon: Shield },
  { value: "coverage_gaps", label: "חוסרי כיסוי", icon: FileWarning },
];

export type ClientDetailRow = {
  id: number;
  fullName: string | null;
  idNumber: string;
  email: string | null;
  phone: string | null;
  isVip: boolean;
  notes: string | null;
  flagStatus?: string | null;
  totalBalance?: string | number | null;
  birthDate?: Date | string | null;
  createdAt?: Date | string;
};

export function ClientDetailDrawer({
  client,
  onClose,
  onSaved,
}: {
  client: ClientDetailRow | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [isVip, setIsVip] = useState(false);
  const [notes, setNotes] = useState("");
  const [flagStatus, setFlagStatus] = useState<FlagStatus>("regular");

  useEffect(() => {
    if (!client) return;
    setIsVip(client.isVip);
    setNotes(client.notes ?? "");
    setFlagStatus((client.flagStatus as FlagStatus) ?? "regular");
  }, [client]);

  const utils = trpc.useUtils();
  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: async () => {
      toast.success("הלקוח עודכן בהצלחה");
      await utils.clients.list.invalidate();
      onSaved?.();
      onClose();
    },
    onError: (err: { message?: string } | null) => {
      toast.error(err?.message ?? "שגיאה בשמירה");
    },
  });

  const [journeyOpen, setJourneyOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: async () => {
      toast.success("הלקוח וכל הנתונים המשויכים נמחקו לצמיתות");
      await utils.clients.list.invalidate();
      onSaved?.();
      onClose();
    },
    onError: (err: { message?: string } | null) => {
      toast.error(err?.message ?? "שגיאה במחיקה");
    },
  });

  // Reset the two-step confirm whenever a different client is opened.
  useEffect(() => {
    setConfirmDelete(false);
  }, [client?.id]);

  // Fetch active triggers for the badges panel.
  const detailQuery = trpc.clientJourney.getDetail.useQuery(
    { clientId: client?.id ?? 0 },
    { enabled: !!client?.id, refetchOnWindowFocus: false },
  );

  if (!client) return null;

  const totalBalance = Number(client.totalBalance ?? 0);
  const activeTriggers = (detailQuery.data?.triggers ?? []) as string[];
  const dirty =
    isVip !== client.isVip ||
    notes !== (client.notes ?? "") ||
    flagStatus !== ((client.flagStatus as FlagStatus) ?? "regular");

  return (
    <div
      className="fixed inset-0 z-50 bg-[#06101F]/85 backdrop-blur-sm flex items-stretch justify-end"
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-gradient-to-b from-[#0A1A30] to-[#06101F] border-r border-white/10 overflow-y-auto"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-5 border-b border-white/10 sticky top-0 bg-[#06101F]/95 backdrop-blur z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-full border flex items-center justify-center shrink-0 ${
                client.isVip
                  ? "bg-gradient-to-br from-gold to-[#B89346] border-gold text-[#06101F] shadow-md shadow-gold/40"
                  : "bg-gradient-to-br from-gold/30 to-gold/10 border-gold/40 text-gold"
              }`}
            >
              {client.isVip ? <Crown className="h-5 w-5" /> : <User className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold text-white truncate">
                {client.fullName ?? `לקוח ${client.idNumber}`}
              </h2>
              <p className="text-[11px] text-white/50 font-mono">ת"ז · {client.idNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-white/65 hover:text-white hover:bg-white/10 transition"
            aria-label="סגירה"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Read-only data */}
        <section className="p-5 border-b border-white/5 space-y-3">
          {client.email && (
            <Row icon={Mail} label="מייל" value={client.email} mono={false} />
          )}
          {client.phone && <Row icon={Phone} label="טלפון" value={client.phone} mono />}
          {client.birthDate && (
            <Row
              icon={Calendar}
              label="תאריך לידה"
              value={new Date(client.birthDate).toLocaleDateString("he-IL")}
              mono
            />
          )}
          {totalBalance > 0 && (
            <Row
              icon={Wallet}
              label="סך צבירה"
              value={`₪${totalBalance.toLocaleString("he-IL", { maximumFractionDigits: 0 })}`}
              mono
            />
          )}
          {client.createdAt && (
            <Row
              icon={Calendar}
              label="נוסף לתיק"
              value={new Date(client.createdAt).toLocaleDateString("he-IL")}
              mono
            />
          )}
        </section>

        {/* Active triggers + journey CTA (Round 132) */}
        <section className="p-5 border-b border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-gold tracking-wider uppercase">
              <SparklesIcon className="h-3 w-3 inline ml-1.5" />
              התראות פעילות
            </label>
            <span className="text-[10px] text-white/45">
              {detailQuery.isLoading ? "טוען…" : `${activeTriggers.length} פעילות`}
            </span>
          </div>
          {detailQuery.isLoading ? (
            <div className="text-xs text-white/45">בודק התראות…</div>
          ) : activeTriggers.length === 0 ? (
            <div className="text-xs text-white/55">
              ללקוח זה אין כרגע התראות פעילות — מצב טוב.
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {activeTriggers.map((t) => {
                const meta = TRIGGER_LABELS[t];
                const cls = meta ? BUCKET_BADGE[meta.bucket] : "bg-white/[0.04] text-white/65 border-white/15";
                return (
                  <span
                    key={t}
                    className={`inline-flex items-center px-2 py-1 rounded-md border text-[10px] font-semibold ${cls}`}
                  >
                    {meta?.label ?? t}
                  </span>
                );
              })}
            </div>
          )}
          <button
            type="button"
            onClick={() => setJourneyOpen(true)}
            className="w-full mt-2 py-2.5 rounded-md border border-gold/50 bg-gradient-to-br from-gold/15 to-gold/5 text-gold text-xs font-bold hover:from-gold/25 hover:to-gold/10 transition flex items-center justify-center gap-2"
          >
            <Rocket className="h-3.5 w-3.5" />
            פתח כרטיס מסע מלא (יומן, מיילים, תזכורות)
          </button>
        </section>

        {/* Editable */}
        <section className="p-5 space-y-5">
          <div>
            <label className="text-[11px] font-bold text-gold tracking-wider uppercase mb-2 block">
              סטטוס VIP
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsVip(true)}
                className={`flex-1 py-2.5 rounded-md border text-xs font-bold transition ${
                  isVip
                    ? "bg-gradient-to-br from-gold to-[#B89346] text-[#06101F] border-gold"
                    : "bg-white/[0.03] text-white/65 border-white/15 hover:border-gold/40"
                }`}
              >
                <Crown className="h-3.5 w-3.5 inline ml-1.5" />
                VIP
              </button>
              <button
                type="button"
                onClick={() => setIsVip(false)}
                className={`flex-1 py-2.5 rounded-md border text-xs font-bold transition ${
                  !isVip
                    ? "bg-white/15 text-white border-white/30"
                    : "bg-white/[0.03] text-white/65 border-white/15 hover:border-white/30"
                }`}
              >
                רגיל
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gold tracking-wider uppercase mb-2 block">
              דגל מערכתי
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FLAG_OPTIONS.map((opt) => {
                const active = flagStatus === opt.value;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFlagStatus(opt.value)}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md border text-[11px] font-semibold transition ${
                      active
                        ? "bg-gold/15 text-gold border-gold/50"
                        : "bg-white/[0.03] text-white/65 border-white/15 hover:border-gold/40 hover:text-gold"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gold tracking-wider uppercase mb-2 block">
              הערות פנימיות
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הוסיפי תזכורת או הערה לעצמך…"
              rows={4}
              className="w-full bg-white/[0.04] border border-white/15 rounded-md px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50 resize-none"
              dir="rtl"
            />
          </div>
        </section>

        {/* Danger zone — permanent deletion (right-to-erasure) */}
        <section className="p-5 border-t border-rose-500/20">
          <label className="text-[11px] font-bold text-rose-300/90 tracking-wider uppercase mb-2 block">
            <Trash2 className="h-3 w-3 inline ml-1.5" />
            אזור מחיקה
          </label>
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full py-2.5 rounded-md border border-rose-400/40 bg-rose-500/10 text-rose-200 text-xs font-bold hover:bg-rose-500/20 transition flex items-center justify-center gap-2"
            >
              <Trash2 className="h-3.5 w-3.5" />
              מחיקת לקוח לצמיתות
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-rose-200/90 leading-relaxed">
                פעולה זו תמחק את הלקוח, הפוליסות, ההתראות, היומן והתזכורות — ללא אפשרות שחזור. להמשיך?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 py-2.5 rounded-md border border-white/15 bg-white/[0.03] text-white/80 text-xs font-bold hover:bg-white/[0.08] transition"
                >
                  ביטול
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate({ clientId: client.id })}
                  disabled={deleteMutation.isPending}
                  className="flex-1 py-2.5 rounded-md border border-rose-400/60 bg-rose-500/80 text-white text-xs font-bold hover:bg-rose-500 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  כן, מחק לצמיתות
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-[#06101F]/95 backdrop-blur border-t border-white/10 p-5 flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 border-white/15 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:border-white/30"
          >
            ביטול
          </Button>
          <Button
            type="button"
            onClick={() =>
              updateMutation.mutate({
                clientId: client.id,
                isVip,
                notes,
                flagStatus,
              })
            }
            disabled={!dirty || updateMutation.isPending}
            className="flex-1 bg-gradient-to-br from-gold to-[#B89346] text-[#06101F] font-bold hover:shadow-lg hover:shadow-gold/30 disabled:opacity-50"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 ml-2" />
            )}
            שמירה
          </Button>
        </div>
      </aside>

      {/* Round 132 — full client journey panel */}
      <ClientDetailModal
        clientId={journeyOpen ? client.id : null}
        open={journeyOpen}
        onOpenChange={(o) => setJourneyOpen(o)}
      />
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-md bg-white/[0.04] border border-white/10 flex items-center justify-center text-gold/85 shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-white/45 uppercase tracking-wider mb-0.5">{label}</p>
        <p className={`text-sm text-white truncate ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}

export const _clientDetailFlagOptions = FLAG_OPTIONS;
