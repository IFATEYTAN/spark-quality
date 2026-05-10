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

const PRIORITY_COLORS: Record<Priority, { dot: string; pill: string; border: string; cta: string; num: string }> = {
  P0: {
    dot: "bg-[#FF3B3B]",
    pill: "bg-[#FF3B3B]/10 text-[#FF3B3B] border-[#FF3B3B]/30",
    border: "border-[#FF3B3B]/30",
    cta: "text-[#FF3B3B]",
    num: "text-[#FF3B3B]",
  },
  P1: {
    dot: "bg-[#E8813A]",
    pill: "bg-[#E8813A]/10 text-[#E8813A] border-[#E8813A]/28",
    border: "border-[#E8813A]/28",
    cta: "text-[#E8813A]",
    num: "text-white",
  },
  P2: {
    dot: "bg-[#3D8EFF]",
    pill: "bg-[#3D8EFF]/10 text-[#3D8EFF] border-[#3D8EFF]/28",
    border: "border-[#3D8EFF]/28",
    cta: "text-[#3D8EFF]",
    num: "text-white",
  },
  P3: {
    dot: "bg-[#9B77F5]",
    pill: "bg-[#9B77F5]/10 text-[#9B77F5] border-[#9B77F5]/28",
    border: "border-[#9B77F5]/28",
    cta: "text-[#9B77F5]",
    num: "text-white",
  },
  P4: {
    dot: "bg-[#2AC49A]",
    pill: "bg-[#2AC49A]/10 text-[#2AC49A] border-[#2AC49A]/28",
    border: "border-[#2AC49A]/28",
    cta: "text-[#2AC49A]",
    num: "text-white",
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
  const [openGroups, setOpenGroups] = useState<Record<Priority, boolean>>(() => {
    const initial: Partial<Record<Priority, boolean>> = {};
    for (const g of GROUPS) initial[g.priority] = g.defaultOpen;
    return initial as Record<Priority, boolean>;
  });

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

  const toggle = (p: Priority) =>
    setOpenGroups((cur) => ({ ...cur, [p]: !cur[p] }));

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

      <div className="flex flex-col gap-2.5">
        {GROUPS.map((g) => {
          const colors = PRIORITY_COLORS[g.priority];
          const open = openGroups[g.priority];
          const groupCount = groupTotals[g.priority] ?? 0;
          return (
            <div
              key={g.priority}
              className={`rounded-xl overflow-hidden border bg-[#0E1C35]/80 ${colors.border}`}
            >
              {/* colored top stripe */}
              <div className={`h-[1.5px] ${colors.dot} opacity-65`} />
              {/* header */}
              <button
                type="button"
                onClick={() => toggle(g.priority)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-right"
                aria-expanded={open}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`text-[10px] font-bold tracking-[0.1em] uppercase px-2.5 py-1 rounded-full border whitespace-nowrap ${colors.pill}`}
                  >
                    {g.pillLabel}
                  </span>
                  <span className="text-sm font-bold text-white truncate">
                    {g.title}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-[11px] text-white/45 mono-num">
                    {groupCount > 0
                      ? `${groupCount.toLocaleString("he-IL")} לקוחות`
                      : "לחץ לפתיחה"}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-white/45 transition-transform duration-200 ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {/* body */}
              {open && (
                <div className="px-4 pb-4 pt-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {g.triggers.map((t) => {
                    const count = counts[t.key] ?? 0;
                    const isActive = count > 0;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setActiveScenario(t.scenarioKey)}
                        className={`text-right rounded-lg border bg-white/[0.03] hover:bg-white/[0.05] hover:-translate-y-px p-3.5 flex flex-col gap-2 transition-all ${
                          isActive
                            ? `${colors.border} hover:shadow-md`
                            : "border-white/10"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div
                              className={`mono-num text-[28px] font-black leading-none ${
                                isActive
                                  ? g.priority === "P0"
                                    ? "text-[#FF3B3B]"
                                    : "text-white"
                                  : "text-white/35"
                              }`}
                            >
                              {count.toLocaleString("he-IL")}
                            </div>
                            <div className="text-[10px] text-white/45 mt-1">
                              לקוחות
                            </div>
                          </div>
                          <div
                            className={`h-[30px] w-[30px] rounded-md border flex items-center justify-center text-[13px] shrink-0 ${colors.pill}`}
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
                            isActive ? "text-white/55" : "text-white/35"
                          }`}
                        >
                          {t.description}
                        </p>
                        <div
                          className={`text-[11px] font-semibold ${
                            isActive ? colors.cta : "text-white/35"
                          }`}
                        >
                          {t.cta}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <CategoryScenarioModal
        categoryId={activeScenario}
        onClose={() => setActiveScenario(null)}
        onActivate={() => setActiveScenario(null)}
      />
    </section>
  );
}
