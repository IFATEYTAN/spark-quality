// Editorial Fintech | מסך סיכום סופי — פריסה גלילה במלואו, ללא חיתוך פוטר/טקסטים
import { useState } from "react";
import { ArrowLeft, RotateCcw, Calendar } from "lucide-react";
import { ContactModal } from "./ContactModal";

interface SummaryStageProps {
  onReset: () => void;
}

export function SummaryStage({ onReset }: SummaryStageProps) {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="relative h-full w-full animate-fade-in overflow-y-auto">
      {/* Subtle background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-bl from-cream via-ivory to-white" />
      <div className="absolute -top-32 -left-32 -z-10 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 -z-10 h-96 w-96 rounded-full bg-navy/10 blur-3xl" />

      <div className="relative w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10 pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* RIGHT (RTL primary): content */}
          <div className="lg:col-span-7">
            <div className="max-w-2xl">
              <div className="mb-5 flex items-center gap-3 animate-fade-up">
                <div className="h-px w-16 bg-gold" />
                <span className="label-tag text-gold">סיכום הדמו · SPARK AI</span>
              </div>

              <h1
                className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black leading-[0.95] text-navy-deep tracking-tighter animate-fade-up"
                style={{ animationDelay: "0.1s" }}
              >
                זה כל
                <br />
                הסיפור<span className="text-gold">.</span>
              </h1>

              <p
                className="mt-5 text-base leading-relaxed text-muted-foreground font-light max-w-xl animate-fade-up"
                style={{ animationDelay: "0.2s" }}
              >
                ראינו איך תוך פחות מדקה, פלטפורמת SPARK AI הופכת דוח אקסל "מת" לרשימת
                פעולות עסקיות חיה, עם פוטנציאל הכנסה של{" "}
                <span className="font-semibold text-navy-deep">2.84 מיליון ₪</span>.
              </p>

              {/* Key metrics */}
              <div
                className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4 border-y border-border/60 py-4 animate-fade-up"
                style={{ animationDelay: "0.3s" }}
              >
                {[
                  { label: "זמן ניתוח", value: "47", unit: "שניות", sub: "במקום 3 שבועות" },
                  { label: "דגלים זוהו", value: "1,071", unit: "", sub: "ב-1,247 לקוחות" },
                  { label: "פעולות בוצעו", value: "589", unit: "", sub: "אוטומטיות, מותאמות" },
                  { label: "פוטנציאל", value: "2.84", unit: "M ₪", sub: "הכנסה מיידית" },
                ].map((m, i) => (
                  <div key={i}>
                    <div className="label-tag text-[10px] text-gold mb-2">{m.label}</div>
                    <div className="display-number text-3xl font-black text-navy-deep">
                      {m.value}
                      {m.unit && <span className="text-xl text-gold mr-1">{m.unit}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1.5">{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Financial opportunities */}
              <div
                className="mt-4 rounded-md border border-gold/30 bg-gradient-to-l from-gold/5 to-transparent p-4 animate-fade-up"
                style={{ animationDelay: "0.35s" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px w-6 bg-gold" />
                  <span className="label-tag text-[10px] text-gold tracking-[0.3em]">
                    זיהוי הזדמנויות פיננסיות
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "לקוחות VIP", value: "42", sub: "צבירה מעל 1M ₪" },
                    { label: "השתלמויות נזילות", value: "186", sub: "להגדלה / IRA" },
                    { label: "תיקון 190", value: "54", sub: "פטור ממס רווחי הון" },
                  ].map((m, i) => (
                    <div key={i}>
                      <div className="text-[10px] text-gold/80 mb-1 font-semibold">{m.label}</div>
                      <div className="display-number text-2xl font-black text-gold">{m.value}</div>
                      <div className="text-[10px] text-navy-deep/70 mt-1">{m.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next steps */}
              <div className="mt-4 animate-fade-up" style={{ animationDelay: "0.4s" }}>
                <h3 className="font-display text-xl font-bold text-navy-deep mb-3 tracking-tight">
                  השלבים הבאים שלכם
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { num: "01", text: "פיילוט עם 5-10 סוכנים נבחרים" },
                    { num: "02", text: "התמקדות ב-2 תהליכים: ניתוח דוחות + סיכומי פגישות" },
                    { num: "03", text: "מדידת ROI לאחר 30 יום והרחבה לכלל הסוכנות" },
                  ].map((step, i) => (
                    <div
                      key={i}
                      className="flex flex-col items-start gap-1.5 rounded-md border border-gold/25 bg-gold/5 p-3 transition-all hover:border-gold hover:bg-gold/10"
                    >
                      <span className="font-display text-xl font-black text-gold mono-num leading-none">
                        {step.num}
                      </span>
                      <span className="text-xs text-navy-deep/85 leading-snug font-medium">
                        {step.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div
                className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 animate-fade-up"
                style={{ animationDelay: "0.5s" }}
              >
                <button
                  type="button"
                  onClick={onReset}
                  className="group flex items-center justify-center gap-2 rounded-md bg-navy-deep px-6 py-3 text-sm font-bold text-cream transition-all hover:bg-navy hover:shadow-2xl hover:shadow-navy/20"
                >
                  <RotateCcw className="h-4 w-4 transition-transform group-hover:-rotate-180 duration-500" />
                  הפעל את הדמו מההתחלה
                </button>
                <button
                  type="button"
                  onClick={() => setContactOpen(true)}
                  className="group flex items-center justify-center gap-2 rounded-md border-2 border-navy-deep bg-transparent px-6 py-3 text-sm font-bold text-navy-deep transition-all hover:bg-navy-deep hover:text-cream"
                >
                  <Calendar className="h-4 w-4" />
                  קבעו פגישת אפיון
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                </button>
              </div>
            </div>
          </div>

          {/* LEFT: Editorial brand statement + testimonial */}
          <aside className="lg:col-span-5 lg:flex lg:flex-col gap-5">
            {/* Brand statement card */}
            <div className="relative overflow-hidden rounded-md shadow-2xl shadow-navy/30 min-h-[420px]">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-navy-deep to-[#152844]" />
              <div className="absolute inset-3 border border-gold/30 rounded-md pointer-events-none" />
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 30%, rgba(201, 169, 97, 0.4) 0%, transparent 8%), radial-gradient(circle at 80% 70%, rgba(201, 169, 97, 0.3) 0%, transparent 6%), radial-gradient(circle at 50% 50%, rgba(201, 169, 97, 0.2) 0%, transparent 10%)",
                }}
              />
              <div
                className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
                }}
              />

              {/* Decorative corner ornaments */}
              <div className="absolute top-6 right-6 h-10 w-10 border-t-2 border-r-2 border-gold/40 pointer-events-none" />
              <div className="absolute top-6 left-6 h-10 w-10 border-t-2 border-l-2 border-gold/40 pointer-events-none" />
              <div className="absolute bottom-6 right-6 h-10 w-10 border-b-2 border-r-2 border-gold/40 pointer-events-none" />
              <div className="absolute bottom-6 left-6 h-10 w-10 border-b-2 border-l-2 border-gold/40 pointer-events-none" />

              {/* Content - flow naturally so no text gets clipped */}
              <div className="relative flex flex-col items-center justify-center px-6 sm:px-10 py-10 sm:py-12 text-center gap-5">
                <div
                  className="flex items-center gap-3 animate-fade-in flex-wrap justify-center"
                  style={{ animationDelay: "0.3s" }}
                >
                  <div className="h-px w-8 bg-gold/60" />
                  <span className="label-tag text-gold-soft tracking-[0.35em] text-[10px]">
                    THE FUTURE OF INSURANCE
                  </span>
                  <div className="h-px w-8 bg-gold/60" />
                </div>

                <h2
                  className="font-display font-black text-white text-3xl sm:text-4xl lg:text-5xl xl:text-6xl leading-[0.95] tracking-tighter animate-fade-up"
                  style={{ animationDelay: "0.4s" }}
                >
                  <span className="text-gold">הקסם</span>
                  <br />
                  של ה-AI.
                </h2>

                <div
                  className="flex items-center gap-4 animate-fade-in"
                  style={{ animationDelay: "0.6s" }}
                >
                  <div className="h-px w-10 bg-gradient-to-r from-transparent to-gold" />
                  <span className="font-display text-3xl font-thin text-gold/70">×</span>
                  <div className="h-px w-10 bg-gradient-to-l from-transparent to-gold" />
                </div>

                <h2
                  className="font-display font-black text-white text-3xl sm:text-4xl lg:text-5xl xl:text-6xl leading-[0.95] tracking-tighter animate-fade-up"
                  style={{ animationDelay: "0.7s" }}
                >
                  <span className="text-gold">העוצמה</span>
                  <br />
                  שלכם.
                </h2>

                {/* Closing manifesto - now in normal flow, never clipped */}
                <div
                  className="mt-2 flex flex-col items-center gap-3 animate-fade-up max-w-md"
                  style={{ animationDelay: "0.9s" }}
                >
                  <div className="h-px w-48 bg-gradient-to-r from-transparent via-gold to-transparent" />
                  <p className="font-display-light text-white text-base sm:text-lg lg:text-xl text-center tracking-tight leading-relaxed">
                    אתם לא צריכים{" "}
                    <span className="text-gold/50 line-through decoration-gold/70">עוד זמן</span>.
                    <br />
                    אתם צריכים <span className="text-gold font-bold">יותר פוקוס</span>.
                  </p>
                  <p className="font-display-light text-gold-soft/60 text-[11px] sm:text-xs tracking-[0.2em] italic">
                    "You don't need more time. You need more focus."
                  </p>
                  <p className="label-tag text-[10px] text-white/50 tracking-[0.3em]">SPARK AI</p>
                </div>
              </div>
            </div>

            {/* Testimonial card */}
            <div className="animate-fade-up z-10" style={{ animationDelay: "0.9s" }}>
              <div className="bg-white rounded-md p-5 shadow-2xl shadow-navy/40 border border-gold/30">
                <div className="flex gap-3 items-start">
                  <div className="text-5xl font-display text-gold leading-none flex-shrink-0">"</div>
                  <div className="pt-1 flex-1 min-w-0">
                    <p className="font-display text-base lg:text-lg leading-snug text-navy-deep tracking-tight">
                      זה לא רק כלי נוסף. זו <span className="text-gold font-black">מהפכה שקטה</span> בדרך
                      שאני עובדת.
                    </p>
                    <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-gold to-gold-soft flex items-center justify-center text-navy-deep font-display font-black text-sm">
                        רא
                      </div>
                      <div>
                        <div className="text-sm font-bold text-navy-deep">רונית אבני</div>
                        <div className="text-xs text-muted-foreground">סוכנת ביטוח בכירה</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Footer (in flow now — never clipped, scrolls with the page) */}
        <div className="mt-10 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground text-center sm:text-right">
            הדמו מבוסס על דוח "מוצרים בניהול" אמיתי משורנס. כל הנתונים אנונימיים.
          </p>
          <p className="text-xs text-muted-foreground">© 2026 SPARK AI</p>
        </div>
      </div>

      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}
