// SPARK AI · Priority Action Groups — 5 collapsible priority groups (P0–P4)
// Replaces the old flat 6-category ActionCenter. Maps to the new 16-trigger model.
//
// Each group is collapsible (P0 + P1 open by default). Inside, triggers are
// rendered as cards with count, label, description, and CTA. Clicking the CTA
// opens the existing scenario modal (CategoryScenarioModal) so we keep the
// downstream flow.
import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { GoldEyebrow } from "./CinematicShell";
import { CategoryScenarioModal } from "./CategoryScenarioModal";

export interface PriorityCounts {
  // P0
  poaExpired: number;
  poaExpiring90d: number;
  // P1
  riskTemporary: number;
  coverageEnding: number;
  // P2
  savingsNoInsurance: number;
  noActivePension: number;
  age46NoLongTermCare: number;
  aumFrozen: number;
  // P3
  highFees: number;
  trackMismatch: number;
  selfEmployedNoDeposit: number;
  concentrationRisk: number;
  // P4
  birthdayMilestone: number;
  birthdayThisMonth: number;
  vipGoldPremium: number;
  noEmail: number;
}

type ScenarioKey =
  | "vip"
  | "lowYield"
  | "190"
  | "discount"
  | "risk"
  | "coverageGaps";

type Priority = "P0" | "P1" | "P2" | "P3" | "P4";

interface TriggerDef {
  key: keyof PriorityCounts;
  scenarioKey: ScenarioKey;
  name: string;
  description: string;
  cta: string;
  emoji: string;
}

interface GroupDef {
  priority: Priority;
  pillLabel: string; // e.g. "P0 · קריטי משפטי"
  title: string;
  defaultOpen: boolean;
  triggers: TriggerDef[];
}

const GROUPS: GroupDef[] = [
  {
    priority: "P0",
    pillLabel: "P0 · קריטי משפטי",
    title: "ייפוי כוח — פגיעה בהסמכה",
    defaultOpen: true,
    triggers: [
      {
        key: "poaExpired",
        scenarioKey: "190",
        name: "ייפוי כוח שפג",
        description: "חוזר 2013 — מינוי פג = חשיפה משפטית. טיפול לפני כל דבר.",
        cta: "חידוש דיגיטלי עכשיו ←",
        emoji: "🔐",
      },
      {
        key: "poaExpiring90d",
        scenarioKey: "190",
        name: "מינוי פוקע — 90 יום",
        description: "פנייה לחידוש לפני שיפוג. תהליך דיגיטלי — 3 דקות.",
        cta: "שלח לחידוש ←",
        emoji: "⏰",
      },
    ],
  },
  {
    priority: "P1",
    pillLabel: "P1 · דחוף",
    title: "ריסק זמני וכיסויים שפוגים",
    defaultOpen: true,
    triggers: [
      {
        key: "riskTemporary",
        scenarioKey: "risk",
        name: "ריסק זמני",
        description: "כיסוי בסטטוס זמני — עלול להיקטע. טלפון תוך 48 שעות.",
        cta: "התקשר עכשיו ←",
        emoji: "⚡",
      },
      {
        key: "coverageEnding",
        scenarioKey: "coverageGaps",
        name: "כיסויים שפוגים",
        description: "תאריך תום כיסוי מתקרב — הצעת חידוש מוכנה.",
        cta: "שלח הצעה ←",
        emoji: "📅",
      },
    ],
  },
  {
    priority: "P2",
    pillLabel: "P2 · הזדמנות גבוהה",
    title: "הכנסות שמחכות לטיפול",
    defaultOpen: false,
    triggers: [
      {
        key: "savingsNoInsurance",
        scenarioKey: "coverageGaps",
        name: "חיסכון ללא ביטוח",
        description: "יש קרן / גמל — אין ביטוח. קרוס-סייל ישיר.",
        cta: "הגדר קמפיין ←",
        emoji: "💡",
      },
      {
        key: "noActivePension",
        scenarioKey: "coverageGaps",
        name: "ללא פנסיה פעילה",
        description: "חיסכון ללא קרן פנסיה — ממוינים לפי גיל.",
        cta: "ראה רשימה ←",
        emoji: "🎯",
      },
      {
        key: "age46NoLongTermCare",
        scenarioKey: "coverageGaps",
        name: "46+ ללא ביטוח סיעוד",
        description: "לפני 60 הפרמיה נגישה — חלון הזמן מצטמצם.",
        cta: "שלח הצעה ←",
        emoji: "🏥",
      },
      {
        key: "aumFrozen",
        scenarioKey: "lowYield",
        name: "AUM מוקפא",
        description: "מוצר לא פעיל + צבירה מעל 30K.",
        cta: "שיחת בירור ←",
        emoji: "💰",
      },
    ],
  },
  {
    priority: "P3",
    pillLabel: "P3 · שיפור תיק",
    title: "תיק טוב יותר = לקוח נאמן יותר",
    defaultOpen: false,
    triggers: [
      {
        key: "highFees",
        scenarioKey: "discount",
        name: "דמי ניהול גבוהים",
        description: "מעל ממוצע השוק — משא ומתן מול החברה.",
        cta: "הצג עלות שנתית ←",
        emoji: "📉",
      },
      {
        key: "trackMismatch",
        scenarioKey: "lowYield",
        name: "מסלול לא מתאים לגיל",
        description: "55+ במסלול מניות — ייעוץ לפני פרישה.",
        cta: "ייעוץ מסלול ←",
        emoji: "📊",
      },
      {
        key: "selfEmployedNoDeposit",
        scenarioKey: "190",
        name: "עצמאים שלא הפקידו",
        description: "עצמאי / בעל שליטה — חשיפת מס.",
        cta: "שיחת ייעוץ ←",
        emoji: "💼",
      },
      {
        key: "concentrationRisk",
        scenarioKey: "lowYield",
        name: "ריכוז יתר בחברה",
        description: "מעל 35% AUM בחברה אחת.",
        cta: "ראה ניתוח ←",
        emoji: "🏦",
      },
    ],
  },
  {
    priority: "P4",
    pillLabel: "P4 · שימור ונגיעה",
    title: "לקוח שמרגיש ראוי — לא עוזב",
    defaultOpen: false,
    triggers: [
      {
        key: "birthdayMilestone",
        scenarioKey: "vip",
        name: "יום הולדת מפנה",
        description: "גיל 40 / 50 / 60 — וואטסאפ + הצעת פגישת סקירה.",
        cta: "שלח וואטסאפ ←",
        emoji: "🎂",
      },
      {
        key: "birthdayThisMonth",
        scenarioKey: "vip",
        name: "יום הולדת החודש",
        description: "הודעת וואטסאפ אישית מוכנה — ללא מאמץ.",
        cta: "שלח ברכות ←",
        emoji: "🎁",
      },
      {
        key: "vipGoldPremium",
        scenarioKey: "vip",
        name: "VIP · זהב · פרימיום",
        description: "לקוחות עם צבירה גבוהה — פגישה שנתית.",
        cta: "קבע פגישה ←",
        emoji: "👑",
      },
      {
        key: "noEmail",
        scenarioKey: "coverageGaps",
        name: "ללא מייל",
        description: "SMS לבקשת עדכון פרטי קשר — חיוני לדיוור.",
        cta: "שלח SMS ←",
        emoji: "✉️",
      },
    ],
  },
];

