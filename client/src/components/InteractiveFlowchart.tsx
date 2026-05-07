// SPARK AI · Interactive Flowchart - תרשים זרימה ויזואלי אינטראקטיבי
// פלטה: navy / gold / cream בלבד. פריסת גריד קבועה, ללא חפיפה, אנימציה לכל שלב.
import { useEffect, useMemo, useState } from "react";
import {
  Database,
  Brain,
  AlertTriangle,
  Mail,
  MessageSquare,
  Calendar,
  AlertOctagon,
  FileSpreadsheet,
  UserCheck,
  Target,
  Sparkles,
  Filter,
  Send,
  Clock,
  ArrowRight,
  Zap,
  RotateCcw,
  Pause,
  Play,
  type LucideIcon,
} from "lucide-react";

export type FlowNodeType = "trigger" | "process" | "ai" | "decision" | "action" | "approval" | "result";

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  label: string;
  detail: string;
  icon?: LucideIcon;
  /** קואורדינטות נשמרות לתאימות לאחור אך הפריסה כעת לפי גריד שלבים אוטומטי */
  x?: number;
  y?: number;
  decisionLabels?: { yes: string; no: string };
  metric?: string;
}

export interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  variant?: "default" | "alt" | "fail";
}

export interface FlowchartData {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

// כל הצמתים משתמשים בפלטת המערכת בלבד — navy/gold/cream.
// ההבחנה בין סוגי הצמתים נעשית על ידי צורה, ribbon, ואיקון.
const NODE_STYLES: Record<
  FlowNodeType,
  {
    bg: string;
    border: string;
    text: string;
    iconBg: string;
    iconText: string;
    label: string;
    shape: "rect" | "diamond" | "rounded";
  }
> = {
  trigger:  { bg: "bg-cream",     border: "border-gold/60",  text: "text-navy-deep", iconBg: "bg-gold",      iconText: "text-navy-deep", label: "טריגר",    shape: "rounded" },
  process:  { bg: "bg-cream",     border: "border-navy/30",  text: "text-navy-deep", iconBg: "bg-navy",      iconText: "text-cream",     label: "תהליך",     shape: "rect" },
  ai:       { bg: "bg-cream",     border: "border-gold/70",  text: "text-navy-deep", iconBg: "bg-navy-deep", iconText: "text-gold",      label: "ניתוח AI", shape: "rect" },
  decision: { bg: "bg-gold/15",   border: "border-gold",     text: "text-navy-deep", iconBg: "bg-gold",      iconText: "text-navy-deep", label: "החלטה",    shape: "diamond" },
  action:   { bg: "bg-navy-deep", border: "border-gold/60",  text: "text-cream",     iconBg: "bg-gold",      iconText: "text-navy-deep", label: "פעולה",    shape: "rect" },
  approval: { bg: "bg-navy",      border: "border-gold/60",  text: "text-cream",     iconBg: "bg-cream",     iconText: "text-navy-deep", label: "אישור",    shape: "rounded" },
  result:   { bg: "bg-navy-deep", border: "border-gold",     text: "text-cream",     iconBg: "bg-gold",      iconText: "text-navy-deep", label: "תוצאה",    shape: "rounded" },
};

interface InteractiveFlowchartProps {
  data: FlowchartData;
  autoPlay?: boolean;
  /** מספר עמודות בדסקטופ (ברירת מחדל 4) */
  desktopColumns?: number;
}

export function InteractiveFlowchart({
  data,
  autoPlay = false,
  desktopColumns = 4,
}: InteractiveFlowchartProps) {
  const [activeStep, setActiveStep] = useState<number>(autoPlay ? 0 : -1);
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  // אנימציה: כל 1.4 שניות עוברים לשלב הבא
  useEffect(() => {
    if (!isPlaying) return;
    if (activeStep >= data.nodes.length - 1) {
      const timeout = setTimeout(() => setIsPlaying(false), 1800);
      return () => clearTimeout(timeout);
    }
    const timer = setTimeout(() => setActiveStep((s) => s + 1), 1400);
    return () => clearTimeout(timer);
  }, [isPlaying, activeStep, data.nodes.length]);

  const startSimulation = () => {
    setActiveStep(activeStep === -1 ? 0 : activeStep);
    setIsPlaying(true);
  };
  const pauseSimulation = () => setIsPlaying(false);
  const resetSimulation = () => {
    setIsPlaying(false);
    setActiveStep(-1);
    setExpandedNode(null);
  };

  const isNodeActive = (i: number) => activeStep >= i && activeStep !== -1;
  const isCurrentStep = (i: number) => activeStep === i;

  // Build a step→nextStep adjacency map: which edges leave each node, with branch labels
  const outgoingByNode = useMemo(() => {
    const map = new Map<string, FlowEdge[]>();
    for (const e of data.edges) {
      if (!map.has(e.from)) map.set(e.from, []);
      map.get(e.from)!.push(e);
    }
    return map;
  }, [data.edges]);

  return (
    <div className="space-y-3">
      {/* Controls bar (desktop + mobile) */}
      <ControlsBar
        activeStep={activeStep}
        total={data.nodes.length}
        isPlaying={isPlaying}
        onStart={startSimulation}
        onPause={pauseSimulation}
        onReset={resetSimulation}
      />

      {/* Mobile vertical timeline (under lg breakpoint) */}
      <div className="lg:hidden">
        <MobileFlowchartView
          data={data}
          activeStep={activeStep}
          expandedNode={expandedNode}
          setExpandedNode={setExpandedNode}
          outgoingByNode={outgoingByNode}
          isNodeActive={isNodeActive}
          isCurrentStep={isCurrentStep}
        />
      </div>

      {/* Desktop grid (lg and up) */}
      <div className="hidden lg:block">
        <DesktopGridView
          data={data}
          activeStep={activeStep}
          expandedNode={expandedNode}
          setExpandedNode={setExpandedNode}
          isNodeActive={isNodeActive}
          isCurrentStep={isCurrentStep}
          outgoingByNode={outgoingByNode}
          columns={desktopColumns}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Controls bar
// ---------------------------------------------------------------------------
function ControlsBar({
  activeStep,
  total,
  isPlaying,
  onStart,
  onPause,
  onReset,
}: {
  activeStep: number;
  total: number;
  isPlaying: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground">
        <Zap className="h-3.5 w-3.5 text-gold flex-shrink-0" />
        <span className="hidden sm:inline">תרשים זרימה אינטראקטיבי · לחצו על כל שלב לפרטים מלאים</span>
        <span className="sm:hidden">הקישו על כל שלב לפרטים</span>
      </div>
      <div className="flex items-center gap-2">
        {!isPlaying ? (
          <button
            type="button"
            onClick={onStart}
            className="group flex items-center gap-1.5 rounded-md bg-navy-deep px-4 py-2 text-xs font-semibold text-cream shadow-sm transition-all hover:bg-navy hover:shadow-lg min-h-[40px]"
          >
            <Play className="h-3.5 w-3.5 text-gold" />
            {activeStep === -1 ? "הפעלו סימולציה" : activeStep >= total - 1 ? "הפעלו שוב" : "המשך"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onPause}
            className="flex items-center gap-1.5 rounded-md border-2 border-gold bg-gold/10 px-4 py-2 text-xs font-semibold text-gold min-h-[40px]"
          >
            <Pause className="h-3.5 w-3.5" />
            <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
            שלב {activeStep + 1}/{total}
          </button>
        )}
        {(activeStep >= 0 && !isPlaying) && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-md border border-border/70 bg-white px-3 py-2 text-xs font-semibold text-navy-deep transition-all hover:bg-navy-deep hover:text-cream min-h-[40px]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            איפוס
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Desktop grid view: rows of nodes connected by SVG arrows
// ---------------------------------------------------------------------------
function DesktopGridView({
  data,
  activeStep,
  expandedNode,
  setExpandedNode,
  isNodeActive,
  isCurrentStep,
  outgoingByNode,
  columns,
}: {
  data: FlowchartData;
  activeStep: number;
  expandedNode: string | null;
  setExpandedNode: (id: string | null) => void;
  isNodeActive: (i: number) => boolean;
  isCurrentStep: (i: number) => boolean;
  outgoingByNode: Map<string, FlowEdge[]>;
  columns: number;
}) {
  // Group nodes into rows of `columns`. Within each row, alternate row direction
  // is not used (RTL-friendly: visually right-to-left flow within a row).
  const rows = useMemo(() => {
    const out: FlowNode[][] = [];
    for (let i = 0; i < data.nodes.length; i += columns) {
      out.push(data.nodes.slice(i, i + columns));
    }
    return out;
  }, [data.nodes, columns]);

  return (
    <div className="relative rounded-xl border-2 border-gold/25 bg-gradient-to-br from-cream to-cream/70 p-5 shadow-[0_2px_24px_rgba(15,23,42,0.05)] overflow-hidden">
      {/* Subtle grid background */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative space-y-6">
        {rows.map((row, rowIdx) => {
          const isLastRow = rowIdx === rows.length - 1;
          const startGlobalIdx = rowIdx * columns;
          // For RTL we want the row laid out so the first node is on the right.
          // Tailwind grid with dir=rtl + a wrapper RTL container in the parent ensures correct order.
          return (
            <div key={rowIdx} className="space-y-3">
              <div
                className="grid gap-3 items-stretch"
                style={{ gridTemplateColumns: `repeat(${Math.min(columns, row.length)}, minmax(0, 1fr))` }}
              >
                {row.map((node, idxInRow) => {
                  const globalIdx = startGlobalIdx + idxInRow;
                  return (
                    <NodeCard
                      key={node.id}
                      node={node}
                      idx={globalIdx}
                      total={data.nodes.length}
                      active={isNodeActive(globalIdx)}
                      current={isCurrentStep(globalIdx)}
                      expanded={expandedNode === node.id}
                      onToggle={() =>
                        setExpandedNode(expandedNode === node.id ? null : node.id)
                      }
                      branches={outgoingByNode.get(node.id) ?? []}
                      showInRowConnector={idxInRow < row.length - 1}
                      rowConnectorActive={isNodeActive(globalIdx) && isNodeActive(globalIdx + 1)}
                    />
                  );
                })}
              </div>

              {/* Down-arrow to next row (centered) */}
              {!isLastRow && (
                <div className="flex justify-center">
                  <DownConnector active={isNodeActive(startGlobalIdx + row.length - 1)} />
                </div>
              )}
            </div>
          );
        })}

        {/* Footer legend */}
        <div className="pt-3 mt-2 border-t border-gold/20 flex items-center justify-between text-[11px] text-muted-foreground/80 font-medium">
          <div className="flex items-center gap-3 flex-wrap">
            <LegendDot color="bg-gold" label="זרימה פעילה" />
            <LegendDot color="bg-navy/30" label="זרימה רגילה" />
            <LegendDot color="bg-navy-deep" label="פעולת מערכת" pill />
            <LegendDot color="bg-cream border border-navy/30" label="ניתוח / טריגר" pill dark />
          </div>
          <span>
            {data.nodes.length} שלבים · {data.edges.length} חיבורים
            {activeStep >= 0 && (
              <span className="mr-2 text-gold font-bold">· שלב {activeStep + 1}/{data.nodes.length}</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

function LegendDot({
  color,
  label,
  pill = false,
  dark = false,
}: {
  color: string;
  label: string;
  pill?: boolean;
  dark?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`${pill ? "h-3 w-5 rounded" : "h-2 w-2 rounded-full"} ${color} ${dark ? "" : ""}`}
      />
      <span className="text-[10px]">{label}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Single node card (works for both desktop and mobile)
// ---------------------------------------------------------------------------
function NodeCard({
  node,
  idx,
  total,
  active,
  current,
  expanded,
  onToggle,
  branches,
  showInRowConnector,
  rowConnectorActive,
}: {
  node: FlowNode;
  idx: number;
  total: number;
  active: boolean;
  current: boolean;
  expanded: boolean;
  onToggle: () => void;
  branches: FlowEdge[];
  showInRowConnector?: boolean;
  rowConnectorActive?: boolean;
}) {
  const style = NODE_STYLES[node.type];
  const Icon = node.icon ?? defaultIconForType(node.type);
  const ribbonLabel = style.label;
  const branchLabels = branches.map((b) => b.label).filter(Boolean) as string[];

  return (
    <div className="relative flex items-stretch min-w-0">
      {/* Card */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={[
          "relative flex-1 min-w-0 text-right transition-all duration-500 outline-none",
          "rounded-xl border-2 px-3 py-3 shadow-sm",
          style.bg,
          style.text,
          active ? "border-gold shadow-lg shadow-gold/20" : style.border,
          current ? "ring-4 ring-gold/40 scale-[1.02]" : "",
          expanded ? "ring-2 ring-gold/60" : "",
          "hover:shadow-md hover:border-gold/80",
        ].join(" ")}
      >
        {/* Step badge */}
        <span className="absolute -top-2.5 right-3 inline-flex items-center gap-1 rounded-full bg-navy-deep text-cream px-2 py-0.5 text-[10px] font-bold tracking-wider shadow-sm">
          <span className="text-gold">{String(idx + 1).padStart(2, "0")}</span>
          <span className="opacity-60">/{String(total).padStart(2, "0")}</span>
        </span>

        {/* Type ribbon */}
        <span
          className={`absolute -top-2.5 left-3 inline-block rounded-full px-2 py-0.5 text-[9px] font-black tracking-[0.15em] uppercase shadow-sm ${style.iconBg} ${style.iconText}`}
        >
          {ribbonLabel}
        </span>

        <div className="flex items-start gap-3 min-w-0 mt-1">
          {/* Icon */}
          <div
            className={`flex-shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full ${style.iconBg} ${style.iconText} shadow ${current ? "animate-pulse-gold" : ""}`}
          >
            <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
          </div>

          <div className="flex-1 min-w-0 text-right">
            <div className="font-display font-bold text-[14px] leading-tight break-words">
              {node.label}
            </div>
            <p
              className={`mt-1 text-[11.5px] leading-snug ${active ? "opacity-95" : "opacity-80"} break-words ${expanded ? "" : "line-clamp-2"}`}
            >
              {node.detail}
            </p>

            {/* Footer chips */}
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              {node.metric && (
                <span className="inline-block rounded-md bg-gold/20 text-navy-deep px-1.5 py-0.5 text-[10px] font-bold border border-gold/40">
                  {node.metric}
                </span>
              )}
              {branchLabels.length > 0 && branchLabels.map((bl, i) => (
                <span
                  key={i}
                  className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${active ? "bg-gold text-navy-deep border-gold" : "bg-white/70 text-muted-foreground border-border/60"}`}
                >
                  {bl}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Active flowing ring */}
        {current && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-gold/30 animate-pulse"
          />
        )}
      </button>

      {/* In-row arrow connector (desktop only). RTL: arrow points to the LEFT (next item). */}
      {showInRowConnector && (
        <div className="hidden lg:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <RowArrow active={!!rowConnectorActive} />
        </div>
      )}
    </div>
  );
}

function RowArrow({ active }: { active: boolean }) {
  return (
    <div className="flex items-center">
      <div
        className={`h-0.5 w-6 ${active ? "bg-gold" : "bg-navy/30"} transition-colors duration-500`}
      />
      <ArrowRight
        className={`h-3.5 w-3.5 ${active ? "text-gold" : "text-navy/40"} -ml-1 transition-colors duration-500 -rotate-180`}
        strokeWidth={2.5}
      />
      {active && (
        <span
          aria-hidden
          className="absolute h-2 w-2 rounded-full bg-gold shadow-[0_0_8px_rgba(200,168,91,0.8)] animate-flow-dot-rtl"
        />
      )}
    </div>
  );
}

function DownConnector({ active }: { active: boolean }) {
  return (
    <div className="relative flex flex-col items-center" aria-hidden>
      <div className={`h-8 w-0.5 ${active ? "bg-gold" : "bg-navy/30"} transition-colors duration-500`} />
      <ArrowRight
        className={`h-4 w-4 rotate-90 ${active ? "text-gold" : "text-navy/40"} -mt-1 transition-colors duration-500`}
        strokeWidth={2.5}
      />
      {active && (
        <span
          aria-hidden
          className="absolute top-0 h-2 w-2 rounded-full bg-gold shadow-[0_0_8px_rgba(200,168,91,0.8)] animate-flow-dot-down"
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile vertical timeline
// ---------------------------------------------------------------------------
function MobileFlowchartView({
  data,
  activeStep,
  expandedNode,
  setExpandedNode,
  outgoingByNode,
  isNodeActive,
  isCurrentStep,
}: {
  data: FlowchartData;
  activeStep: number;
  expandedNode: string | null;
  setExpandedNode: (id: string | null) => void;
  outgoingByNode: Map<string, FlowEdge[]>;
  isNodeActive: (i: number) => boolean;
  isCurrentStep: (i: number) => boolean;
}) {
  return (
    <div className="relative rounded-xl border-2 border-gold/25 bg-gradient-to-b from-cream to-cream/70 p-3 space-y-2">
      {data.nodes.map((node, i) => {
        const isLast = i === data.nodes.length - 1;
        const branches = outgoingByNode.get(node.id) ?? [];
        const downActive = isNodeActive(i) && isNodeActive(i + 1);

        return (
          <div key={node.id} className="relative">
            <NodeCard
              node={node}
              idx={i}
              total={data.nodes.length}
              active={isNodeActive(i)}
              current={isCurrentStep(i)}
              expanded={expandedNode === node.id}
              onToggle={() => setExpandedNode(expandedNode === node.id ? null : node.id)}
              branches={branches}
            />

            {!isLast && (
              <div className="flex justify-center py-1.5">
                <DownConnector active={downActive} />
              </div>
            )}
          </div>
        );
      })}

      {/* Mobile footer */}
      <div className="pt-2 mt-1 border-t border-gold/20 flex items-center justify-between text-[10px] text-muted-foreground/80 font-medium">
        <span>{data.nodes.length} שלבים · {data.edges.length} חיבורים</span>
        {activeStep >= 0 && (
          <span className="text-gold font-bold">שלב {activeStep + 1}/{data.nodes.length}</span>
        )}
      </div>
    </div>
  );
}

function defaultIconForType(type: FlowNodeType): LucideIcon {
  switch (type) {
    case "trigger": return AlertTriangle;
    case "process": return Database;
    case "ai": return Brain;
    case "decision": return Filter;
    case "action": return Send;
    case "approval": return UserCheck;
    case "result": return Target;
    default: return Sparkles;
  }
}

// ===========================================================================
// תרשימי זרימה מוכנים לכל קטגוריה — נשמרים כמו שהיו (אותם שלבים ומסרים)
// ===========================================================================

export const FLOWCHART_DATA: Record<string, FlowchartData> = {
  vip: {
    nodes: [
      { id: "n1", type: "trigger",  label: "סריקת דוח שורנס",       detail: "מערכת קוראת דוח חודשי וזיהתה לקוח עם צבירה ≥ 1M ₪",            icon: FileSpreadsheet },
      { id: "n2", type: "ai",       label: "ניתוח פרופיל לקוח",      detail: "AI בוחן פיזור תיק, וותק, מוצרי 190, פוטנציאל ניוד והתאמה",      icon: Brain },
      { id: "n3", type: "decision", label: "האם VIP אמיתי?",         detail: "בודק 3 קריטריונים: צבירה > 1M, גיל > 45, ללא מוצר 190",         icon: Filter, decisionLabels: { yes: "כן", no: "לא" } },
      { id: "n4", type: "action",   label: "ניסוח מייל אישי + PDF",  detail: "GPT מייצר מייל מותאם + סיכום פיננסי PDF + הצעת פגישת זום",      icon: Mail, metric: "≈12 שניות" },
      { id: "n5", type: "approval", label: "אישור הסוכנת",            detail: "תקציר + כפתור 'אשר ושלח' / 'התאם ידנית'",                       icon: UserCheck },
      { id: "n6", type: "action",   label: "שליחה אוטומטית",          detail: "שליחת מייל + יצירת אירוע ב-CRM + תזכורת מעקב 3 ימים",            icon: Send },
      { id: "n7", type: "result",   label: "פגישה נקבעת",             detail: "Lead באיכות גבוהה במשפך · עמלת פגישה · פוטנציאל מכירה",          icon: Target, metric: "₪380K פוטנציאל" },
    ],
    edges: [
      { from: "n1", to: "n2" },
      { from: "n2", to: "n3" },
      { from: "n3", to: "n4", label: "כן" },
      { from: "n4", to: "n5" },
      { from: "n5", to: "n6" },
      { from: "n6", to: "n7" },
    ],
  },

  lowYield: {
    nodes: [
      { id: "n1", type: "trigger",  label: "זיהוי תשואת חסר",         detail: "צבירה < 12K ₪ × ותק או דמי ניהול > 1% על קופה ותיקה",            icon: AlertTriangle },
      { id: "n2", type: "process",  label: "שליפת נתונים השוואתיים",   detail: "API ל-מסלקה - השוואת מסלולים זמינים אצל אותו יצרן",              icon: Database },
      { id: "n3", type: "ai",       label: "חישוב חיסכון פוטנציאלי",   detail: "אלגוריתם משווה תשואות 5Y, רמות סיכון, חיסכון בדמי ניהול",        icon: Brain, metric: "~₪1.8K/שנה" },
      { id: "n4", type: "decision", label: "פער מובהק > 0.7%?",        detail: "אם הפער מתחת לסף - ההצעה לא משכנעת ולא נשלחת",                   icon: Filter },
      { id: "n5", type: "action",   label: "מייל השוואה גרפית",        detail: "מייל עם גרף תשואות 5 שנים + טבלת השוואת מסלולים + CTA",          icon: Mail, metric: "מותאם אישית" },
      { id: "n6", type: "approval", label: "אישור הסוכנת",              detail: "הסוכנת רואה את ההמלצה, יכולה לערוך ולשלוח",                       icon: UserCheck },
      { id: "n7", type: "action",   label: "שיחת שימור + ניוד",         detail: "תיאום פגישה, ביצוע ניוד למסלול הרווחי דרך פורטל היצרן",            icon: MessageSquare },
      { id: "n8", type: "result",   label: "ניוד הושלם · שימור",         detail: "לקוח עבר למסלול רווחי · עמלת שימור · נמנעה נטישה",                icon: Target, metric: "73% הצלחה" },
    ],
    edges: [
      { from: "n1", to: "n2" },
      { from: "n2", to: "n3" },
      { from: "n3", to: "n4" },
      { from: "n4", to: "n5", label: "כן" },
      { from: "n5", to: "n6" },
      { from: "n6", to: "n7" },
      { from: "n7", to: "n8" },
    ],
  },

  "190": {
    nodes: [
      { id: "n1", type: "trigger",  label: "זיהוי גיל ≥ 60",            detail: "סריקת בסיס לקוחות - גיל מעל 60 + צבירה פנויה ≥ 300K ₪",          icon: AlertTriangle },
      { id: "n2", type: "process",  label: "בדיקת קופת 190 קיימת",       detail: "שליפה ממסלקה: האם ללקוח כבר יש פוליסת 190",                       icon: Database },
      { id: "n3", type: "decision", label: "כבר יש 190?",                 detail: "אם כן - ההצעה לא רלוונטית. אם לא - הלאה לסימולציה",               icon: Filter },
      { id: "n4", type: "ai",       label: "סימולציית חיסכון במס",         detail: "חישוב פטור צפוי, ROI מס לתקופה צפויה, השוואה לחלופות",            icon: Brain, metric: "₪38K ממוצע" },
      { id: "n5", type: "action",   label: "מייל + PDF סימולציה",          detail: "GPT מנסח מכתב הסבר, מצרף PDF גרפי עם הסימולציה",                  icon: Mail },
      { id: "n6", type: "approval", label: "אישור הסוכנת",                  detail: "הסוכנת בוחנת את הסימולציה, יכולה לערוך ולאשר",                     icon: UserCheck },
      { id: "n7", type: "action",   label: "תיאום פגישת ייעוץ",             detail: "Calendly אוטומטי + תזכורת WhatsApp + הכנת מסמכים",                icon: Calendar },
      { id: "n8", type: "result",   label: "פתיחת קופת 190",                detail: "פוליסה חדשה · עמלת פתיחה · חיסכון מס משמעותי ללקוח",               icon: Target, metric: "~₪180K עמלות" },
    ],
    edges: [
      { from: "n1", to: "n2" },
      { from: "n2", to: "n3" },
      { from: "n3", to: "n4", label: "לא" },
      { from: "n4", to: "n5" },
      { from: "n5", to: "n6" },
      { from: "n6", to: "n7" },
      { from: "n7", to: "n8" },
    ],
  },

  risk: {
    nodes: [
      { id: "n1", type: "trigger",  label: "פוליסה < 60 יום מתום",         detail: "סטטוס מכיל 'מסתיים' / 'ריסק זמני' + תאריך סיום בעוד פחות מ-60 יום", icon: AlertTriangle },
      { id: "n2", type: "ai",       label: "חישוב פרמיה חדשה",              detail: "AI בודק זמינות מסלולים, מחשב פרמיה לפי גיל, מצב בריאותי וותק",      icon: Brain },
      { id: "n3", type: "decision", label: "פרמיה תחרותית?",                 detail: "אם הפרמיה החדשה גבוהה משמעותית - מציע מעבר לחברה אחרת",             icon: Filter },
      { id: "n4", type: "action",   label: "WhatsApp דחוף + מייל",            detail: "הודעת WhatsApp מיידית + מייל גיבוי עם הצעת חידוש",                  icon: MessageSquare, metric: "אישור ב-≈30 שניות" },
      { id: "n5", type: "approval", label: "אישור מהירה של הסוכנת",            detail: "מסך ייעודי 1-קליק עם 'אשר ושלח' / 'התאם ידנית'",                    icon: UserCheck },
      { id: "n6", type: "action",   label: "הצעת חידוש / מעבר",                detail: "מייל עם השוואת מסלולים + קביעת פגישת בדיקת בריאות",                  icon: Mail },
      { id: "n7", type: "result",   label: "כיסוי חודש לפני תום",                detail: "המשפחה מבוטחת ברציפות · עמלה נמשכת · נמנע נזק",                     icon: Target, metric: "82% הצלחה" },
    ],
    edges: [
      { from: "n1", to: "n2" },
      { from: "n2", to: "n3" },
      { from: "n3", to: "n4", label: "כן" },
      { from: "n4", to: "n5" },
      { from: "n5", to: "n6" },
      { from: "n6", to: "n7" },
    ],
  },

  discount: {
    nodes: [
      { id: "n1", type: "trigger",  label: "תום הנחה < 45 יום",            detail: "סטטוס המוצר מכיל 'תום הנחה' או 'הנחה מסתיימת' + תאריך סף",         icon: Calendar },
      { id: "n2", type: "process",  label: "חישוב פרמיה חדשה",              detail: "מערכת מחשבת בכמה תקפוץ הפרמיה, אחוז הקפיצה והשפעה צפויה",            icon: Database },
      { id: "n3", type: "ai",       label: "אסטרטגיית שימור",                detail: "GPT בוחר אחת מ-3 אסטרטגיות: הארכת הנחה, מסלול חלופי, או שלב 2",     icon: Brain },
      { id: "n4", type: "decision", label: "קפיצה > 25%?",                   detail: "אם הקפיצה קטנה - תזכורת רגילה. אם גדולה - אסטרטגיית שימור אגרסיבית", icon: Filter },
      { id: "n5", type: "action",   label: "מייל יזום עם חלופה",              detail: "מייל מיידי עם 2 חלופות: הארכה / מעבר חברה תחרותית",                   icon: Mail },
      { id: "n6", type: "approval", label: "אישור הסוכנת",                      detail: "הסוכנת מאשרת את ההצעה - או מתאימה ידנית לפי שיחה עם הלקוח",            icon: UserCheck },
      { id: "n7", type: "action",   label: "שליחה ומעקב",                       detail: "שליחת המייל + תזכורת אוטומטית 3 ימים לפני תום ההנחה",                   icon: Send },
      { id: "n8", type: "result",   label: "שימור · ללא תלונה",                  detail: "הלקוח לא הופתע · נשמר ב-CRM · עמלה חודשית נמשכת",                      icon: Target, metric: "67% שימור" },
    ],
    edges: [
      { from: "n1", to: "n2" },
      { from: "n2", to: "n3" },
      { from: "n3", to: "n4" },
      { from: "n4", to: "n5", label: "כן" },
      { from: "n5", to: "n6" },
      { from: "n6", to: "n7" },
      { from: "n7", to: "n8" },
    ],
  },

  coverageGaps: {
    nodes: [
      { id: "n1", type: "trigger",  label: "ניתוח חוסרי כיסוי",              detail: "סריקת תיק - חסרים מוצרים: פנסיה / ריסק חיים / סיעוד / בריאות",       icon: AlertOctagon },
      { id: "n2", type: "ai",       label: "פרופיל סיכון אישי",              detail: "ניתוח גיל, מצב משפחתי, מצב עבודה, מצב בריאותי, מצב כלכלי",            icon: Brain },
      { id: "n3", type: "decision", label: "סוג חוסר?",                       detail: "מסעיף את הלקוחות ל-3 קטגוריות: ריסק חסר, פנסיה חסרה, סיעוד חסר",     icon: Filter },
      { id: "n4", type: "ai",       label: "התאמת מוצר אישית",                  detail: "ממליץ על סכום ביטוח / קופת פנסיה / סיעוד מתאימים בהתאם לחוסר",       icon: Brain, metric: "מותאם פרופיל" },
      { id: "n5", type: "action",   label: "מייל עם הצעה מותאמת",                detail: "מייל הסבר + הצעת פגישת ייעוץ להשלמת התיק הביטוחי",                    icon: Mail },
      { id: "n6", type: "approval", label: "אישור הסוכנת",                       detail: "הסוכנת בוחנת את ההמלצה ומאשרת או מתאימה",                              icon: UserCheck },
      { id: "n7", type: "action",   label: "תיאום פגישת ייעוץ",                   detail: "Calendly אוטומטי, הכנת מסמכים, תזכורות לפני הפגישה",                    icon: Clock },
      { id: "n8", type: "result",   label: "מכירת מוצר חדש · אאפסל",              detail: "פגישה · מכירה · עמלת אאפסל · לקוח מבוטח כהלכה",                       icon: Target, metric: "~₪520K פוטנציאל" },
    ],
    edges: [
      { from: "n1", to: "n2" },
      { from: "n2", to: "n3" },
      { from: "n3", to: "n4" },
      { from: "n4", to: "n5" },
      { from: "n5", to: "n6" },
      { from: "n6", to: "n7" },
      { from: "n7", to: "n8" },
    ],
  },
};
