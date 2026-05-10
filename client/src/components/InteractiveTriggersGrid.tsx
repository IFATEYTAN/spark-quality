/**
 * InteractiveTriggersGrid — Round 93.
 *
 * Shows the agent her active triggers as a Priority Queue:
 *   - 4 color buckets (urgent / opportunity / improvement / retention)
 *   - top stats bar with REAL DB counts (total in queue, handled today,
 *     biggest opportunity)
 *   - per-trigger card with progress bar (handled / total) and 3 actions:
 *       1. צפה ברשימה   → opens TriggerClientsModal
 *       2. שלח וואטסאפ → opens WhatsAppComposerModalV2 (no specific client)
 *       3. טפלתי        → marks the FIRST unhandled client as handled
 *                          (so the bar moves immediately, single click)
 *
 * Only triggers with count > 0 render. Hidden when totalClients === 0.
 *
 * Counts come from the metrics object the parent Dashboard already fetches;
 * handled counts come from `trpc.triggers.handledCounts`.
 */
import { useMemo, useState } from "react";
import { ListChecks, MessageSquare, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { GlassCard, GoldEyebrow } from "./CinematicShell";
import { WhatsAppComposerModalV2 } from "./WhatsAppComposerModalV2";
import { TriggerClientsModal } from "./TriggerClientsModal";
import type { TriggerKey } from "@/lib/triggerScenarios";

export interface TriggerCounts {
  poaExpired: number;
  poaExpiring90d: number;
  riskTemporary: number;
  coverageEnding: number;
  savingsNoInsurance: number;
  noActivePension: number;
  age46NoLongTermCare: number;
  aumFrozen: number;
  highFees: number;
  trackMismatch: number;
  selfEmployedNoDeposit: number;
  concentrationRisk: number;
  birthdayMilestone: number;
  birthdayThisMonth: number;
  vipGoldPremium: number;
  noEmail: number;
}

type Bucket = "urgent" | "opportunity" | "improvement" | "retention";

interface TriggerDef {
  key: TriggerKey;
  countKey: keyof TriggerCounts;
  bucket: Bucket;
  label: string;
  hint: string;
}

/**
 * Trigger catalog — the single source of truth for the interactive queue.
 * Only the 8 most actionable triggers (the rest still appear inside
 * PriorityActionGroups below).
 */
const TRIGGERS: TriggerDef[] = [
  // Urgent (red) — legal / time-bound
  {
    key: "poaExpired",
    countKey: "poaExpired",
    bucket: "urgent",
    label: "ייפוי כוח פג תוקף",
    hint: "דחיפות משפטית — כל יום עיכוב פוגע בהסמכה לפעול בתיק.",
  },
  {
    key: "poaExpiring90d",
    countKey: "poaExpiring90d",
    bucket: "urgent",
    label: "ייפוי כוח פג ב-90 ימים",
    hint: "חידוש מקדים מונע ניתוק שירות וקנסות מיידיים.",
  },
  {
    key: "riskTemporary",
    countKey: "riskTemporary",
    bucket: "urgent",
    label: "ריסק זמני מסתיים",
    hint: "ללא חידוש — הלקוח חשוף לתביעה ללא כיסוי חיים.",
  },
  // Opportunity (gold) — money on the table
  {
    key: "savingsNoInsurance",
    countKey: "savingsNoInsurance",
    bucket: "opportunity",
    label: "צבירה ללא ביטוח",
    hint: "כסף יושב חשוף — כל לקוח כאן הוא הזדמנות מיידית להגנה+עמלה.",
  },
  {
    key: "noActivePension",
    countKey: "noActivePension",
    bucket: "opportunity",
    label: "ללא פנסיה פעילה",
    hint: "לקוח עובד שלא מפריש — הזדמנות לפתיחת קרן חדשה.",
  },
  {
    key: "vipGoldPremium",
    countKey: "vipGoldPremium",
    bucket: "opportunity",
    label: "VIP — לקוחות זהב",
    hint: "הצבירה הכי גבוהה בתיק. חודש בלי פגישה = סיכון נטישה.",
  },
  // Improvement (orange) — fix-it
  {
    key: "highFees",
    countKey: "highFees",
    bucket: "improvement",
    label: "דמי ניהול גבוהים",
    hint: "הורדת דמי ניהול = שימור מיידי + הצדקה לפגישת ייעוץ.",
  },
  {
    key: "age46NoLongTermCare",
    countKey: "age46NoLongTermCare",
    bucket: "improvement",
    label: "46+ ללא סיעודי",
    hint: "החלון לרכישת סיעודי במחיר אטרקטיבי נסגר עם הגיל.",
  },
  // Retention (emerald) — keep them happy
  {
    key: "birthdayThisMonth",
    countKey: "birthdayThisMonth",
    bucket: "retention",
    label: "יום הולדת החודש",
    hint: "ברכה אישית = +30% פתיחת הודעה. הזדמנות זולה לחיזוק קשר.",
  },
  {
    key: "noEmail",
    countKey: "noEmail",
    bucket: "retention",
    label: "ללא מייל בקובץ",
    hint: "ערוץ קשר חסר. בקש בנימוס וחזק את הזיהוי הדיגיטלי.",
  },
];

const BUCKET_STYLE: Record<Bucket, { ring: string; chip: string; label: string }> = {
  urgent: {
    ring: "border-[#dc2626]/60 hover:border-[#dc2626]",
    chip: "bg-[#dc2626]/15 text-[#fca5a5] border-[#dc2626]/40",
    label: "דחוף",
  },
  opportunity: {
    ring: "border-[#CCA45E]/60 hover:border-[#CCA45E]",
    chip: "bg-[#CCA45E]/15 text-[#CCA45E] border-[#CCA45E]/40",
    label: "הזדמנות",
  },
  improvement: {
    ring: "border-[#d97706]/60 hover:border-[#d97706]",
    chip: "bg-[#d97706]/15 text-[#fdba74] border-[#d97706]/40",
    label: "שיפור",
  },
  retention: {
    ring: "border-[#059669]/60 hover:border-[#059669]",
    chip: "bg-[#059669]/15 text-[#6ee7b7] border-[#059669]/40",
    label: "שימור",
  },
};

interface Props {
  counts: TriggerCounts;
  agentName: string;
}

export function InteractiveTriggersGrid({ counts, agentName }: Props) {
  const utils = trpc.useUtils();
  const handledCountsQuery = trpc.triggers.handledCounts.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const handledMap = handledCountsQuery.data ?? {};

  const markHandledMutation = trpc.triggers.markHandled.useMutation({
    onSuccess: () => {
      utils.triggers.handledCounts.invalidate();
    },
    onError: err => toast.error("לא הצלחתי לסמן כטופל", { description: err.message }),
  });

  // Modal state
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerTrigger, setComposerTrigger] = useState<TriggerDef | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [listTrigger, setListTrigger] = useState<TriggerDef | null>(null);

  // Active = total > 0
  const activeTriggers = useMemo(
    () => TRIGGERS.filter(t => (counts[t.countKey] ?? 0) > 0),
    [counts],
  );

  // ── Stats bar ─────────────────────────────────────────────
  const totalActions = activeTriggers.reduce((sum, t) => sum + (counts[t.countKey] ?? 0), 0);
  const totalHandled = activeTriggers.reduce(
    (sum, t) => sum + (handledMap[t.key] ?? 0),
    0,
  );
  const biggestOpportunity = activeTriggers
    .filter(t => t.bucket === "opportunity")
    .sort((a, b) => (counts[b.countKey] ?? 0) - (counts[a.countKey] ?? 0))[0];

  if (activeTriggers.length === 0) return null;

  const handleMarkFirstHandled = async (trigger: TriggerDef) => {
    if (markHandledMutation.isPending) return;
    try {
      const clients = await utils.triggers.listClients.fetch({ triggerKey: trigger.key });
      const firstUnhandled = clients.find(c => !c.handled);
      if (!firstUnhandled) {
        toast.info("כל הלקוחות בקטגוריה כבר טופלו", {
          description: trigger.label,
        });
        return;
      }
      await markHandledMutation.mutateAsync({
        clientId: firstUnhandled.id,
        triggerKey: trigger.key,
      });
      toast.success("סומן כטופל", {
        description: `${firstUnhandled.fullName ?? "לקוח"} · ${trigger.label}`,
      });
    } catch (err) {
      toast.error("שגיאה", { description: (err as Error).message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <GlassCard className="p-5">
        <div className="mb-4">
          <GoldEyebrow>תור הפעולות שלך — היום</GoldEyebrow>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile label="סה״כ פעולות פתוחות" value={totalActions.toString()} />
          <StatTile label="טופלו עד כה" value={totalHandled.toString()} accent="emerald" />
          <StatTile
            label="קטגוריות פעילות"
            value={`${activeTriggers.length} / ${TRIGGERS.length}`}
          />
          <StatTile
            label="הזדמנות עליונה"
            value={biggestOpportunity?.label ?? "—"}
            small
          />
        </div>
      </GlassCard>

      {/* Trigger cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeTriggers.map(t => {
          const total = counts[t.countKey] ?? 0;
          const handled = handledMap[t.key] ?? 0;
          const pct = total > 0 ? Math.min(100, Math.round((handled / total) * 100)) : 0;
          const style = BUCKET_STYLE[t.bucket];
          return (
            <GlassCard
              key={t.key}
              className={`p-5 border-2 transition ${style.ring}`}
            >
              <div className="flex items-start justify-between mb-2">
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded border ${style.chip}`}
                >
                  {style.label}
                </span>
                <span className="text-3xl font-display font-black text-white tabular-nums">
                  {total}
                </span>
              </div>
              <h4 className="text-base font-bold text-white mb-1">{t.label}</h4>
              <p className="text-xs text-white/55 leading-relaxed mb-4 min-h-[2.5rem]">
                {t.hint}
              </p>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-[11px] text-white/60 mb-1.5">
                  <span>
                    {handled} / {total} טופלו
                  </span>
                  <span className="tabular-nums">{pct}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor:
                        t.bucket === "urgent"
                          ? "#dc2626"
                          : t.bucket === "opportunity"
                            ? "#CCA45E"
                            : t.bucket === "improvement"
                              ? "#d97706"
                              : "#059669",
                    }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 px-2 text-xs border-white/20 hover:bg-white/10"
                  onClick={() => {
                    setListTrigger(t);
                    setListOpen(true);
                  }}
                >
                  <ListChecks className="h-3 w-3 me-1" />
                  רשימה
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 px-2 text-xs border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/20"
                  onClick={() => {
                    setComposerTrigger(t);
                    setComposerOpen(true);
                  }}
                >
                  <MessageSquare className="h-3 w-3 me-1" />
                  וואטסאפ
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-8 px-2 text-xs bg-gold/90 hover:bg-gold text-[#06101F]"
                  onClick={() => handleMarkFirstHandled(t)}
                  disabled={markHandledMutation.isPending || handled >= total}
                >
                  {markHandledMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-3 w-3 me-1" />
                      טפלתי
                    </>
                  )}
                </Button>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Modals */}
      {composerTrigger ? (
        <WhatsAppComposerModalV2
          open={composerOpen}
          onOpenChange={setComposerOpen}
          client={null}
          triggerKey={composerTrigger.key}
          triggerLabel={composerTrigger.label}
          triggerHint={composerTrigger.hint}
          agentName={agentName}
        />
      ) : null}
      {listTrigger ? (
        <TriggerClientsModal
          open={listOpen}
          onOpenChange={setListOpen}
          triggerKey={listTrigger.key}
          triggerLabel={listTrigger.label}
          triggerHint={listTrigger.hint}
          bucket={listTrigger.bucket}
          agentName={agentName}
        />
      ) : null}
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
  small,
}: {
  label: string;
  value: string;
  accent?: "emerald";
  small?: boolean;
}) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3">
      <div className="text-[11px] uppercase tracking-wider text-white/55 mb-1">
        {label}
      </div>
      <div
        className={`font-display font-black text-white ${
          small ? "text-base leading-tight" : "text-2xl"
        } ${accent === "emerald" ? "text-emerald-300" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
