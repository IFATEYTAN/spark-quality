// SPARK AI · Interactive Flowchart - תרשים זרימה ויזואלי אינטראקטיבי
// מציג את הזרימה המלאה של תהליך אוטומציה עם nodes, decision points, אנימציה ו-hover details
import { useEffect, useState } from "react";
import {
  Database,
  Brain,
  AlertTriangle,
  Mail,
  MessageSquare,
  CheckCircle2,
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
  type LucideIcon,
} from "lucide-react";

export type FlowNodeType = "trigger" | "process" | "ai" | "decision" | "action" | "approval" | "result";

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  label: string;
  detail: string;
  icon?: LucideIcon;
  /** קואורדינטות בקנבס (0-100 אחוז) */
  x: number;
  y: number;
  /** למצב של החלטה - כן/לא תוויות */
  decisionLabels?: { yes: string; no: string };
  /** מטריקה אופציונלית להצגה ב-node */
  metric?: string;
}

export interface FlowEdge {
  from: string;
  to: string;
  /** תווית על הקו (לצמתי החלטה: "כן" / "לא") */
  label?: string;
  /** האם זהו מסלול שגרתי או חלופי */
  variant?: "default" | "alt" | "fail";
}

export interface FlowchartData {
  /** שלבים על הקנבס */
  nodes: FlowNode[];
  /** חיבורים בין שלבים */
  edges: FlowEdge[];
}

const NODE_STYLES: Record<FlowNodeType, { bg: string; border: string; text: string; iconBg: string; iconText: string; label: string; shape: "rect" | "diamond" | "rounded" }> = {
  trigger:  { bg: "bg-red-50",     border: "border-red-300",     text: "text-red-900",     iconBg: "bg-red-500",     iconText: "text-white", label: "טריגר",     shape: "rounded" },
  process:  { bg: "bg-slate-50",   border: "border-slate-300",   text: "text-slate-900",   iconBg: "bg-slate-600",   iconText: "text-white", label: "תהליך",      shape: "rect" },
  ai:       { bg: "bg-amber-50",   border: "border-amber-400",   text: "text-amber-900",   iconBg: "bg-amber-500",   iconText: "text-white", label: "ניתוח AI",  shape: "rect" },
  decision: { bg: "bg-purple-50",  border: "border-purple-400",  text: "text-purple-900",  iconBg: "bg-purple-600",  iconText: "text-white", label: "החלטה",     shape: "diamond" },
  action:   { bg: "bg-blue-50",    border: "border-blue-400",    text: "text-blue-900",    iconBg: "bg-blue-600",    iconText: "text-white", label: "פעולה",     shape: "rect" },
  approval: { bg: "bg-emerald-50", border: "border-emerald-400", text: "text-emerald-900", iconBg: "bg-emerald-600", iconText: "text-white", label: "אישור",     shape: "rounded" },
  result:   { bg: "bg-navy-deep",  border: "border-gold",        text: "text-cream",       iconBg: "bg-gold",        iconText: "text-navy-deep", label: "תוצאה",  shape: "rounded" },
};

interface InteractiveFlowchartProps {
  data: FlowchartData;
  /** האם להריץ אנימציית "התהליך רץ" כברירת מחדל */
  autoPlay?: boolean;
  /** גובה מינימלי בפיקסלים */
  minHeight?: number;
}

