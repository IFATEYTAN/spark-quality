// SPARK AI · Action Center — surfaces post-import categories with CTAs
// Used by Dashboard (always when there are clients) and UploadReport (after a successful import).
import { Crown, Sparkles, Wallet, TrendingUp, Shield, FileWarning, ArrowLeft, PlayCircle } from "lucide-react";
import { useState, useMemo, type ReactNode } from "react";
import { GlassCard, GoldEyebrow } from "./CinematicShell";
import { CategoryScenarioModal } from "./CategoryScenarioModal";

export interface ActionCenterCounts {
  vipClients: number;
  liquidFunds: number;
  tikun190Candidates: number;
  highFees: number;
  riskEnding: number;
  coverageGaps: number;
}

type ScenarioKey = "vip" | "lowYield" | "190" | "discount" | "risk" | "coverageGaps";

interface CategoryDef {
  key: keyof ActionCenterCounts;
  scenarioKey: ScenarioKey;
  label: string;
  shortPain: string;
  nextStep: string;
  icon: typeof Sparkles;
  accent: string; // tailwind text class
}

const CATEGORY_DEFS: CategoryDef[] = [
  {
    key: "vipClients",
    scenarioKey: "vip",
    label: "לקוחות VIP",
    shortPain: "פוטנציאל ניוד גבוה — דרוש מגע אישי מיידי",
    nextStep: "לקבוע פגישת ניהול עושר",
    icon: Crown,
    accent: "text-amber-300",
  },
  {
    key: "liquidFunds",
    scenarioKey: "lowYield",
    label: "השתלמות נזילה",
    shortPain: "מסלולים לא רווחיים — סכנת נטישה",
    nextStep: "להציע ניוד / שינוי מסלול",
    icon: Sparkles,
    accent: "text-emerald-300",
  },
  {
    key: "tikun190Candidates",
    scenarioKey: "190",
    label: "תיקון 190",
    shortPain: "60+ עם צבירה פנויה — פטור מס מבוזבז",
    nextStep: "פתיחת קופת 190",
    icon: Wallet,
    accent: "text-sky-300",
  },
  {
    key: "highFees",
    scenarioKey: "discount",
    label: "דמי ניהול גבוהים",
    shortPain: "תום הנחה — קפיצת פרמיה צפויה",
    nextStep: "מו״מ הוזלה לפני שיתקשרו",
    icon: TrendingUp,
    accent: "text-amber-300",
  },
  {
    key: "riskEnding",
    scenarioKey: "risk",
    label: "ריסק מסתיים",
    shortPain: "כיסוי חיים בסוף תקופה — חשיפת משפחה",
    nextStep: "חידוש כיסוי בזמן",
    icon: Shield,
    accent: "text-rose-300",
  },
  {
    key: "coverageGaps",
    scenarioKey: "coverageGaps",
    label: "חוסרי כיסוי",
    shortPain: "אין פנסיה / סיעוד / ריסק — אאפסל ענק",
    nextStep: "השלמת תיק ביטוח",
    icon: FileWarning,
    accent: "text-orange-300",
  },
];

interface ActionCenterProps {
  counts: ActionCenterCounts;
  /** Show even when all counts are zero (e.g. immediately after upload). Default: false */
  showWhenEmpty?: boolean;
  /** Eyebrow text shown above the title. Default: "מרכז הפעולות" */
  eyebrow?: string;
  /** Override main title. Default tuned to context. */
  title?: ReactNode;
  /** Optional subtitle below the title. */
  subtitle?: string;
}