// Palette-aligned tones: gold + white opacities only (no rainbow).
// Priority is conveyed through gold intensity, ring strength, and opacity — not colored hues.
const PRIORITY_COLORS: Record<Priority, { dot: string; pill: string; border: string; cta: string; num: string }> = {
  P0: {
    dot: "bg-gold",
    pill: "bg-gold/15 text-gold border-gold/45",
    border: "border-gold/55",
    cta: "text-gold",
    num: "text-gold",
  },
  P1: {
    dot: "bg-gold/85",
    pill: "bg-gold/10 text-gold border-gold/35",
    border: "border-gold/35",
    cta: "text-gold",
    num: "text-white",
  },
  P2: {
    dot: "bg-gold/65",
    pill: "bg-white/[0.05] text-white/85 border-white/15",
    border: "border-white/12",
    cta: "text-white/85",
    num: "text-white",
  },
  P3: {
    dot: "bg-gold/45",
    pill: "bg-white/[0.04] text-white/75 border-white/12",
    border: "border-white/10",
    cta: "text-white/75",
    num: "text-white/90",
  },
  P4: {
    dot: "bg-white/35",
    pill: "bg-white/[0.04] text-white/70 border-white/10",
    border: "border-white/10",
    cta: "text-white/70",
    num: "text-white/85",
  },
};

interface PriorityActionGroupsProps {
  counts: PriorityCounts;
  eyebrow?: string;
  title?: ReactNode;
  subtitle?: string;
}

