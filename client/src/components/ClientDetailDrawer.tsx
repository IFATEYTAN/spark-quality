// SPARK AI · ClientDetailDrawer — מציג פרטי לקוח מלאים + עריכת VIP/הערות/דגל + ניסוח AI
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  Calendar,
  CheckCheck,
  Clock,
  Crown,
  FileWarning,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Save,
  Shield,
  Sparkles,
  TrendingUp,
  User,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ClientAIComposerModal } from "@/components/ClientAIComposerModal";

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
  const [composerChannel, setComposerChannel] = useState<"email" | "whatsapp" | null>(null);

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

  if (!client) return null;

  const totalBalance = Number(client.totalBalance ?? 0);
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

        {/* AI Composer actions */}
        <section className="p-5 border-b border-white/5 space-y-2">
          <label className="text-[11px] font-bold text-gold tracking-wider uppercase mb-1 block">
            ניסוח אוטומטי ב-AI
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                if (!client.email) {
                  toast.error("ללקוח אין מייל בתיק");
                  return;
                }
                setComposerChannel("email");
              }}
              className="group flex items-center justify-center gap-2 rounded-md border border-gold/40 bg-gold/[0.08] px-3 py-2.5 text-xs font-bold text-gold transition hover:bg-gold/15 hover:border-gold disabled:opacity-40"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <Mail className="h-3.5 w-3.5" />
              <span>נסחי אימייל</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!client.phone) {
                  toast.error("ללקוח אין טלפון בתיק");
                  return;
                }
                setComposerChannel("whatsapp");
              }}
              className="group flex items-center justify-center gap-2 rounded-md border border-emerald-400/40 bg-emerald-500/[0.08] px-3 py-2.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/15 hover:border-emerald-400"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <MessageSquare className="h-3.5 w-3.5" />
              <span>נסחי WhatsApp</span>
            </button>
          </div>
          <p className="text-[10px] text-white/40">
            ה-AI ינסח הודעה מותאמת אישית לפי הדגל והצבירה של הלקוח.
          </p>
        </section>

        <OutreachHistory clientId={client.id} />

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

      <ClientAIComposerModal
        client={client}
        channel={composerChannel}
        onClose={() => setComposerChannel(null)}
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

function OutreachHistory({ clientId }: { clientId: number }) {
  const historyQuery = trpc.outreach.listForClient.useQuery(
    { clientId, limit: 10 },
    { staleTime: 30_000 }
  );
  const messages = historyQuery.data ?? [];

  if (historyQuery.isLoading) {
    return (
      <section className="p-5 border-b border-white/5">
        <label className="text-[11px] font-bold text-gold tracking-wider uppercase mb-2 block">
          היסטוריית פניות
        </label>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          טוען...
        </div>
      </section>
    );
  }

  if (messages.length === 0) return null;

  return (
    <section className="p-5 border-b border-white/5 space-y-2">
      <label className="text-[11px] font-bold text-gold tracking-wider uppercase mb-2 block">
        היסטוריית פניות · {messages.length}
      </label>
      <div className="space-y-2">
        {messages.map((m) => {
          const isEmail = m.channel === "email";
          const isSent = m.status === "sent";
          const ChannelIcon = isEmail ? Mail : MessageSquare;
          const when = new Date(m.createdAt).toLocaleString("he-IL", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
          const preview = (m.subject || m.body || "").trim().slice(0, 90);
          return (
            <div
              key={m.id}
              className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2.5"
            >
              <div className="flex items-center gap-2 mb-1">
                <ChannelIcon
                  className={`h-3.5 w-3.5 ${isEmail ? "text-gold" : "text-emerald-300"}`}
                />
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isSent ? "text-emerald-300" : "text-white/45"
                  }`}
                >
                  {isSent ? (
                    <span className="flex items-center gap-1">
                      <CheckCheck className="h-3 w-3" />
                      נשלח
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      טיוטה
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-white/35 mr-auto font-mono">{when}</span>
              </div>
              <div className="text-xs text-white/75 line-clamp-2 leading-snug">{preview}</div>
              {m.source === "template" && (
                <div className="mt-1 text-[9px] text-amber-300/80">תבנית (LLM לא היה זמין)</div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export const _clientDetailFlagOptions = FLAG_OPTIONS;
