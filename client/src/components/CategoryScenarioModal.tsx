// Editorial Fintech | מודאל סנריו פר-קטגוריה - תרשים זרימה ויזואלי
// פותח לחיצה על כרטיס קטגוריה ב-DashboardStage ומציג את הזרימה האוטומטית של אותה קטגוריה
import { useEffect } from "react";
import {
  X,
  Database,
  Brain,
  AlertTriangle,
  Mail,
  MessageSquare,
  CheckCircle2,
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
      { icon: FileSpreadsheet, label: "טריגר", detail: "סריקת דוח שורנס - לקוח X עם צבירה של 1.4M ₪", variant: "trigger" },
      { icon: Brain, label: "ניתוח AI", detail: "בדיקת תיק רב-יצרני · זיהוי הזדמנויות תיקון 190 · פילוח פיזור", variant: "ai" },
      { icon: Mail, label: "פעולה אוטומטית", detail: "ניסוח מייל אישי לסוכנת + סיכום פיננסי PDF + הצעת פגישה", variant: "action" },
      { icon: UserCheck, label: "אישור סוכנת", detail: "הסוכנת רואה תקציר ומאשרת בקליק את שליחת המייל", variant: "approval" },
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
      { icon: UserCheck, label: "אישור סוכנת", detail: "הסוכנת רואה את ההמלצה ומאשרת לשליחה", variant: "approval" },
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
      { icon: UserCheck, label: "אישור סוכנת", detail: "הסוכנת בוחנת ומאשרת את הסימולציה לשליחה", variant: "approval" },
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
      { icon: UserCheck, label: "אישור סוכנת", detail: "הסוכנת מאשרת את ההצעה - או מתאימה ידנית", variant: "approval" },
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
      { icon: UserCheck, label: "אישור סוכנת", detail: "הסוכנת מאשרת את האסטרטגיה לשליחה ללקוח", variant: "approval" },
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
      { icon: UserCheck, label: "אישור סוכנת", detail: "הסוכנת בוחנת את ההמלצה ומאשרת או מתאימה", variant: "approval" },
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

const VARIANT_STYLES: Record<ScenarioStep["variant"], { ring: string; bg: string; text: string; label: string }> = {
  trigger: { ring: "ring-red-200", bg: "bg-red-50", text: "text-red-700", label: "טריגר" },
  ai: { ring: "ring-gold/40", bg: "bg-gold/10", text: "text-gold", label: "ניתוח AI" },
  action: { ring: "ring-blue-200", bg: "bg-blue-50", text: "text-blue-700", label: "פעולה" },
  approval: { ring: "ring-emerald-200", bg: "bg-emerald-50", text: "text-emerald-700", label: "אישור" },
  result: { ring: "ring-navy/30", bg: "bg-navy-deep", text: "text-cream", label: "תוצאה" },
};

interface CategoryScenarioModalProps {
  categoryId: string | null;
  onClose: () => void;
  onActivate: () => void;
}

export function CategoryScenarioModal({ categoryId, onClose, onActivate }: CategoryScenarioModalProps) {
  const scenario = categoryId ? SCENARIOS[categoryId] : null;

  // Lock body scroll while open
  useEffect(() => {
    if (!scenario) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", handler);
    };
  }, [scenario, onClose]);

  if (!scenario) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-6 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-navy-deep/85 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-6xl max-h-[92vh] overflow-y-auto bg-cream rounded-md shadow-2xl shadow-navy/40 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border/60 bg-cream/95 backdrop-blur px-4 sm:px-10 py-4 sm:py-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px w-10 bg-gold" />
              <span className="label-tag text-gold text-[10px]">סנריו אוטומטי · SPARK AI</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-black text-navy-deep tracking-tight leading-tight">
              {scenario.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-3xl">
              <span className="font-semibold text-navy-deep">הכאב: </span>
              {scenario.pain}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-md border border-border/70 bg-white p-2 text-navy-deep transition-all hover:border-navy-deep hover:bg-navy-deep hover:text-cream"
            aria-label="סגור"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-10 py-5 sm:py-8 space-y-6">
          {/* Trigger banner */}
          <div className="flex items-center gap-3 rounded-md border border-gold/30 bg-gradient-to-l from-gold/10 to-transparent px-4 py-3">
            <Sparkles className="h-5 w-5 text-gold flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-gold font-bold tracking-[0.2em] uppercase mb-0.5">תנאי הפעלה</div>
              <div className="text-sm font-medium text-navy-deep">{scenario.trigger}</div>
            </div>
          </div>

          {/* Interactive Flowchart - תרשים זרימה ויזואלי אינטראקטיבי */}
          {FLOWCHART_DATA[scenario.id] && (
            <div>
              <h3 className="font-display text-base font-bold text-navy-deep mb-3 tracking-tight flex items-center gap-2">
                <div className="h-px w-6 bg-gold" />
                תרשים זרימה אינטראקטיבי
              </h3>
              <InteractiveFlowchart data={FLOWCHART_DATA[scenario.id]} minHeight={520} />
            </div>
          )}

          {/* Compact step list - גיבוי טקסטואלי לסיכום */}
          <div>
            <h3 className="font-display text-base font-bold text-navy-deep mb-4 tracking-tight flex items-center gap-2">
              <div className="h-px w-6 bg-gold" />
              שלבי התהליך - סיכום
            </h3>

            {/* Desktop: horizontal flow with arrows */}
            <div className="hidden lg:flex items-stretch gap-2">
              {scenario.steps.map((step, i) => {
                const v = VARIANT_STYLES[step.variant];
                const Icon = step.icon;
                const isLast = i === scenario.steps.length - 1;
                return (
                  <div key={i} className="flex items-stretch flex-1 min-w-0">
                    <div
                      className={`relative flex-1 min-w-0 flex flex-col rounded-md border-2 ${v.ring.replace("ring-", "border-")} ${step.variant === "result" ? "bg-navy-deep" : "bg-white"} p-4 transition-all hover:shadow-lg`}
                    >
                      {/* Step number ribbon */}
                      <div className={`absolute -top-2 right-3 px-2 py-0.5 rounded ${v.bg} ${v.text} text-[9px] font-black tracking-[0.15em]`}>
                        {String(i + 1).padStart(2, "0")} · {v.label}
                      </div>
                      {/* Icon */}
                      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded ${v.bg} ${v.text}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      {/* Title */}
                      <div className={`font-display font-bold text-sm leading-tight mb-1.5 ${step.variant === "result" ? "text-cream" : "text-navy-deep"}`}>
                        {step.label}
                      </div>
                      {/* Detail */}
                      <p className={`text-[11px] leading-snug ${step.variant === "result" ? "text-cream/80" : "text-muted-foreground"}`}>
                        {step.detail}
                      </p>
                    </div>
                    {/* Arrow between cards */}
                    {!isLast && (
                      <div className="flex items-center px-1 text-gold flex-shrink-0">
                        <ArrowLeft className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile: vertical flow */}
            <div className="lg:hidden space-y-2">
              {scenario.steps.map((step, i) => {
                const v = VARIANT_STYLES[step.variant];
                const Icon = step.icon;
                const isLast = i === scenario.steps.length - 1;
                return (
                  <div key={i}>
                    <div
                      className={`relative flex items-start gap-3 rounded-md border-2 ${v.ring.replace("ring-", "border-")} ${step.variant === "result" ? "bg-navy-deep" : "bg-white"} p-4`}
                    >
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded ${v.bg} ${v.text}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[9px] font-black tracking-[0.15em] mb-0.5 ${v.text}`}>
                          {String(i + 1).padStart(2, "0")} · {v.label}
                        </div>
                        <div className={`font-display font-bold text-sm leading-tight mb-1 ${step.variant === "result" ? "text-cream" : "text-navy-deep"}`}>
                          {step.label}
                        </div>
                        <p className={`text-xs leading-snug ${step.variant === "result" ? "text-cream/80" : "text-muted-foreground"}`}>
                          {step.detail}
                        </p>
                      </div>
                    </div>
                    {!isLast && (
                      <div className="flex justify-center py-1 text-gold">
                        <ArrowLeft className="h-5 w-5 -rotate-90" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Example customer */}
          <div className="rounded-md border border-border/70 bg-white p-5">
            <div className="text-[10px] text-gold font-bold tracking-[0.2em] uppercase mb-3">דוגמה אמיתית מהדוח</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">לקוח</div>
                <div className="font-display font-bold text-sm text-navy-deep">{scenario.exampleCustomer.name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">דגל שזוהה</div>
                <div className="inline-block rounded bg-gold/15 px-2.5 py-1 text-xs font-bold text-gold">
                  {scenario.exampleCustomer.flag}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">ערוץ פנייה</div>
                <div className="font-display font-bold text-sm text-navy-deep">{scenario.exampleCustomer.channel}</div>
              </div>
            </div>
          </div>

          {/* Outcome metrics */}
          <div>
            <h3 className="font-display text-base font-bold text-navy-deep mb-3 tracking-tight flex items-center gap-2">
              <div className="h-px w-6 bg-gold" />
              תוצאה צפויה
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {scenario.outcome.map((m, i) => (
                <div key={i} className="rounded-md border border-gold/25 bg-gradient-to-br from-gold/10 to-transparent p-4">
                  <div className="text-[10px] text-gold/80 font-bold tracking-[0.15em] uppercase mb-2">{m.label}</div>
                  <div className="display-number font-display text-2xl sm:text-3xl font-black text-navy-deep">
                    {m.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-border/60">
            <button
              onClick={onActivate}
              className="group flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-md bg-navy-deep px-6 py-3 text-sm font-bold text-cream transition-all hover:bg-navy hover:shadow-2xl hover:shadow-navy/20"
            >
              <CheckCircle2 className="h-4 w-4" />
              הפעל את הסנריו עכשיו
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            </button>
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial rounded-md border-2 border-navy-deep bg-transparent px-6 py-3 text-sm font-bold text-navy-deep transition-all hover:bg-navy-deep hover:text-cream"
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
