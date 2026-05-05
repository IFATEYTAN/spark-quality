// Editorial Fintech | מסך פעולות אוטומטיות - הדגמת התראות
import { useEffect, useState } from "react";
import { ArrowLeft, Mail, MessageSquare, Bell, CheckCircle2, Clock, Send, FileText, Sparkles } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";

interface ActionsStageProps {
  onComplete: () => void;
}

const ACTIONS = [
  {
    id: 1,
    type: "email",
    icon: Bell,
    iconBg: "bg-red-50 text-red-700",
    delay: 300,
    title: "התראה דחופה לסוכן",
    target: "יפעת איתן <yifat@spark-ai.co.il>",
    subject: "🚨 דחוף: 21 לקוחות בריסק זמני - דורש טיפול תוך 14 יום",
    body: "שלום יפעת,\n\nמערכת SPARK AI סיימה את הניתוח החודשי של תיק הלקוחות. זוהו 21 לקוחות שכיסויי הריסק שלהם מסתיימים תוך 30 יום. סך פוטנציאל ההכנסה השנתית הצפויה לאובדן: ₪380,000.\n\nרשימה מלאה מצורפת. ממליצים ליצור קשר תוך 7 ימים.",
    meta: ["נשלח כעת", "21 לקוחות מצורפים", "PDF מוכן"],
  },
  {
    id: 2,
    type: "whatsapp",
    icon: MessageSquare,
    iconBg: "bg-emerald-50 text-emerald-700",
    delay: 1100,
    title: "הודעת WhatsApp - שימור",
    target: "ללקוח: דני כהן · 052-111-2222",
    subject: "תזכורת ידידותית: חידוש כיסוי בריאות הפניקס",
    body: "שלום דני 👋\n\nכאן יפעת מסוכנות קואליטי. רציתי להזכיר שפוליסת הבריאות שלך בהפניקס מסתיימת ב-31/01/2026.\n\nאשמח לתאם איתך שיחה קצרה (10 דק') כדי לוודא שהכיסוי שלך מעודכן ומתאים לצרכים הנוכחיים.\n\nמתי נוח לך השבוע?",
    meta: ["מותאם אישית", "אישור לפני שליחה", "מחכה לאישורך"],
  },
  {
    id: 3,
    type: "email",
    icon: Mail,
    iconBg: "bg-gold/10 text-gold",
    delay: 1900,
    title: "מייל אאפסל אוטומטי",
    target: "ללקוחה: שרה לוי <sara.levi@demo.co.il>",
    subject: "הזדמנות לחיסכון פנסיוני מותאם אישית",
    body: "שלום שרה,\n\nראינו בתיק שלך שיש קרן השתלמות פעילה באקסלנס, אך אין לך עדיין קרן פנסיה.\n\nהכנו עבורך השוואה בין 3 קרנות פנסיה מובילות, מותאמת לפרופיל שלך (גיל 45, שכירה, צבירה של ₪92,000).\n\nלצפייה בהשוואה: [קישור מאובטח]",
    meta: ["מותאם AI", "מצורף PDF", "מוכן לאישור"],
  },
  {
    id: 4,
    type: "task",
    icon: FileText,
    iconBg: "bg-navy/10 text-navy-deep",
    delay: 2700,
    title: "משימה ב-CRM",
    target: "מערכת CRM קואליטי",
    subject: "פגישת שימור: מיכל דוד - תום הנחה",
    body: "נוצרה משימה אוטומטית ב-CRM:\n\n• לקוח: מיכל דוד (ת.ז. 304567890)\n• סוג: פגישת שימור\n• עדיפות: גבוהה\n• דדליין: עד 25/01/2026\n• הערות: הנחת פרמיה מסתיימת ב-31/01. ערך פוטנציאלי לשימור: ₪580,000 צבירה.",
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
    timers.push(
      setTimeout(() => setShowSummary(true), 3500),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="h-[calc(100vh-7rem)] w-full overflow-y-auto animate-fade-in bg-background">
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
                סיכום הדמו
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container py-10">
        {/* Live counter */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "מיילים נשלחו", value: visibleActions.length >= 3 ? 169 : 0, accent: "text-gold" },
            { label: "WhatsApp פעיל", value: visibleActions.length >= 2 ? 87 : 0, accent: "text-emerald-700" },
            { label: "משימות ב-CRM", value: visibleActions.length >= 4 ? 312 : 0, accent: "text-navy-deep" },
            { label: "התראות סוכן", value: visibleActions.length >= 1 ? 21 : 0, accent: "text-red-700" },
          ].map((s, i) => (
            <div key={i} className="glass-card rounded-sm p-5">
              <div className="label-tag text-[10px] text-muted-foreground">{s.label}</div>
              <div className={`display-number text-4xl font-bold ${s.accent} mt-2`}>
                <AnimatedNumber value={s.value} duration={1000} />
              </div>
            </div>
          ))}
        </div>

        {/* Action cards - timeline style */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute right-7 top-0 bottom-0 w-px bg-gradient-to-b from-gold/40 via-border to-transparent" />

          <div className="space-y-5">
            {ACTIONS.map((action) => {
              const isVisible = visibleActions.includes(action.id);
              return (
                <div
                  key={action.id}
                  className={`relative pr-20 transition-all duration-700 ${
                    isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
                  }`}
                >
                  {/* Timeline node */}
                  <div className="absolute right-3 top-6 z-10">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-cream ${action.iconBg} ${isVisible ? "animate-pulse-gold" : ""}`}>
                      <action.icon className="h-4 w-4" strokeWidth={2} />
                    </div>
                  </div>

                  {/* Card */}
                  <div className="glass-card rounded-sm overflow-hidden">
                    {/* Top bar */}
                    <div className="flex items-center justify-between border-b border-border/40 bg-navy-deep/[0.02] px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="label-tag text-[10px] text-gold">{action.title}</span>
                        <span className="text-xs text-muted-foreground">→</span>
                        <span className="text-xs text-muted-foreground">{action.target}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                        <span className="label-tag text-[10px] text-emerald-700">בוצע</span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-5">
                      <div className="font-display text-lg font-bold text-navy-deep mb-3">
                        {action.subject}
                      </div>
                      <div className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed border-r-2 border-gold/30 pr-4">
                        {action.body}
                      </div>

                      {/* Meta tags */}
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">לפני שניות</span>
                        <span className="text-muted-foreground/40">·</span>
                        {action.meta.map((m, i) => (
                          <span key={i} className="rounded-sm bg-cream px-2 py-0.5 text-[10px] font-semibold text-navy-deep border border-border/40">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Final summary card */}
            {showSummary && (
              <div className="relative pr-20 animate-fade-up">
                <div className="absolute right-3 top-6 z-10">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-cream bg-navy-deep text-gold">
                    <Sparkles className="h-4 w-4" strokeWidth={2} />
                  </div>
                </div>
                <div className="rounded-sm overflow-hidden bg-navy-deep text-cream p-8 shadow-2xl">
                  <div className="label-tag text-gold-soft mb-3 text-shadow-sm">סיכום אוטומציה</div>
                  <div className="font-display text-3xl font-bold leading-tight text-shadow-md">
                    בתוך 47 שניות,<br />
                    המערכת ביצעה <span className="text-gold">589 פעולות</span><br />
                    שהיו דורשות <span className="text-gold">3 שבועות</span> ידנית.
                  </div>
                  <div className="mt-6 flex items-center gap-3">
                    <Send className="h-4 w-4 text-gold" />
                    <span className="text-sm text-cream/90 text-shadow-sm">כל הפעולות מתועדות, ניתנות לביטול, ומשולבות במערכות הקיימות שלכם.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