export function InteractiveFlowchart({ data, autoPlay = false, minHeight = 480 }: InteractiveFlowchartProps) {
  const [activeStep, setActiveStep] = useState<number>(autoPlay ? 0 : -1);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  // אנימציית הפעלה: כל 1.2 שניות עוברים לשלב הבא
  useEffect(() => {
    if (!isPlaying) return;
    if (activeStep >= data.nodes.length - 1) {
      const timeout = setTimeout(() => setIsPlaying(false), 1500);
      return () => clearTimeout(timeout);
    }
    const timer = setTimeout(() => setActiveStep((s) => s + 1), 1200);
    return () => clearTimeout(timer);
  }, [isPlaying, activeStep, data.nodes.length]);

  const startSimulation = () => {
    setActiveStep(0);
    setIsPlaying(true);
  };

  const resetSimulation = () => {
    setIsPlaying(false);
    setActiveStep(-1);
  };

  const isNodeActive = (i: number) => activeStep >= i && activeStep !== -1;
  const isEdgeActive = (fromIdx: number) => activeStep > fromIdx && activeStep !== -1;

  return (
    <div className="space-y-3">
      {/* Controls bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-gold" />
          <span>תרשים זרימה אינטראקטיבי - העבירי עכבר לפרטים</span>
        </div>
        <div className="flex items-center gap-2">
          {!isPlaying && activeStep < data.nodes.length - 1 && (
            <button
              onClick={startSimulation}
              className="group flex items-center gap-2 rounded-md bg-navy-deep px-3.5 py-1.5 text-xs font-semibold text-cream transition-all hover:bg-navy hover:shadow-lg"
            >
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              {activeStep === -1 ? "הפעל סימולציה" : "המשך"}
            </button>
          )}
          {isPlaying && (
            <div className="flex items-center gap-2 rounded-md bg-gold/10 border border-gold/30 px-3 py-1.5 text-xs font-semibold text-gold">
              <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
              מריץ - שלב {activeStep + 1} / {data.nodes.length}
            </div>
          )}
          {(activeStep >= 0 && !isPlaying) && (
            <button
              onClick={resetSimulation}
              className="rounded-md border border-border/70 bg-white px-3 py-1.5 text-xs font-semibold text-navy-deep transition-all hover:bg-navy-deep hover:text-cream"
            >
              איפוס
            </button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div
        className="relative rounded-lg border-2 border-border/60 bg-gradient-to-br from-cream to-cream/60 overflow-hidden"
        style={{ minHeight: `${minHeight}px` }}
      >
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* SVG layer for edges */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" style={{ overflow: "visible" }}>
          <defs>
            <marker
              id="arrowGold"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#C8A85B" />
            </marker>
            <marker
              id="arrowMuted"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
            </marker>
          </defs>
          {data.edges.map((edge, i) => {
            const fromNode = data.nodes.find((n) => n.id === edge.from);
            const toNode = data.nodes.find((n) => n.id === edge.to);
            if (!fromNode || !toNode) return null;
            const fromIdx = data.nodes.findIndex((n) => n.id === edge.from);
            const active = isEdgeActive(fromIdx);
            const variant = edge.variant ?? "default";
            const stroke = active ? "#C8A85B" : variant === "fail" ? "#cbd5e1" : "#94a3b8";
            const strokeDash = variant === "alt" ? "4 4" : variant === "fail" ? "2 4" : undefined;
            const x1 = `${fromNode.x}%`;
            const y1 = `${fromNode.y}%`;
            const x2 = `${toNode.x}%`;
            const y2 = `${toNode.y}%`;
            // Midpoint for label
            const midX = (fromNode.x + toNode.x) / 2;
            const midY = (fromNode.y + toNode.y) / 2;
            return (
              <g key={i}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={stroke}
                  strokeWidth={active ? 2.5 : 1.5}
                  strokeDasharray={strokeDash}
                  markerEnd={active ? "url(#arrowGold)" : "url(#arrowMuted)"}
                  className="transition-all duration-500"
                />
                {/* Animated flowing dot when active */}
                {active && (
                  <circle r="3" fill="#C8A85B">
                    <animateMotion dur="1.2s" repeatCount="indefinite" path={`M ${fromNode.x}% ${fromNode.y}% L ${toNode.x}% ${toNode.y}%`} />
                  </circle>
                )}
                {edge.label && (
                  <foreignObject
                    x={`${midX - 8}%`}
                    y={`${midY - 3}%`}
                    width="16%"
                    height="6%"
                    className="pointer-events-none"
                  >
                    <div className="flex justify-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide ${active ? "bg-gold text-navy-deep" : "bg-white/90 text-muted-foreground border border-border/60"} shadow-sm`}>
                        {edge.label}
                      </span>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}
        </svg>

        {/* Nodes layer */}
        {data.nodes.map((node, i) => {
          const style = NODE_STYLES[node.type];
          const Icon = node.icon ?? defaultIconForType(node.type);
          const active = isNodeActive(i);
          const hovered = hoveredNode === node.id;

          return (
            <div
              key={node.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                zIndex: hovered ? 30 : active ? 20 : 10,
              }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <div
                className={[
                  "relative cursor-pointer transition-all duration-500 group",
                  hovered ? "scale-110" : active ? "scale-105" : "scale-100",
                ].join(" ")}
              >
                {/* Active glow */}
                {active && (
                  <div className="absolute inset-0 rounded-lg bg-gold/30 blur-xl animate-pulse" />
                )}

                {/* Node card */}
                <div
                  className={[
                    "relative w-[150px] sm:w-[170px] flex flex-col items-center text-center px-3 py-3",
                    style.bg,
                    style.text,
                    "border-2",
                    active ? "border-gold shadow-2xl shadow-gold/20" : style.border,
                    style.shape === "diamond"
                      ? "rounded-md rotate-45"
                      : style.shape === "rounded"
                      ? "rounded-full"
                      : "rounded-lg",
                  ].join(" ")}
                  style={style.shape === "diamond" ? { aspectRatio: "1 / 1", padding: "1.5rem" } : {}}
                >
                  <div className={style.shape === "diamond" ? "-rotate-45 flex flex-col items-center" : "flex flex-col items-center"}>
                    {/* Type ribbon */}
                    <span
                      className={[
                        "absolute -top-2.5 px-2 py-0.5 rounded-full text-[8px] font-black tracking-[0.15em] uppercase",
                        style.iconBg,
                        style.iconText,
                        style.shape === "diamond" ? "rotate-45" : "",
                      ].join(" ")}
                      style={style.shape === "diamond" ? { top: "-5%", left: "50%", transform: "translateX(-50%) rotate(-45deg)" } : {}}
                    >
                      {style.label}
                    </span>

                    {/* Icon */}
                    <div className={`mb-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full ${style.iconBg} ${style.iconText} shadow-md`}>
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Label */}
                    <div className="font-display font-bold text-[12px] leading-tight max-w-[140px]">
                      {node.label}
                    </div>

                    {/* Metric chip */}
                    {node.metric && (
                      <div className="mt-1 inline-block rounded bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
                        {node.metric}
                      </div>
                    )}
                  </div>
                </div>

                {/* Hover detail tooltip */}
                {hovered && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-[230px] rounded-md border-2 border-gold/40 bg-white p-3 shadow-2xl z-40 animate-fade-in">
                    <div className="text-[9px] font-black tracking-[0.15em] uppercase text-gold mb-1">
                      {style.label}
                    </div>
                    <div className="font-display text-sm font-bold text-navy-deep mb-1">
                      {node.label}
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">{node.detail}</p>
                    {/* Pointer arrow */}
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 bg-white border-l-2 border-t-2 border-gold/40" />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Footer hint */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-muted-foreground/70 font-medium pointer-events-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="h-1.5 w-3 bg-gold rounded-full" /> מסלול ראשי</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-3 bg-slate-400 rounded-full" style={{ backgroundImage: "repeating-linear-gradient(90deg, #94a3b8 0 2px, transparent 2px 4px)" }} /> מסלול חלופי</span>
          </div>
          <span>{data.nodes.length} שלבים · {data.edges.length} חיבורים</span>
        </div>
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
// תרשימי זרימה מוכנים לכל קטגוריה
// ===========================================================================

export const FLOWCHART_DATA: Record<string, FlowchartData> = {
  vip: {
    nodes: [
      { id: "n1", type: "trigger",  label: "סריקת דוח שורנס",       detail: "מערכת קוראת דוח חודשי וזיהתה לקוח עם צבירה ≥ 1M ₪",            icon: FileSpreadsheet, x: 12, y: 22 },
      { id: "n2", type: "ai",       label: "ניתוח פרופיל לקוח",      detail: "AI בוחן פיזור תיק, וותק, מוצרי 190, פוטנציאל ניוד והתאמה",      icon: Brain,            x: 38, y: 22 },
      { id: "n3", type: "decision", label: "האם VIP אמיתי?",         detail: "בודק 3 קריטריונים: צבירה > 1M, גיל > 45, ללא מוצר 190",         icon: Filter,           x: 62, y: 22, decisionLabels: { yes: "כן", no: "לא" } },
      { id: "n4", type: "action",   label: "ניסוח מייל אישי + PDF",  detail: "GPT מייצר מייל מותאם + סיכום פיננסי PDF + הצעת פגישת זום",      icon: Mail,             x: 38, y: 55, metric: "≈12 שניות" },
      { id: "n5", type: "process",  label: "סינון - לא רלוונטי",     detail: "הלקוח נשמר במאגר 'נבדק - לא VIP' לסקירה רבעונית",                icon: Database,         x: 86, y: 22 },
      { id: "n6", type: "approval", label: "אישור הסוכנת",            detail: "תקציר + כפתור 'אשר ושלח' / 'התאם ידנית'",                       icon: UserCheck,        x: 62, y: 55 },
      { id: "n7", type: "action",   label: "שליחה אוטומטית",          detail: "שליחת מייל + יצירת אירוע ב-CRM + תזכורת מעקב 3 ימים",            icon: Send,             x: 86, y: 55 },
      { id: "n8", type: "result",   label: "פגישה נקבעת",             detail: "Lead באיכות גבוהה במשפך · עמלת פגישה · פוטנציאל מכירה",          icon: Target,           x: 86, y: 84, metric: "₪380K פוטנציאל" },
    ],
    edges: [
      { from: "n1", to: "n2" },
      { from: "n2", to: "n3" },
      { from: "n3", to: "n4", label: "כן" },
      { from: "n3", to: "n5", label: "לא", variant: "alt" },
      { from: "n4", to: "n6" },
      { from: "n6", to: "n7" },
      { from: "n7", to: "n8" },
    ],
  },

  lowYield: {
    nodes: [
      { id: "n1", type: "trigger",  label: "זיהוי תשואת חסר",         detail: "צבירה < 12K ₪ × ותק או דמי ניהול > 1% על קופה ותיקה",            icon: AlertTriangle,    x: 12, y: 22 },
      { id: "n2", type: "process",  label: "שליפת נתונים השוואתיים",   detail: "API ל-מסלקה - השוואת מסלולים זמינים אצל אותו יצרן",              icon: Database,         x: 38, y: 22 },
      { id: "n3", type: "ai",       label: "חישוב חיסכון פוטנציאלי",   detail: "אלגוריתם משווה תשואות 5Y, רמות סיכון, חיסכון בדמי ניהול",        icon: Brain,            x: 62, y: 22, metric: "~₪1.8K/שנה" },
      { id: "n4", type: "decision", label: "פער מובהק > 0.7%?",        detail: "אם הפער מתחת לסף - ההצעה לא משכנעת ולא נשלחת",                   icon: Filter,           x: 86, y: 22 },
      { id: "n5", type: "action",   label: "מייל השוואה גרפית",        detail: "מייל עם גרף תשואות 5 שנים + טבלת השוואת מסלולים + CTA",          icon: Mail,             x: 62, y: 55 },
      { id: "n6", type: "process",  label: "המתנה - אין צורך בפעולה",   detail: "נבדק שוב בסקירה הרבעונית הבאה",                                  icon: Clock,            x: 86, y: 55 },
      { id: "n7", type: "approval", label: "אישור הסוכנת",              detail: "הסוכנת רואה את ההמלצה, יכולה לערוך ולשלוח",                       icon: UserCheck,        x: 38, y: 55 },
      { id: "n8", type: "action",   label: "שיחת שימור + ניוד",         detail: "תיאום פגישה, ביצוע ניוד למסלול הרווחי דרך פורטל היצרן",            icon: MessageSquare,    x: 38, y: 84 },
      { id: "n9", type: "result",   label: "ניוד הושלם · שימור",         detail: "לקוח עבר למסלול רווחי · עמלת שימור · נמנעה נטישה",                icon: Target,           x: 75, y: 84, metric: "73% הצלחה" },
    ],
    edges: [
      { from: "n1", to: "n2" },
      { from: "n2", to: "n3" },
      { from: "n3", to: "n4" },
      { from: "n4", to: "n5", label: "כן" },
      { from: "n4", to: "n6", label: "לא", variant: "alt" },
      { from: "n5", to: "n7" },
      { from: "n7", to: "n8" },
      { from: "n8", to: "n9" },
    ],
  },

  "190": {
    nodes: [
      { id: "n1", type: "trigger",  label: "זיהוי גיל ≥ 60",            detail: "סריקת בסיס לקוחות - גיל מעל 60 + צבירה פנויה ≥ 300K ₪",          icon: AlertTriangle,    x: 12, y: 22 },
      { id: "n2", type: "process",  label: "בדיקת קופת 190 קיימת",       detail: "שליפה ממסלקה: האם ללקוח כבר יש פוליסת 190",                       icon: Database,         x: 38, y: 22 },
      { id: "n3", type: "decision", label: "כבר יש 190?",                 detail: "אם כן - ההצעה לא רלוונטית. אם לא - הלאה לסימולציה",               icon: Filter,           x: 62, y: 22 },
      { id: "n4", type: "ai",       label: "סימולציית חיסכון במס",         detail: "חישוב פטור צפוי, ROI מס לתקופה צפויה, השוואה לחלופות",            icon: Brain,            x: 86, y: 22, metric: "₪38K ממוצע" },
      { id: "n5", type: "process",  label: "דילוג - יש 190",              detail: "נשמר כ-'מטופל' לסקירה תקופתית של תיקון/הגדלה",                     icon: Database,         x: 38, y: 55, },
      { id: "n6", type: "action",   label: "מייל + PDF סימולציה",          detail: "GPT מנסח מכתב הסבר, מצרף PDF גרפי עם הסימולציה",                  icon: Mail,             x: 86, y: 55 },
      { id: "n7", type: "approval", label: "אישור הסוכנת",                  detail: "הסוכנת בוחנת את הסימולציה, יכולה לערוך ולאשר",                     icon: UserCheck,        x: 62, y: 55 },
      { id: "n8", type: "action",   label: "תיאום פגישת ייעוץ",             detail: "Calendly אוטומטי + תזכורת WhatsApp + הכנת מסמכים",                icon: Calendar,         x: 38, y: 84 },
      { id: "n9", type: "result",   label: "פתיחת קופת 190",                detail: "פוליסה חדשה · עמלת פתיחה · חיסכון מס משמעותי ללקוח",               icon: Target,           x: 75, y: 84, metric: "~₪180K עמלות" },
    ],
    edges: [
      { from: "n1", to: "n2" },
      { from: "n2", to: "n3" },
      { from: "n3", to: "n5", label: "כן",  variant: "alt" },
      { from: "n3", to: "n4", label: "לא" },
      { from: "n4", to: "n6" },
      { from: "n6", to: "n7" },
      { from: "n7", to: "n8" },
      { from: "n8", to: "n9" },
    ],
  },

  risk: {
    nodes: [
      { id: "n1", type: "trigger",  label: "פוליסה < 60 יום מתום",         detail: "סטטוס מכיל 'מסתיים' / 'ריסק זמני' + תאריך סיום בעוד פחות מ-60 יום", icon: AlertTriangle,    x: 12, y: 22 },
      { id: "n2", type: "ai",       label: "חישוב פרמיה חדשה",              detail: "AI בודק זמינות מסלולים, מחשב פרמיה לפי גיל, מצב בריאותי וותק",      icon: Brain,            x: 38, y: 22 },
      { id: "n3", type: "decision", label: "פרמיה תחרותית?",                 detail: "אם הפרמיה החדשה גבוהה משמעותית - מציע מעבר לחברה אחרת",             icon: Filter,           x: 62, y: 22 },
      { id: "n4", type: "action",   label: "WhatsApp דחוף + מייל",            detail: "הודעת WhatsApp מיידית + מייל גיבוי עם הצעת חידוש",                  icon: MessageSquare,    x: 38, y: 55, metric: "אישור ב-≈30 שניות" },
      { id: "n5", type: "ai",       label: "השוואת חברות",                    detail: "סורק 4 חברות מתחרות, בוחר את המסלול הזול ביותר עם כיסוי תואם",      icon: Brain,            x: 86, y: 22 },
      { id: "n6", type: "approval", label: "אישור מהירה של הסוכנת",            detail: "מסך ייעודי 1-קליק עם 'אשר ושלח' / 'התאם ידנית'",                    icon: UserCheck,        x: 62, y: 55 },
      { id: "n7", type: "action",   label: "הצעת מעבר חברה",                   detail: "מייל עם השוואת מסלולים + קבע פגישת בדיקת בריאות",                  icon: Mail,             x: 86, y: 55 },
      { id: "n8", type: "result",   label: "כיסוי חודש לפני תום",                detail: "המשפחה מבוטחת ברציפות · עמלה נמשכת · נמנע נזק",                     icon: Target,           x: 75, y: 84, metric: "82% הצלחה" },
    ],
    edges: [
      { from: "n1", to: "n2" },
      { from: "n2", to: "n3" },
      { from: "n3", to: "n4", label: "כן" },
      { from: "n3", to: "n5", label: "לא", variant: "alt" },
      { from: "n4", to: "n6" },
      { from: "n5", to: "n7", variant: "alt" },
      { from: "n7", to: "n6" },
      { from: "n6", to: "n8" },
    ],
  },

  discount: {
    nodes: [
      { id: "n1", type: "trigger",  label: "תום הנחה < 45 יום",            detail: "סטטוס המוצר מכיל 'תום הנחה' או 'הנחה מסתיימת' + תאריך סף",         icon: Calendar,         x: 12, y: 22 },
      { id: "n2", type: "process",  label: "חישוב פרמיה חדשה",              detail: "מערכת מחשבת בכמה תקפוץ הפרמיה, אחוז הקפיצה והשפעה צפויה",            icon: Database,         x: 38, y: 22 },
      { id: "n3", type: "ai",       label: "אסטרטגיית שימור",                detail: "GPT בוחר אחת מ-3 אסטרטגיות: הארכת הנחה, מסלול חלופי, או שלב 2",     icon: Brain,            x: 62, y: 22 },
      { id: "n4", type: "decision", label: "קפיצה > 25%?",                   detail: "אם הקפיצה קטנה - תזכורת רגילה. אם גדולה - אסטרטגיית שימור אגרסיבית", icon: Filter,           x: 86, y: 22 },
      { id: "n5", type: "action",   label: "מייל יזום עם חלופה",              detail: "מייל מיידי עם 2 חלופות: הארכה / מעבר חברה תחרותית",                   icon: Mail,             x: 86, y: 55 },
      { id: "n6", type: "action",   label: "תזכורת רכה",                       detail: "מייל קצר 'תיכף תסתיים תקופת ההנחה - האם לחדש?'",                       icon: Mail,             x: 38, y: 55 },
      { id: "n7", type: "approval", label: "אישור הסוכנת",                      detail: "הסוכנת מאשרת את ההצעה - או מתאימה ידנית לפי שיחה עם הלקוח",            icon: UserCheck,        x: 62, y: 55 },
      { id: "n8", type: "result",   label: "שימור · ללא תלונה",                  detail: "הלקוח לא הופתע · נשמר ב-CRM · עמלה חודשית נמשכת",                      icon: Target,           x: 62, y: 84, metric: "67% שימור" },
    ],
    edges: [
      { from: "n1", to: "n2" },
      { from: "n2", to: "n3" },
      { from: "n3", to: "n4" },
      { from: "n4", to: "n5", label: "כן" },
      { from: "n4", to: "n6", label: "לא", variant: "alt" },
      { from: "n5", to: "n7" },
      { from: "n6", to: "n7" },
      { from: "n7", to: "n8" },
    ],
  },

  coverageGaps: {
    nodes: [
      { id: "n1", type: "trigger",  label: "ניתוח חוסרי כיסוי",              detail: "סריקת תיק - חסרים מוצרים: פנסיה / ריסק חיים / סיעוד / בריאות",       icon: AlertOctagon,     x: 12, y: 22 },
      { id: "n2", type: "ai",       label: "פרופיל סיכון אישי",              detail: "ניתוח גיל, מצב משפחתי, מצב עבודה, מצב בריאותי, מצב כלכלי",            icon: Brain,            x: 38, y: 22 },
      { id: "n3", type: "decision", label: "סוג חוסר?",                       detail: "מסעיף את הלקוחות ל-3 קטגוריות: ריסק חסר, פנסיה חסרה, סיעוד חסר",     icon: Filter,           x: 62, y: 22 },
      { id: "n4", type: "ai",       label: "התאמת מוצר ריסק",                  detail: "ממליץ על סכום ביטוח, חברה, תקופה, ופרמיה משוערת",                     icon: Brain,            x: 14, y: 55 },
      { id: "n5", type: "ai",       label: "התאמת מוצר פנסיה",                  detail: "ממליץ על קופת פנסיה, מסלול השקעה, אחוז חיסכון",                       icon: Brain,            x: 50, y: 55 },
      { id: "n6", type: "ai",       label: "התאמת סיעוד",                       detail: "ממליץ על פוליסת סיעוד, סכום יומי, תקופת המתנה",                        icon: Brain,            x: 86, y: 55 },
      { id: "n7", type: "action",   label: "מייל עם הצעה מותאמת",                detail: "מייל הסבר + הצעת פגישת ייעוץ להשלמת התיק הביטוחי",                    icon: Mail,             x: 50, y: 75 },
      { id: "n8", type: "approval", label: "אישור הסוכנת",                       detail: "הסוכנת בוחנת את ההמלצה ומאשרת או מתאימה",                              icon: UserCheck,        x: 30, y: 90 },
      { id: "n9", type: "result",   label: "מכירת מוצר חדש · אאפסל",              detail: "פגישה · מכירה · עמלת אאפסל · לקוח מבוטח כהלכה",                       icon: Target,           x: 70, y: 90, metric: "~₪520K פוטנציאל" },
    ],
    edges: [
      { from: "n1", to: "n2" },
      { from: "n2", to: "n3" },
      { from: "n3", to: "n4", label: "ריסק" },
      { from: "n3", to: "n5", label: "פנסיה" },
      { from: "n3", to: "n6", label: "סיעוד" },
      { from: "n4", to: "n7" },
      { from: "n5", to: "n7" },
      { from: "n6", to: "n7" },
      { from: "n7", to: "n8" },
      { from: "n8", to: "n9" },
    ],
  },
};
