// Editorial Fintech | מסך פתיחה - סטוריטלינג: הכאב מול הפתרון
// פריסה: 16:9 - גובה מלא, ללא גלילה, תוכן ממורכז
import { useEffect, useState } from "react";
import { ArrowLeft, FileSpreadsheet, Clock, AlertTriangle, Sparkles, Zap, Target } from "lucide-react";

interface IntroStageProps {
  onContinue: () => void;
}

export function IntroStage({ onContinue }: IntroStageProps) {
  const [phase, setPhase] = useState<"hook" | "pain" | "transition" | "promise">("hook");

  // Slowed-down phase transitions for live presentation: ~7s per phase
  // Click "דלג להתחלה" to advance manually faster
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("pain"), 6500);
    const t2 = setTimeout(() => setPhase("transition"), 13500);
    const t3 = setTimeout(() => setPhase("promise"), 19500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-navy-deep">
      {/* Background gradient layers */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at top right, #1a3a5e 0%, transparent 60%), radial-gradient(ellipse at bottom left, #2d1b4e 0%, transparent 50%)",
          }}
        />
        {/* Grain */}
        <div
          className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
          }}
        />
        {/* Animated golden particles */}
        {phase === "promise" && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute h-1 w-1 rounded-full bg-gold animate-pulse"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stage progress dots (top left in RTL = the visual right corner of progress) */}
      <div className="absolute top-6 right-1/2 translate-x-1/2 flex items-center gap-2 z-20">
        {["hook", "pain", "transition", "promise"].map((p, i) => (
          <div
            key={p}
            className={`h-1 rounded-full transition-all duration-500 ${
              ["hook", "pain", "transition", "promise"].indexOf(phase) >= i
                ? "w-8 bg-gold"
                : "w-4 bg-white/15"
            }`}
          />
        ))}
      </div>

      {/* Content - centered, max width for projector proportions */}
      <div className="relative h-full w-full flex items-center justify-center px-8 py-16">
        <div className="w-full max-w-[1200px]">
          {/* PHASE 1: HOOK - the question */}
          {phase === "hook" && (
            <div className="text-center animate-fade-up">
              <div className="mb-6 inline-flex items-center gap-3">
                <div className="h-px w-12 bg-gold" />
                <span className="label-tag text-gold">הקדמה</span>
                <div className="h-px w-12 bg-gold" />
              </div>
              <h1 className="font-display font-black text-white leading-[1.05] text-5xl lg:text-7xl tracking-tighter">
                כמה <span className="text-gold">הזדמנויות</span><br />
                איבדת השבוע<br />
                בלי שידעת בכלל?
              </h1>
              <p className="mt-8 text-xl lg:text-2xl text-white/70 font-light max-w-2xl mx-auto">
                לפני שנראה לכם את הפתרון, בואו נבין רגע<br />
                איך נראה השבוע של רוב הסוכנים בישראל.
              </p>
            </div>
          )}

          {/* PHASE 2: PAIN - reality check */}
          {phase === "pain" && (
            <div className="animate-fade-up">
              <div className="text-center mb-10">
                <span className="label-tag text-gold-soft/90">המציאות היומיומית</span>
                <h2 className="mt-4 font-display font-black text-white leading-[1.1] text-4xl lg:text-6xl tracking-tighter">
                  אתם <span className="text-gold">קבורים בנתונים</span>.<br />
                  אבל לא רואים את הסיפור.
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
                {[
                  {
                    icon: FileSpreadsheet,
                    title: "אקסלים מסורבלים",
                    desc: "דוחות עם 500+ שורות שאף אחד לא קורא עד הסוף",
                  },
                  {
                    icon: Clock,
                    title: "8 שעות שבועיות",
                    desc: "מבוזבזות על סינון ידני ובדיקת סטטוסים",
                  },
                  {
                    icon: AlertTriangle,
                    title: "לקוחות בריסק זמני",
                    desc: "מתפספסים ובסוף עוזבים בלי שתדעו",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-white/10 bg-white/5 backdrop-blur-md p-6 text-right animate-fade-up"
                    style={{ animationDelay: `${0.15 * (i + 1)}s` }}
                  >
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-md bg-gold/15 text-gold">
                      <item.icon className="h-6 w-6" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-display font-bold text-xl text-white mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-white/70 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PHASE 3: TRANSITION - aha moment */}
          {phase === "transition" && (
            <div className="text-center animate-fade-up">
              <div className="mb-8 inline-flex items-center gap-4">
                <div className="h-px w-20 bg-gold" />
                <Sparkles className="h-6 w-6 text-gold animate-pulse" />
                <div className="h-px w-20 bg-gold" />
              </div>
              <h2 className="font-display font-black text-white leading-[1.05] text-5xl lg:text-7xl tracking-tighter">
                ומה אם<br />
                <span className="bg-gradient-to-l from-gold via-[#F4D87C] to-gold bg-clip-text text-transparent">
                  היה לכם שותף AI חכם
                </span><br />
                שעובד 24/7?
              </h2>
            </div>
          )}

          {/* PHASE 4: PROMISE - the solution intro */}
          {phase === "promise" && (
            <div className="animate-fade-up">
              {/* Tagline only (Logo removed) */}
              <div className="text-center mb-6">
                <p className="font-display-light text-white/85 text-2xl lg:text-3xl">
                  הקסם של ה-AI. <span className="text-gold font-semibold">בעוצמה של הסוכן.</span>
                </p>
              </div>

              {/* Three promises */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto mb-6">
                {[
                  {
                    icon: Zap,
                    title: "30 שניות",
                    desc: "מהעלאת אקסל לרשימת פעולות מוכנה",
                  },
                  {
                    icon: Target,
                    title: "97.4% דיוק",
                    desc: "בזיהוי לקוחות בסיכון והזדמנויות",
                  },
                  {
                    icon: Sparkles,
                    title: "אוטומציה מלאה",
                    desc: "וואטסאפ, מייל ומשימות CRM בלחיצה אחת",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent backdrop-blur-md p-5 text-right animate-fade-up"
                    style={{ animationDelay: `${0.2 * (i + 1)}s` }}
                  >
                    <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-md bg-gold/20 text-gold">
                      <item.icon className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-display font-black text-xl lg:text-2xl text-[#F4D87C] mb-1 tracking-tight">
                      {item.title}
                    </h3>
                    <p className="text-xs lg:text-sm text-white/80 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="text-center">
                <button
                  onClick={onContinue}
                  className="group inline-flex items-center gap-3 rounded-md bg-gradient-to-l from-gold to-[#F4D87C] px-8 py-4 font-display font-bold text-navy-deep text-base lg:text-lg tracking-tight shadow-2xl shadow-gold/30 transition-all hover:scale-105 hover:shadow-gold/50"
                >
                  בואו נראה את זה בפעולה
                  <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                </button>
                <p className="mt-3 label-tag text-white/50 text-[10px]">
                  לחצו כדי להתחיל את הדמו · משך הדמו 4 דקות
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom skip control */}
      {phase !== "promise" && (
        <button
          onClick={() => setPhase("promise")}
          className="absolute bottom-6 left-6 text-white/40 hover:text-gold text-xs label-tag transition-colors z-20"
        >
          דלג להתחלה ←
        </button>
      )}
    </div>
  );
}
