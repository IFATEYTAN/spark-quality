// Editorial Fintech | מסך פעולות אוטומטיות - הדגמת התראות פיננסיות
import { useEffect, useState } from "react";
import { ArrowLeft, MessageSquare, CheckCircle2, FileText, Briefcase, TrendingUp, Mail } from "lucide-react";
import type { ParsedReport } from "@/lib/parseReport";
interface ActionsStageProps {
  onComplete: () => void;
  parsed?: ParsedReport | null;
}

function buildActionsFromParsed(parsed: ParsedReport) {
  const customers = parsed.customers;
  const vip = customers.find(c => c.status === "VIP") || customers[0];
  const liquid = customers.find(c => c.status === "השתלמות נזילה") || customers[1] || customers[0];
  const t190 = customers.find(c => c.status === "תיקון 190") || customers[2] || customers[0];
  const risk = customers.find(c => c.status === "ריסק זמני" || c.status === "תום הנחה" || c.status === "תשואה חלשה") || customers[3] || customers[0];

  return [
    {
      id: 1,
      type: "email",
      icon: Briefcase,
      iconBg: "bg-gold/10 text-gold",
      delay: 300,
      title: "התראה דחופה - לקוחות VIP",
      target: "יפעת איתן <yifat@spark-ai.co.il>",
      subject: `💎 דוח VIP: ${(parsed.stats as any).vipCustomers ?? 4} לקוחות עתירי נכסים דורשים פגישת תכנון פיננסי`,
      body: `שלום יפעת,\n\nמערכת SPARK AI זיהתה ${(parsed.stats as any).vipCustomers ?? 4} לקוחות עם צבירה כוללת של מעל 1,000,000 ₪ כל אחד (ביניהם ${vip?.name}).\n\nהמלצה: תיאום פגישת ניהול עושר מקיפה לבחינת תיקון 190, פיזור סיכונים, ושימור. רשימה מלאה מצורפת.`,
      meta: ["נשלח כעת", `${(parsed.stats as any).vipCustomers ?? 4} לקוחות VIP`, "PDF מוכן"],
    },
    {
      id: 2,
      type: "whatsapp",
      icon: MessageSquare,
      iconBg: "bg-emerald-50 text-emerald-700",
      delay: 1100,
      title: "WhatsApp - השתלמות נזילה",
      target: `ללקוח: ${liquid?.name} · ${liquid?.phone || "052-111-2222"}`,
      subject: "הזדמנות השקעה: קרן השתלמות נזילה",
      body: `שלום ${liquid?.name?.split(" ")[0] || "דני"} 👋\n\nכאן יפעת מ-SPARK AI. ראיתי שקרן ההשתלמות שלך ב${liquid?.insurer || "הראל"} הפכה לנזילה לאחרונה.\n\nזה אומר שיש לך הון פנוי פטור ממס שניתן למנף להשקעה חכמה או פוליסת חיסכון. אשמח לתאם שיחה קצרה להציג לך אפשרויות.\n\nמתי נוח לך השבוע?`,
      meta: ["מותאם אישית", "אישור לפני שליחה", "מחכה לאישורך"],
    },
    {
      id: 3,
      type: "email",
      icon: TrendingUp,
      iconBg: "bg-blue-50 text-blue-700",
      delay: 1900,
      title: "מייל אאפסל - תיקון 190",
      target: `ללקוח: ${t190?.name} <${t190?.email || "client@demo.co.il"}>`,
      subject: "הזדמנות לפטור ממס רווחי הון (תיקון 190)",
      body: `שלום ${t190?.name?.split(" ")[0] || "שרה"},\n\nבבחינת התיק הפיננסי שלך, זיהינו שאת/ה עומד/ת בקריטריונים לניצול הטבות מס משמעותיות לפי תיקון 190 (גיל 60+ וצבירה פנויה).\n\nהכנו עבורך סימולציה המדגימה כיצד הפקדה לקופת גמל לפי תיקון 190 יכולה לחסוך לך עשרות אלפי שקלים במס רווחי הון בעת המשיכה.\n\nלצפייה בסימולציה: [קישור מאובטח]`,
      meta: ["מותאם AI", "מצורף PDF", "מוכן לאישור"],
    },
    {
      id: 4,
      type: "task",
      icon: FileText,
      iconBg: "bg-navy/10 text-navy-deep",
      delay: 2700,
      title: "משימה ב-CRM",
      target: "מערכת CRM של הסוכנות",
      subject: `פגישת שימור: ${risk?.name} - ${risk?.status}`,
      body: `נוצרה משימה אוטומטית ב-CRM:\n\n• לקוח: ${risk?.name}\n• סוג: פגישת שימור (${risk?.status})\n• עדיפות: גבוהה\n• דדליין: עד 25/01/2026\n• הערות: הלקוח עם צבירה של ₪${risk?.accumulation?.toLocaleString("he-IL")}. סכנת ניוד גבוהה. יש להציע מסלול דמי ניהול מוזל או חידוש כיסוי.`,
      meta: ["סנכרון אוטומטי", "תזכורת ב-3 ימים", "הוקצה ליפעת"],
    },
  ];
}