export function PriorityActionGroups({
  counts,
  eyebrow = "SPARK QUALITY ENGINE · מרכז הפעולות",
  title,
  subtitle,
}: PriorityActionGroupsProps) {
  const [activeScenario, setActiveScenario] = useState<ScenarioKey | null>(null);
  // Tabs: each priority is its own discrete "screen" — only the active one renders.
  const [activeTab, setActiveTab] = useState<Priority>("P0");

  const totalActive = useMemo(() => {
    return Object.values(counts).reduce((s, n) => s + (n ?? 0), 0);
  }, [counts]);

  const groupTotals = useMemo(() => {
    const map: Partial<Record<Priority, number>> = {};
    for (const g of GROUPS) {
      map[g.priority] = g.triggers.reduce((s, t) => s + (counts[t.key] ?? 0), 0);
    }
    return map as Record<Priority, number>;
  }, [counts]);

  const activeGroup = GROUPS.find((g) => g.priority === activeTab) ?? GROUPS[0];
  const activeColors = PRIORITY_COLORS[activeTab];
  const activeCount = groupTotals[activeTab] ?? 0;

  return (
    <section className="mb-10 animate-fade-up">
      <div className="mb-5">
        <GoldEyebrow>{eyebrow}</GoldEyebrow>
        <h2 className="font-display text-2xl lg:text-3xl font-black text-white tracking-tight mt-2">
          {title ?? (
            <>
              הצעדים הבאים שלכם —{" "}
              <span className="text-gold mono-num">{totalActive}</span>{" "}
              הזדמנויות פעילות
            </>
          )}
        </h2>
        {subtitle && (
          <p className="mt-2 text-sm text-white/65 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {/* Horizontal priority tabs — each one is a discrete screen */}
      <div
        role="tablist"
        aria-label="קבוצות עדיפות"
        className="flex flex-wrap gap-1.5 mb-5 p-1 rounded-xl border border-white/10 bg-[#0B1830]/70"
      >
        {GROUPS.map((g) => {
          const isActive = g.priority === activeTab;
          const groupCount = groupTotals[g.priority] ?? 0;
          const tabColors = PRIORITY_COLORS[g.priority];
          return (
            <button
              key={g.priority}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => setActiveTab(g.priority)}
              className={`flex-1 min-w-[110px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all text-[12px] font-bold ${
                isActive
                  ? `bg-gradient-to-b from-white/[0.06] to-transparent border ${tabColors.border} text-white shadow-[0_2px_10px_rgba(212,175,55,0.08)]`
                  : "text-white/55 hover:text-white hover:bg-white/[0.03] border border-transparent"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${tabColors.dot}`}
                aria-hidden
              />
              <span className="tracking-[0.1em] text-[10px] uppercase">
                {g.priority}
              </span>
              {groupCount > 0 && (
                <span
                  className={`mono-num text-[10px] px-1.5 py-0.5 rounded-md ${
                    isActive
                      ? "bg-gold/15 text-gold"
                      : "bg-white/[0.04] text-white/55"
                  }`}
                >
                  {groupCount.toLocaleString("he-IL")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active priority screen */}
      <div
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className={`rounded-xl overflow-hidden border bg-[#0E1C35]/80 ${activeColors.border}`}
      >
        <div className={`h-[2px] ${activeColors.dot} opacity-70`} />
        <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`text-[10px] font-bold tracking-[0.1em] uppercase px-2.5 py-1 rounded-full border whitespace-nowrap ${activeColors.pill}`}
            >
              {activeGroup.pillLabel}
            </span>
            <span className="text-sm md:text-base font-bold text-white truncate">
              {activeGroup.title}
            </span>
          </div>
          <div className="text-[11px] text-white/55 mono-num shrink-0">
            {activeCount > 0
              ? `${activeCount.toLocaleString("he-IL")} לקוחות לטיפול`
              : "אין התראות בקבוצה זו"}
          </div>
        </div>

        <div className="px-5 pb-5 pt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeGroup.triggers.map((t) => {
            const count = counts[t.key] ?? 0;
            const isActive = count > 0;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveScenario(t.scenarioKey)}
                className={`text-right rounded-lg border bg-white/[0.03] hover:bg-white/[0.06] hover:-translate-y-px p-4 flex flex-col gap-2 transition-all ${
                  isActive
                    ? `${activeColors.border} hover:shadow-md`
                    : "border-white/10"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div
                      className={`mono-num text-[30px] font-black leading-none ${
                        isActive ? activeColors.num : "text-white/30"
                      }`}
                    >
                      {count.toLocaleString("he-IL")}
                    </div>
                    <div className="text-[10px] text-white/45 mt-1">
                      לקוחות
                    </div>
                  </div>
                  <div
                    className={`h-[32px] w-[32px] rounded-md border flex items-center justify-center text-[14px] shrink-0 ${activeColors.pill}`}
                  >
                    {t.emoji}
                  </div>
                </div>
                <div
                  className={`text-[13px] font-bold leading-snug ${
                    isActive ? "text-white" : "text-white/55"
                  }`}
                >
                  {t.name}
                </div>
                <p
                  className={`text-[11px] leading-relaxed ${
                    isActive ? "text-white/60" : "text-white/35"
                  }`}
                >
                  {t.description}
                </p>
                <div
                  className={`text-[11px] font-semibold mt-auto pt-1 ${
                    isActive ? activeColors.cta : "text-white/35"
                  }`}
                >
                  {t.cta}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <CategoryScenarioModal
        categoryId={activeScenario}
        onClose={() => setActiveScenario(null)}
        onActivate={() => setActiveScenario(null)}
      />
    </section>
  );
}
