// Editorial Fintech | מסך פעולות אוטומטיות - הדגמת התראות פיננסיות
import { useEffect, useState } from "react";
import { ArrowLeft, MessageSquare, CheckCircle2, FileText, Briefcase, TrendingUp, Mail } from "lucide-react";

interface ActionsStageProps {
  onComplete: () => void;
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

export function ActionsStage({ onComplete }: ActionsStageProps) {
  const [visibleActions, setVisibleActions] = useState<number[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    ACTIONS.forEach((a) => {
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
    <div className="h-full w-full overflow-y-auto animate-fade-in bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/60 backdrop-blur-sm">
        <div className="container py-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className="h-px w-12 bg-gold" />
                <span className="label-tag text-gold">פעולות אוטומטיות · בזמן אמת</span>
              </div>
              <h1 className="font-display text-4xl font-bold leading-tight text-navy-deep lg:text-5xl">
                ה-AI לא רק מנתח<span className="text-gold">.</span><br />
                <span className="text-muted-foreground">הוא יוזם פעולה.</span>
              </h1>
            </div>
            {showSummary && (
              <button
                onClick={onComplete}
                className="group flex items-center gap-2 rounded-sm bg-navy-deep px-6 py-3 text-sm font-semibold text-cream transition-all hover:bg-navy hover:shadow-lg animate-fade-up"
              >
                המשך לסיכום
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Actions List */}
      <div className="container py-12">
        <div className="mx-auto max-w-4xl space-y-6">
          {ACTIONS.map((action) => {
            const isVisible = visibleActions.includes(action.id);
            const Icon = action.icon;
            if (!isVisible) return null;
            return (
              <div
                key={action.id}
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-6 shadow-sm transition-all hover:shadow-md animate-fade-up"
              >
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                  <div className="flex flex-col items-center gap-3 sm:w-32 sm:shrink-0">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-full ${action.iconBg}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-navy-deep">{action.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{action.target}</div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="rounded-lg bg-muted/30 p-4">
                      <div className="mb-2 font-semibold text-navy-deep">{action.subject}</div>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                        {action.body}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {action.meta.map((m, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          {m}
                        </div>
                      ))}
                    </div>
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