const ACTIONS = [
  {
    id: 1,
    type: "email",
    icon: Briefcase,
    iconBg: "bg-gold/10 text-gold",
    delay: 300,
    title: "התראה דחופה - לקוחות VIP",
    target: "יפעת איתן <yifat@spark-ai.co.il>",
    subject: "💎 דוח VIP: 4 לקוחות עתירי נכסים דורשים פגישת תכנון פיננסי",
    body: "שלום יפעת,\n\nמערכת SPARK AI זיהתה 4 לקוחות עם צבירה כוללת של מעל 1,000,000 ₪ כל אחד. סך ההון המנוהל בקבוצה זו: ₪5.2M.\n\nהמלצה: תיאום פגישת ניהול עושר מקיפה לבחינת תיקון 190, פיזור סיכונים, ושימור. רשימה מלאה מצורפת.",
    meta: ["נשלח כעת", "4 לקוחות VIP", "PDF מוכן"],
  },
  {
    id: 2,
    type: "whatsapp",
    icon: MessageSquare,
    iconBg: "bg-emerald-50 text-emerald-700",
    delay: 1100,
    title: "WhatsApp - השתלמות נזילה",
    target: "ללקוח: דני כהן · 052-111-2222",
    subject: "הזדמנות השקעה: קרן השתלמות נזילה",
    body: "שלום דני 👋\n\nכאן יפעת מ-SPARK AI. ראיתי שקרן ההשתלמות שלך בהראל הפכה לנזילה לאחרונה (ותק של 6 שנים).\n\nזה אומר שיש לך הון פנוי פטור ממס שניתן למנף להשקעה חכמה או פוליסת חיסכון. אשמח לתאם שיחה קצרה להציג לך אפשרויות.\n\nמתי נוח לך השבוע?",
    meta: ["מותאם אישית", "אישור לפני שליחה", "מחכה לאישורך"],
  },
  {
    id: 3,
    type: "email",
    icon: TrendingUp,
    iconBg: "bg-blue-50 text-blue-700",
    delay: 1900,
    title: "מייל אאפסל - תיקון 190",
    target: "ללקוחה: שרה לוי <sara.levi@demo.co.il>",
    subject: "הזדמנות לפטור ממס רווחי הון (תיקון 190)",
    body: "שלום שרה,\n\nבבחינת התיק הפיננסי שלך, זיהינו שאת עומדת בקריטריונים לניצול הטבות מס משמעותיות לפי תיקון 190 (גיל 60+ וצבירה פנויה).\n\nהכנו עבורך סימולציה המדגימה כיצד הפקדה לקופת גמל לפי תיקון 190 יכולה לחסוך לך עשרות אלפי שקלים במס רווחי הון בעת המשיכה.\n\nלצפייה בסימולציה: [קישור מאובטח]",
    meta: ["מותאם AI", "מצורף PDF", "מוכן לאישור"],
  },
  {
    id: 4,
    type: "task",
    icon: FileText,
    iconBg: "bg-navy/10 text-navy-deep",
    delay: 2700,
    title: "משימה ב-CRM",
    target: "מערכת CRM של הסוכנות",
    subject: "פגישת שימור: מיכל דוד - דמי ניהול",
    body: "נוצרה משימה אוטומטית ב-CRM:\n\n• לקוחה: מיכל דוד (ת.ז. 304567890)\n• סוג: פגישת שימור (דמי ניהול גבוהים)\n• עדיפות: גבוהה\n• דדליין: עד 25/01/2026\n• הערות: הלקוחה משלמת דמי ניהול מקסימליים על צבירה של ₪650,000. סכנת ניוד גבוהה. יש להציע מסלול דמי ניהול מוזל.",
    meta: ["סנכרון אוטומטי", "תזכורת ב-3 ימים", "הוקצה ליפעת"],
  },
];

