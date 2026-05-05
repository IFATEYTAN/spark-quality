// Editorial Fintech | מסך סיכום סופי - תמונה + טקסט מסודרים, Wow finale
import { ArrowLeft, RotateCcw, Calendar } from "lucide-react";
import { LOGO } from "@/lib/demoData";

interface SummaryStageProps {
  onReset: () => void;
}

export function SummaryStage({ onReset }: SummaryStageProps) {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] animate-fade-in overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-bl from-cream via-ivory to-white" />
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-navy/10 blur-3xl" />

      <div className="relative grid min-h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-12 items-center">
        {/* RIGHT (RTL primary): content */}
        <div className="lg:col-span-7 px-6 py-12 lg:px-16 lg:py-16">
          <div className="max-w-2xl">
            <div className="mb-6 flex items-center gap-3 animate-fade-up">
              <div className="h-px w-16 bg-gold" />
              <span className="label-tag text-gold">סיכום הדמו · קואליטי × SPARK AI</span>
            </div>

            <h1 className="font-display text-6xl font-black leading-[0.95] text-navy-deep lg:text-8xl tracking-tighter animate-fade-up" style={{ animationDelay: "0.1s" }}>
              זה כל<br />
              הסיפור<span className="text-gold">.</span>
            </h1>

            <p className="mt-8 text-xl leading-relaxed text-muted-foreground font-light max-w-xl animate-fade-up" style={{ animationDelay: "0.2s" }}>
              ראינו איך תוך פחות מדקה, פלטפורמת SPARK AI הופכת דוח אקסל "מת" לרשימת
              פעולות עסקיות חיה, עם פוטנציאל הכנסה של{" "}
              <span className="font-semibold text-navy-deep">2.84 מיליון ₪</span>.
            </p>

            {/* Key metrics - inline horizontal */}
            <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6 border-y border-border/60 py-8 animate-fade-up" style={{ animationDelay: "0.3s" }}>
              {[
                { label: "זמן ניתוח", value: "47", unit: "שניות", sub: "במקום 3 שבועות" },
                { label: "דגלים זוהו", value: "1,071", unit: "", sub: "ב-1,247 לקוחות" },
                { label: "פעולות בוצעו", value: "589", unit: "", sub: "אוטומטיות, מותאמות" },
                { label: "פוטנציאל", value: "2.84", unit: "M ₪", sub: "הכנסה מיידית" },
              ].map((m, i) => (
                <div key={i}>
                  <div className="label-tag text-[10px] text-gold mb-2">{m.label}</div>
                  <div className="display-number text-4xl font-black text-navy-deep">
                    {m.value}{m.unit && <span className="text-xl text-gold mr-1">{m.unit}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1.5">{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Next steps */}
            <div className="mt-10 animate-fade-up" style={{ animationDelay: "0.4s" }}>
              <h3 className="font-display text-2xl font-bold text-navy-deep mb-5 tracking-tight">השלבים הבאים שלכם</h3>
              <div className="space-y-3">
                {[
                  { num: "01", text: "פיילוט עם 5-10 סוכנים נבחרים מקואליטי" },
                  { num: "02", text: "התמקדות ב-2 תהליכים: ניתוח דוחות + סיכומי פגישות" },
                  { num: "03", text: "מדידת ROI לאחר 30 יום והרחבה לכלל הסוכנות" },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-4 group">
                    <span className="font-display text-2xl font-black text-gold/40 group-hover:text-gold transition-colors mono-num leading-none">
                      {step.num}
                    </span>
                    <span className="text-base text-foreground/85 leading-relaxed pt-1">{step.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 animate-fade-up" style={{ animationDelay: "0.5s" }}>
              <button
                onClick={onReset}
                className="group flex items-center justify-center gap-2 rounded-md bg-navy-deep px-8 py-4 text-sm font-bold text-cream transition-all hover:bg-navy hover:shadow-2xl hover:shadow-navy/20"
              >
                <RotateCcw className="h-4 w-4 transition-transform group-hover:-rotate-180 duration-500" />
                הפעל את הדמו מההתחלה
              </button>
              <button className="group flex items-center justify-center gap-2 rounded-md border-2 border-navy-deep bg-transparent px-8 py-4 text-sm font-bold text-navy-deep transition-all hover:bg-navy-deep hover:text-cream">
                <Calendar className="h-4 w-4" />
                קבעו פגישת אפיון
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </button>
            </div>
          </div>
        </div>

        {/* LEFT: SPARK AI signature logo card + floating quote */}
        <div className="hidden lg:col-span-5 lg:block relative h-full min-h-[calc(100vh-4rem)]">
          {/* Branded logo card with elegant frame */}
          <div className="absolute inset-8 overflow-hidden rounded-md shadow-2xl shadow-navy/30">
            {/* Deep navy/purple gradient background to match the original logo aesthetic */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a0f3d] via-navy-deep to-[#2a1854]" />
            {/* Subtle gold border frame */}
            <div className="absolute inset-3 border border-gold/30 rounded-md pointer-events-none" />
            {/* Animated gold particles */}
            <div className="absolute inset-0 opacity-30" style={{
              backgroundImage: "radial-gradient(circle at 20% 30%, rgba(201, 169, 97, 0.4) 0%, transparent 8%), radial-gradient(circle at 80% 70%, rgba(201, 169, 97, 0.3) 0%, transparent 6%), radial-gradient(circle at 50% 50%, rgba(201, 169, 97, 0.2) 0%, transparent 10%)"
            }} />
            {/* Grain texture */}
            <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
              style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")"
              }}
            />

            {/* Logo centered */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-12">
              <img
                src={LOGO.clear}
                alt="SPARK AI"
                className="w-full max-w-md object-contain animate-fade-up drop-shadow-2xl"
                style={{ filter: "drop-shadow(0 8px 32px rgba(201, 169, 97, 0.3))" }}
              />
              <div className="mt-6 h-px w-32 bg-gradient-to-r from-transparent via-gold to-transparent" />
              <p className="mt-6 font-display text-lg text-gold-soft text-center tracking-wide" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
                Sprinkle AI &amp; Automation<br />Magic Into Your Business
              </p>
            </div>
          </div>

          {/* Floating testimonial card - bottom, overlapping the brand card */}
          <div className="absolute bottom-16 right-0 left-16 animate-fade-up z-10" style={{ animationDelay: "0.7s" }}>
            <div className="bg-white rounded-md p-7 shadow-2xl shadow-navy/40 border border-gold/30">
              <div className="flex gap-4">
                <div className="text-7xl font-display text-gold leading-none -mt-2 flex-shrink-0">“</div>
                <div className="pt-2">
                  <p className="font-display text-xl leading-snug text-navy-deep tracking-tight">
                    זה לא רק כלי נוסף.<br />
                    זו <span className="text-gold font-black">מהפכה שקטה</span><br />
                    בדרך שאני עובדת.
                  </p>
                  <div className="mt-4 pt-4 border-t border-border/40 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gold to-gold-soft flex items-center justify-center text-navy-deep font-display font-black">
                      נכ
                    </div>
                    <div>
                      <div className="text-sm font-bold text-navy-deep">נועה כהן</div>
                      <div className="text-xs text-muted-foreground">סמנכ“לית טכנולוגיות, קואליטי</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-border/40 bg-white/60 backdrop-blur-sm">
        <div className="container py-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            הדמו מבוסס על דוח "מוצרים בניהול" אמיתי משורנס. כל הנתונים אנונימיים.
          </p>
          <p className="text-xs text-muted-foreground">© 2026 SPARK AI · בשיתוף בית הסוכן קואליטי</p>
        </div>
      </div>
    </div>
  );
}
