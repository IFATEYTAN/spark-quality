// Editorial Fintech | מודאל סנריו פר-קטגוריה - תרשים זרימה ויזואלי (מפוצל ל-2 תצוגות)
// פותח לחיצה על כרטיס קטגוריה ב-DashboardStage ומציג את הזרימה האוטומטית של אותה קטגוריה
import { useEffect, useState } from "react";
import {
  X,
  Database,
  Brain,
  AlertTriangle,
  Mail,
  MessageSquare,
  TrendingUp,
  Calendar,
  AlertOctagon,
  Crown,
  Briefcase,
  ArrowLeft,
  Sparkles,
  FileSpreadsheet,
  Send,
  UserCheck,
  Target,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { InteractiveFlowchart, FLOWCHART_DATA } from "./InteractiveFlowchart";

interface ScenarioStep {
  icon: any;
  label: string;
  detail: string;
  variant: "trigger" | "ai" | "action" | "approval" | "result";
}

interface CategoryScenario {
  id: string;
  title: string;
  pain: string; // הכאב העסקי
  trigger: string; // מה מפעיל
  steps: ScenarioStep[];
  outcome: { label: string; value: string }[]; // מטריקות תוצאה
  exampleCustomer: { name: string; flag: string; channel: string };
}

const SCENARIOS: Record<string, CategoryScenario> = {
  vip: {
    id: "vip",
    title: "לקוחות VIP - פגישת ניהול עושר",
    pain: "לקוחות עתירי נכסים עם פוטנציאל ניוד גבוה - דורשים יחס אישי ומיידי",
    trigger: "זוהה לקוח עם צבירה ≥ 1M ₪",
    steps: [
      { icon: FileSpreadsheet, label: "טריגר", detail: "סריקת דוח מוצרים בניהול - לקוח X עם צבירה של 1.4M ₪", variant: "trigger" },
      { icon: Brain, label: "ניתוח AI", detail: "בדיקת תיק רב-יצרני · זיהוי הזדמנויות תיקון 190 · פילוח פיזור", variant: "ai" },
      { icon: Mail, label: "פעולה אוטומטית", detail: "ניסוח מייל אישי לסוכן/ת + סיכום פיננסי PDF + הצעת פגישה", variant: "action" },
      { icon: UserCheck, label: "אישור הסוכן/ת", detail: "הסוכן/ת רואים תקציר ומאשרת בקליק את שליחת המייל", variant: "approval" },
      { icon: Target, label: "תוצאה", detail: "פגישה נקבעת ב-CRM · יצירת הזדמנות מכירה · 5.2M ₪ פוטנציאל", variant: "result" },
    ],
    outcome: [
      { label: "לקוחות זוהו", value: "42" },
      { label: "AUM קבוצה", value: "₪47M" },
      { label: "פוטנציאל הכנסה", value: "₪380K" },
    ],
    exampleCustomer: { name: "דני כהן · גיל 58 · צבירה 1.4M ₪", flag: "VIP", channel: "אימייל אישי + פגישת זום" },
  },
  lowYield: {
    id: "lowYield",
    title: "תשואות נמוכות - שימור והוזלת דמי ניהול",
    pain: "לקוחות משלמים דמי ניהול גבוהים על מסלולים לא רווחיים - סכנת נטישה ואובדן עמלות",
    trigger: "זוהה לקוח עם תשואת חסר וותק ≥ 5 שנים",
    steps: [
      { icon: FileSpreadsheet, label: "טריגר", detail: "צבירה < 12K × ותק או דמי ניהול > 1% על קופה ותיקה", variant: "trigger" },
      { icon: Brain, label: "ניתוח AI", detail: "השוואת מסלולים זמינים אצל יצרן · חישוב חיסכון פוטנציאלי", variant: "ai" },
      { icon: Mail, label: "פעולה אוטומטית", detail: "מייל מותאם עם השוואת מסלולים גרפית + הצעת פגישת שימור", variant: "action" },
      { icon: UserCheck, label: "אישור הסוכן/ת", detail: "הסוכן/ת רואים את ההמלצה ומאשרת לשליחה", variant: "approval" },
      { icon: Target, label: "תוצאה", detail: "ניוד למסלול רווחי · הוזלת דמי ניהול · שימור הלקוח", variant: "result" },
    ],
    outcome: [
      { label: "לקוחות זוהו", value: "127" },
      { label: "אחוז שימור צפוי", value: "73%" },
      { label: "עמלות שימור", value: "₪220K" },
    ],
    exampleCustomer: { name: "מיכל דוד · ותק 8 שנים · צבירה 650K ₪", flag: "תשואה חלשה", channel: "מייל + שיחת טלפון" },
  },
  "190": {
    id: "190",
    title: "תיקון 190 - פטור ממס רווחי הון",
    pain: "לקוחות 60+ עם צבירה פנויה מפסידים הזדמנות חיסכון ענקית במס - והסוכן לא מודע לכך",
    trigger: "זוהה לקוח גיל ≥ 60 עם צבירה ≥ 300K ₪ ללא קופת 190",
    steps: [
      { icon: FileSpreadsheet, label: "טריגר", detail: "ערכי גיל וצבירה תואמים את הקריטריונים", variant: "trigger" },
      { icon: Brain, label: "ניתוח AI", detail: "סימולציית חיסכון במס · חישוב פטור צפוי · השוואת מוצרים", variant: "ai" },
      { icon: Mail, label: "פעולה אוטומטית", detail: "מייל הסבר + סימולציה גרפית בקובץ PDF + הצעת פגישה", variant: "action" },
      { icon: UserCheck, label: "אישור הסוכן/ת", detail: "הסוכן/ת בוחנים ומאשרת את הסימולציה לשליחה", variant: "approval" },
      { icon: Target, label: "תוצאה", detail: "פתיחת קופת 190 · עמלת מכירה · חיסכון משמעותי ללקוח", variant: "result" },
    ],
    outcome: [
      { label: "לקוחות זוהו", value: "54" },
      { label: "חיסכון מס ממוצע", value: "₪38K" },
      { label: "עמלות חדשות", value: "₪180K" },
    ],
    exampleCustomer: { name: "שרה לוי · גיל 67 · פנויה 480K ₪", flag: "תיקון 190", channel: "מייל עם סימולציה" },
  },
  risk: {
    id: "risk",
    title: "ריסק זמני - חידוש כיסוי בזמן",
    pain: "כיסויי ביטוח חיים מסתיימים והלקוח לא יודע - המשפחה חשופה והסוכן מאבד עמלות",
    trigger: 'סטטוס המוצר מכיל "מסתיים" או "ריסק זמני"',
    steps: [
      { icon: AlertTriangle, label: "טריגר", detail: "תאריך סיום פוליסה < 60 יום מהיום", variant: "trigger" },
      { icon: Brain, label: "ניתוח AI", detail: "חישוב פרמיה חדשה · בדיקת זמינות מסלולים · התאמה לפרופיל", variant: "ai" },
      { icon: MessageSquare, label: "פעולה אוטומטית", detail: "WhatsApp דחוף + מייל גיבוי עם הצעת חידוש מיידית", variant: "action" },
      { icon: UserCheck, label: "אישור הסוכן/ת", detail: "הסוכן/ת מאשרים את ההצעה - או מתאימה ידנית", variant: "approval" },
      { icon: Target, label: "תוצאה", detail: "חידוש כיסוי לפני תום · שימור משפחה · המשך עמלה", variant: "result" },
    ],
    outcome: [
      { label: "כיסויים בסיכון", value: "23" },
      { label: "אחוז חידוש צפוי", value: "82%" },
      { label: "פרמיות שימור", value: "₪95K/שנה" },
    ],
    exampleCustomer: { name: "אבי מזרחי · ריסק 1.2M ₪ · מסתיים 03/2026", flag: "ריסק זמני", channel: "WhatsApp דחוף + מייל" },
  },
  discount: {
    id: "discount",
    title: "תום הנחה - שימור פרמיה",
    pain: "תום תקופת הנחה מקפיץ פרמיה אצל הלקוח - הוא מתעצבן, מתקשר ומאיים לעבור",
    trigger: "סטטוס המוצר מכיל \"תום הנחה\" או \"הנחה מסתיימת\"",
    steps: [
      { icon: Calendar, label: "טריגר", detail: "תאריך סיום הנחה < 45 יום קדימה", variant: "trigger" },
      { icon: Brain, label: "ניתוח AI", detail: "חישוב פרמיה חדשה · השוואה לחלופות · אסטרטגיית שימור", variant: "ai" },
      { icon: Mail, label: "פעולה אוטומטית", detail: "מייל יזום עם הצעת חידוש הנחה או מסלול חלופי תחרותי", variant: "action" },
      { icon: UserCheck, label: "אישור הסוכן/ת", detail: "הסוכן/ת מאשרים את האסטרטגיה לשליחה ללקוח", variant: "approval" },
      { icon: Target, label: "תוצאה", detail: "שימור הלקוח לפני הקפיצה · ללא תלונה · עמלה חודשית נמשכת", variant: "result" },
    ],
    outcome: [
      { label: "לקוחות זוהו", value: "31" },
      { label: "שימור פרואקטיבי", value: "67%" },
      { label: "פרמיות נשמרו", value: "₪142K/שנה" },
    ],
    exampleCustomer: { name: 'יוסי ברק · הנחה מסתיימת 02/2026', flag: "תום הנחה", channel: "מייל יזום + שיחת מעקב" },
  },
  coverageGaps: {
    id: "coverageGaps",
    title: "חוסרים בכיסויים - השלמת תיק",
    pain: "לקוחות עם כיסויי ביטוח חסרים (ללא פנסיה, ללא סיעוד, חוסר ריסק) - חשיפה ענקית והזדמנות אאפסל מבוזבזת",
    trigger: "אין מוצר פנסיוני / סיעוד / ריסק בתיק הלקוח",
    steps: [
      { icon: AlertOctagon, label: "טריגר", detail: "ניתוח תיק - חסרים מוצרים מסוג פנסיה / ריסק / סיעוד", variant: "trigger" },
      { icon: Brain, label: "ניתוח AI", detail: "פרופיל סיכון · התאמת מוצר · המלצה מותאמת לגיל ולמצב משפחתי", variant: "ai" },
      { icon: Mail, label: "פעולה אוטומטית", detail: "מייל הסבר + הצעת פגישת ייעוץ להשלמת התיק הביטוחי", variant: "action" },
      { icon: UserCheck, label: "אישור הסוכן/ת", detail: "הסוכן/ת בוחנים את ההמלצה ומאשרת או מתאימה", variant: "approval" },
      { icon: Target, label: "תוצאה", detail: "פגישה · מכירת מוצר חדש · עמלות אאפסל · לקוח מבוטח כהלכה", variant: "result" },
    ],
    outcome: [
      { label: "לקוחות עם חוסרים", value: "284" },
      { label: "פוטנציאל אאפסל", value: "₪520K" },
      { label: "חשיפה ביטוחית", value: "16M ₪" },
    ],
    exampleCustomer: { name: "רינת אברהם · גיל 42 · ללא ריסק לחיים", flag: "חוסר ריסק", channel: "מייל + פגישת ייעוץ" },
  },
};

// All step variants use the SPARK system palette (navy / gold / cream).
const VARIANT_STYLES: Record<ScenarioStep["variant"], { ring: string; bg: string; text: string; label: string }> = {
  trigger:  { ring: "ring-gold/30",   bg: "bg-gold/15",       text: "text-navy-deep", label: "טריגר" },
  ai:       { ring: "ring-gold/40",   bg: "bg-navy-deep",     text: "text-gold",      label: "ניתוח AI" },
  action:   { ring: "ring-navy/30",   bg: "bg-navy-deep",     text: "text-cream",     label: "פעולה" },
  approval: { ring: "ring-gold/30",   bg: "bg-cream",         text: "text-navy-deep", label: "אישור" },
  result:   { ring: "ring-gold/50",   bg: "bg-gold",          text: "text-navy-deep", label: "תוצאה" },
};

interface CategoryScenarioModalProps {
  categoryId: string | null;
  onClose: () => void;
  /**
   * Optional callback when the user wants to advance the demo flow from the modal.
   * Currently the modal is self-contained (simulation runs in-place), so this is unused.
   */
  onActivate?: () => void;
}

export function CategoryScenarioModal({ categoryId, onClose }: CategoryScenarioModalProps) {
  const scenario = categoryId ? SCENARIOS[categoryId] : null;
  const [view, setView] = useState<1 | 2>(1);

  // Reset view when opening a new scenario
  useEffect(() => {
    if (categoryId) setView(1);
  }, [categoryId]);

  // Lock body scroll while open
  useEffect(() => {
    if (!scenario) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setView(2);
      if (e.key === "ArrowRight") setView(1);
    };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", handler);
    };
  }, [scenario, onClose]);

  if (!scenario) return null;

  // We slice the InteractiveFlowchart data to show only nodes 0-3 in View 1, and 4-7 in View 2.
  // The original FLOWCHART_DATA has 8 nodes per scenario.
  const fullFlowchartData = FLOWCHART_DATA[scenario.id];
  const view1FlowchartData = fullFlowchartData ? {
    nodes: fullFlowchartData.nodes.slice(0, 4),
    edges: fullFlowchartData.edges.filter(e => {
      const fromIdx = fullFlowchartData.nodes.findIndex(n => n.id === e.from);
      const toIdx = fullFlowchartData.nodes.findIndex(n => n.id === e.to);
      return fromIdx < 4 && toIdx < 4;
    })
  } : null;
  const view2FlowchartData = fullFlowchartData ? {
    nodes: fullFlowchartData.nodes.slice(4, 8),
    edges: fullFlowchartData.edges.filter(e => {
      const fromIdx = fullFlowchartData.nodes.findIndex(n => n.id === e.from);
      const toIdx = fullFlowchartData.nodes.findIndex(n => n.id === e.to);
      return fromIdx >= 4 && toIdx >= 4;
    })
  } : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-6 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-navy-deep/85 backdrop-blur-sm" />

      {/* Panel - Fixed height to 100vh minus padding, flex column to fill space */}
      <div
        className="relative w-full max-w-6xl h-[92vh] flex flex-col bg-cream rounded-md shadow-2xl shadow-navy/40 animate-fade-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (fixed) */}
        <div className="flex-shrink-0 flex items-start justify-between gap-3 border-b border-border/60 bg-cream px-4 sm:px-10 py-4 sm:py-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px w-10 bg-gold" />
              <span className="label-tag text-gold text-[10px]">סנריו אוטומטי · SPARK AI</span>
              <span className="label-tag text-muted-foreground text-[10px]">· תצוגה {view} מתוך 2</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-black text-navy-deep tracking-tight leading-tight">
              {scenario.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-md border border-border/70 bg-white p-2 text-navy-deep transition-all hover:border-navy-deep hover:bg-navy-deep hover:text-cream"
            aria-label="סגור"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body - Flex 1 to take remaining space, internal scroll if needed but designed to fit */}
        <div className="flex-1 min-h-0 px-4 sm:px-10 py-5 sm:py-6 flex flex-col gap-5 overflow-y-auto">
          
          {view === 1 && (
            <div className="flex-1 flex flex-col gap-5 animate-fade-in">
              {/* Pain Highlight */}
              <div className="flex-shrink-0 flex items-start gap-3 rounded-md bg-red-50/80 border border-red-100 p-4 sm:p-5">
                <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-red-800 uppercase tracking-wider mb-1">הכאב</div>
                  <div className="text-base sm:text-lg font-medium text-red-950 leading-snug">
                    {scenario.pain}
                  </div>
                </div>
              </div>

              {/* Trigger banner */}
              <div className="flex-shrink-0 flex items-center gap-3 rounded-md border border-gold/30 bg-gradient-to-l from-gold/10 to-transparent px-4 py-3">
                <Sparkles className="h-5 w-5 text-gold flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-gold font-bold tracking-[0.2em] uppercase mb-0.5">תנאי הפעלה</div>
                  <div className="text-sm font-medium text-navy-deep">{scenario.trigger}</div>
                </div>
              </div>

              {/* Interactive Flowchart View 1 (Steps 1-4) */}
              {view1FlowchartData && (
                <div className="flex-1 min-h-0 flex flex-col">
                  <h3 className="flex-shrink-0 font-display text-base font-bold text-navy-deep mb-3 tracking-tight flex items-center gap-2">
                    <div className="h-px w-6 bg-gold" />
                    תרשים זרימה אינטראקטיבי (שלבים 1-4)
                  </h3>
                  <div className="flex-1 min-h-0">
                    <InteractiveFlowchart data={view1FlowchartData} desktopColumns={4} />
                  </div>
                </div>
              )}
            </div>
          )}

          {view === 2 && (
            <div className="flex-1 flex flex-col gap-5 animate-fade-in">
              {/* Interactive Flowchart View 2 (Steps 5-8) */}
              {view2FlowchartData && (
                <div className="flex-shrink-0">
                  <h3 className="font-display text-base font-bold text-navy-deep mb-3 tracking-tight flex items-center gap-2">
                    <div className="h-px w-6 bg-gold" />
                    תרשים זרימה אינטראקטיבי (שלבים 5-8)
                  </h3>
                  <InteractiveFlowchart data={view2FlowchartData} desktopColumns={4} />
                </div>
              )}

              {/* Compact step list - Textual summary of all steps */}
              <div className="flex-shrink-0">
                <h3 className="font-display text-base font-bold text-navy-deep mb-3 tracking-tight flex items-center gap-2">
                  <div className="h-px w-6 bg-gold" />
                  שלבי התהליך - סיכום
                </h3>
                <div className="hidden lg:flex items-stretch gap-2">
                  {scenario.steps.map((step, i) => {
                    const v = VARIANT_STYLES[step.variant];
                    const Icon = step.icon;
                    const isLast = i === scenario.steps.length - 1;
                    return (
                      <div key={i} className="flex items-stretch flex-1 min-w-0">
                        <div
                          className={`relative flex-1 min-w-0 flex flex-col rounded-md border-2 ${v.ring.replace("ring-", "border-")} ${step.variant === "result" ? "bg-navy-deep" : "bg-white"} p-3 transition-all hover:shadow-lg`}
                        >
                          <div className={`absolute -top-2 right-3 px-2 py-0.5 rounded ${v.bg} ${v.text} text-[9px] font-black tracking-[0.15em]`}>
                            {String(i + 1).padStart(2, "0")} · {v.label}
                          </div>
                          <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded ${v.bg} ${v.text}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className={`font-display font-bold text-xs leading-tight mb-1 ${step.variant === "result" ? "text-cream" : "text-navy-deep"}`}>
                            {step.label}
                          </div>
                          <p className={`text-[10px] leading-snug line-clamp-2 ${step.variant === "result" ? "text-cream/80" : "text-muted-foreground"}`}>
                            {step.detail}
                          </p>
                        </div>
                        {!isLast && (
                          <div className="flex items-center px-0.5 text-gold flex-shrink-0">
                            <ArrowLeft className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Example customer */}
                <div className="rounded-md border border-border/70 bg-white p-4 flex flex-col justify-center">
                  <div className="text-[10px] text-gold font-bold tracking-[0.2em] uppercase mb-3">דוגמה אמיתית מהדוח</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="text-[10px] text-muted-foreground mb-1">לקוח</div>
                      <div className="font-display font-bold text-xs text-navy-deep">{scenario.exampleCustomer.name}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground mb-1">דגל שזוהה</div>
                      <div className="inline-block rounded bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
                        {scenario.exampleCustomer.flag}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground mb-1">ערוץ פנייה</div>
                      <div className="font-display font-bold text-xs text-navy-deep">{scenario.exampleCustomer.channel}</div>
                    </div>
                  </div>
                </div>

                {/* Outcome metrics */}
                <div className="flex flex-col justify-center">
                  <h3 className="font-display text-sm font-bold text-navy-deep mb-2 tracking-tight flex items-center gap-2">
                    <div className="h-px w-4 bg-gold" />
                    תוצאה צפויה
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {scenario.outcome.map((m, i) => (
                      <div key={i} className="rounded-md border border-gold/25 bg-gradient-to-br from-gold/10 to-transparent p-3">
                        <div className="text-[9px] text-gold/80 font-bold tracking-[0.15em] uppercase mb-1">{m.label}</div>
                        <div className="display-number font-display text-xl sm:text-2xl font-black text-navy-deep">
                          {m.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-10 py-4 border-t border-border/60 bg-cream">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView(1)}
              disabled={view === 1}
              className="flex items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-sm font-bold text-navy-deep transition-all hover:border-gold hover:text-gold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
              הקודם
            </button>
            <button
              onClick={() => setView(2)}
              disabled={view === 2}
              className="flex items-center gap-2 rounded-md bg-navy-deep px-4 py-2 text-sm font-bold text-cream transition-all hover:bg-navy disabled:opacity-50 disabled:cursor-not-allowed"
            >
              הבא
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border-2 border-navy-deep bg-transparent px-6 py-2 text-sm font-bold text-navy-deep transition-all hover:bg-navy-deep hover:text-cream"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