export function ActionsStage({ onComplete, parsed }: ActionsStageProps) {
  // כשקיים parsed — למצוא 4 לקוחות לדוגמה לעדכון התוכן הדינמי של ה-Actions.
  const dynamicActions = parsed ? buildActionsFromParsed(parsed) : null;
  const ACTIONS_TO_RENDER = dynamicActions ?? ACTIONS;
  const [visibleActions, setVisibleActions] = useState<number[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    ACTIONS_TO_RENDER.forEach((a) => {
      timers.push(
        setTimeout(() => {
          setVisibleActions((prev) => [...prev, a.id]);
        }, a.delay),
      );
    });

    timers.push(setTimeout(() => setShowSummary(true), 3500));

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-h-full w-full flex flex-col lg:overflow-hidden animate-fade-in bg-background">
      {/* Header (compact) */}
      <div className="shrink-0 border-b border-border/40 bg-card/60 backdrop-blur-sm">
        <div className="container py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-1.5 flex items-center gap-3">
                <div className="h-px w-10 bg-gold" />
                <span className="label-tag text-gold text-[10px]">פעולות אוטומטיות · בזמן אמת</span>
              </div>
              <h1 className="font-display text-2xl font-bold leading-tight text-navy-deep lg:text-3xl">
                ה-AI לא רק מנתח<span className="text-gold">.</span> <span className="text-muted-foreground">הוא יוזם פעולה.</span>
              </h1>
            </div>
            {showSummary && (
              <button
                onClick={onComplete}
                className="group flex items-center gap-2 rounded-sm bg-navy-deep px-5 py-2.5 text-sm font-semibold text-cream transition-all hover:bg-navy hover:shadow-lg animate-fade-up"
              >
                המשך לסיכום
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2x2 Grid - fills remaining viewport on desktop, stacks on mobile */}
      <div className="flex-1 min-h-0 container py-4">
        <div className="lg:h-full grid grid-cols-1 lg:grid-cols-2 gap-4">
          {ACTIONS_TO_RENDER.map((action) => {
            const isVisible = visibleActions.includes(action.id);
            const Icon = action.icon;
            return (
              <div
                key={action.id}
                className={`group relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 shadow-sm transition-all duration-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              >
                <div className="flex h-full flex-col gap-3">
                  {/* Header row: icon + title */}
                  <div className="flex items-start gap-3 shrink-0">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${action.iconBg} shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-navy-deep truncate">{action.title}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground truncate">{action.target}</div>
                    </div>
                  </div>
                  {/* Body */}
                  <div className="flex-1 min-h-0 rounded-lg bg-muted/30 p-3 overflow-hidden">
                    <div className="mb-1 text-sm font-semibold text-navy-deep line-clamp-1">{action.subject}</div>
                    <div className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground line-clamp-5">
                      {action.body}
                    </div>
                  </div>
                  {/* Meta */}
                  <div className="shrink-0 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {action.meta.map((m, i) => (
                      <div key={i} className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        {m}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