export function ActionCenter({
  counts,
  showWhenEmpty = false,
  eyebrow = "מרכז הפעולות · SPARK Quality Engine",
  title,
  subtitle,
}: ActionCenterProps) {
  const [activeScenario, setActiveScenario] = useState<ScenarioKey | null>(null);

  const ranked = useMemo(() => {
    return CATEGORY_DEFS.map((def) => ({
      def,
      count: counts[def.key] ?? 0,
    })).sort((a, b) => b.count - a.count);
  }, [counts]);

  const totalActionable = ranked.reduce((s, r) => s + r.count, 0);
  const topCategory = ranked.find((r) => r.count > 0) ?? null;

  if (totalActionable === 0 && !showWhenEmpty) return null;

  return (
    <section className="mb-10 animate-fade-up">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <GoldEyebrow>{eyebrow}</GoldEyebrow>
          <h2 className="font-display text-2xl lg:text-3xl font-black text-white tracking-tight">
            {title ??
              (totalActionable > 0
                ? <>הצעדים הבאים שלך · <span className="text-gold mono-num">{totalActionable}</span> הזדמנויות פעילות</>
                : "הצעדים הבאים שלך")}
          </h2>
          {subtitle && (
            <p className="mt-2 text-sm text-white/65 max-w-2xl leading-relaxed">{subtitle}</p>
          )}
        </div>
        {topCategory && topCategory.count > 0 && (
          <button
            onClick={() => setActiveScenario(topCategory.def.scenarioKey)}
            className="group inline-flex items-center gap-2 rounded-md bg-gradient-to-br from-gold to-[#B89346] text-[#06101F] px-5 py-3 text-sm font-bold shadow-lg shadow-gold/30 hover:scale-[1.02] hover:shadow-gold/45 transition-all whitespace-nowrap"
          >
            <PlayCircle className="h-4 w-4" />
            הפעל את האוטומציה הראשונה: {topCategory.def.label}
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ranked.map(({ def, count }) => {
          const Icon = def.icon;
          const isActive = count > 0;
          return (
            <button
              key={def.key}
              type="button"
              onClick={() => setActiveScenario(def.scenarioKey)}
              className={`text-right group rounded-lg border transition-all p-5 flex flex-col gap-3 h-full ${
                isActive
                  ? "border-gold/30 bg-gradient-to-br from-white/[0.05] to-white/[0.02] hover:border-gold/55 hover:from-white/[0.08] hover:shadow-lg hover:shadow-gold/15"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className={`h-10 w-10 rounded-md border flex items-center justify-center shrink-0 ${
                  isActive ? "bg-gold/15 border-gold/35" : "bg-white/5 border-white/10"
                }`}>
                  <Icon className={`h-4 w-4 ${isActive ? "text-gold" : "text-white/40"}`} />
                </div>
                <div className="flex flex-col items-end">
                  <div className={`mono-num text-3xl font-black tracking-tight ${isActive ? "text-white" : "text-white/30"}`}>
                    {count.toLocaleString("he-IL")}
                  </div>
                  <div className="text-[10px] tracking-[0.18em] uppercase text-white/45">
                    לקוחות
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <div className={`font-display text-base font-bold mb-1 ${isActive ? "text-white" : "text-white/60"}`}>
                  {def.label}
                </div>
                <p className={`text-xs leading-relaxed ${isActive ? "text-white/60" : "text-white/35"}`}>
                  {def.shortPain}
                </p>
              </div>
              <div className={`flex items-center justify-between gap-2 pt-2 border-t border-white/5 ${
                isActive ? "" : "opacity-60"
              }`}>
                <span className={`text-xs font-semibold ${isActive ? "text-gold" : "text-white/40"}`}>
                  {def.nextStep}
                </span>
                <span className={`text-xs font-bold ${isActive ? "text-gold" : "text-white/40"} group-hover:-translate-x-0.5 transition-transform`}>
                  ←
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {totalActionable === 0 && (
        <GlassCard className="mt-5 p-5 text-center bg-white/[0.03] border-dashed border-white/15">
          <p className="text-sm text-white/55">
            אחרי שתעלי דוח שורנס, המערכת תזהה אוטומטית את הקטגוריות הפעילות ותציג את הצעדים הבאים כאן.
          </p>
        </GlassCard>
      )}

      <CategoryScenarioModal
        categoryId={activeScenario}
        onClose={() => setActiveScenario(null)}
        onActivate={() => setActiveScenario(null)}
      />
    </section>
  );
}
