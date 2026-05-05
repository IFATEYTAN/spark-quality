// Editorial Fintech | מסך סיכום סופי
import { ArrowLeft, RotateCcw, CheckCircle2 } from "lucide-react";
import { ASSETS } from "@/lib/demoData";

interface SummaryStageProps {
  onReset: () => void;
}

export function SummaryStage({ onReset }: SummaryStageProps) {
  return (
    <div className="relative grid min-h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-12 animate-fade-in">
      {/* Right: content */}
      <div className="lg:col-span-7 flex items-center px-6 py-12 lg:px-16 lg:py-20 order-2 lg:order-1">
        <div className="max-w-2xl">
          <div className="mb-6 flex items-center gap-3 animate-fade-up">
            <div className="h-px w-12 bg-gold" />
            <span className="label-tag text-gold">סיכום הדמו · קואליטי × SPARK AI</span>
          </div>

          <h1 className="font-display text-5xl font-bold leading-[1.05] text-navy-deep lg:text-7xl animate-fade-up" style={{ animationDelay: "0.1s" }}>
            זה כל הסיפור<span className="text-gold">.</span>
          </h1>

          <p className="mt-8 text-lg leading-relaxed text-muted-foreground animate-fade-up" style={{ animationDelay: "0.2s" }}>
            ראינו איך תוך פחות ממדה, פלטפורמת SPARK AI הופכת דוח אקסל "מת" לרשימת פעולות עסקיות חיה,
            עם פוטנציאל הכנסה של <span className="font-semibold text-navy-deep">2.84 מיליון ₪</span>.
          </p>

          {/* Key metrics summary */}
          <div className="mt-12 grid grid-cols-2 gap-6 border-y border-border/60 py-8 animate-fade-up" style={{ animationDelay: "0.3s" }}>
            {[
              { label: "זמן ניתוח", value: "47 שניות", sub: "במקום 3 שבועות" },
              { label: "דגלים זוהו", value: "1,071", sub: "ב-1,247 לקוחות" },
              { label: "פעולות בוצעו", value: "589", sub: "אוטומטית, מותאמות" },
              { label: "פוטנציאל הכנסה", value: "₪2.84M", sub: "מיידי" },
            ].map((m, i) => (
              <div key={i}>
                <div className="label-tag text-[10px] text-gold">{m.label}</div>
                <div className="display-number text-3xl font-bold text-navy-deep mt-2">{m.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{m.sub}</div>
              </div>
            ))}
          </div>

          {/* Next steps */}
          <div className="mt-10 animate-fade-up" style={{ animationDelay: "0.4s" }}>
            <h3 className="font-display text-xl font-bold text-navy-deep mb-4">מה השלבים הבאים?</h3>
            <div className="space-y-3">
              {[
                "פיילוט עם 5-10 סוכנים נבחרים מקואליטי",
                "התמקדות ב-2 תהליכים: ניתוח דוחות + סיכומי פגישות",
                "מדידת ROI לאחר 30 יום והרחבה לכלל הסוכנות",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-gold mt-0.5 flex-shrink-0" strokeWidth={2} />
                  <span className="text-sm text-foreground/85">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 animate-fade-up" style={{ animationDelay: "0.5s" }}>
            <button
              onClick={onReset}
              className="group flex items-center justify-center gap-2 rounded-sm bg-navy-deep px-8 py-4 text-sm font-semibold text-cream transition-all hover:bg-navy hover:shadow-xl"
            >
              <RotateCcw className="h-4 w-4 transition-transform group-hover:-rotate-180" />
              הפעל את הדמו מההתחלה
            </button>
            <button className="group flex items-center justify-center gap-2 rounded-sm border border-navy-deep px-8 py-4 text-sm font-semibold text-navy-deep transition-all hover:bg-navy-deep hover:text-cream">
              קבעו פגישת אפיון
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            </button>
          </div>

          {/* Footer note */}
          <div className="mt-12 pt-8 border-t border-border/40 text-xs text-muted-foreground animate-fade-up" style={{ animationDelay: "0.6s" }}>
            <p>הדמו מבוסס על דוח "מוצרים בניהול" אמיתי משורנס. כל הנתונים אנונימיים ולשימוש פנימי בלבד.</p>
            <p className="mt-1">© 2026 SPARK AI · בשיתוף בית הסוכן קואליטי</p>
          </div>
        </div>
      </div>

      {/* Left: hero image */}
      <div className="relative lg:col-span-5 overflow-hidden order-1 lg:order-2 min-h-[300px] lg:min-h-full bg-navy-deep">
        <img
          src={ASSETS.hero}
          alt=""
          className="h-full w-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-navy-deep/30 via-transparent to-transparent" />

        {/* Quote overlay */}
        <div className="absolute inset-0 flex items-end p-8 lg:p-12">
          <div className="glass-card rounded-sm p-8 max-w-md animate-fade-up" style={{ animationDelay: "0.8s" }}>
            <div className="text-6xl font-display text-gold leading-none">"</div>
            <p className="mt-2 text-lg leading-relaxed text-navy-deep font-display">
              ה-AI לא בא להחליף אתכם.<br />
              הוא בא להפוך אתכם<br />
              ל<span className="text-gold font-bold">סוכני-על</span>.
            </p>
            <div className="mt-4 pt-4 border-t border-border/40">
              <div className="label-tag text-[10px] text-muted-foreground">SPARK AI × קוואליטי</div>
              <div className="text-sm font-semibold text-navy-deep mt-1">פיילוט הדרכה · מאי 2026</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
