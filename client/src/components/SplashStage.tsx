// Editorial Fintech | מסך פתיחה דרמטי וסינמטי - גרסה 2
// רקע נייבי כהה אחיד עם הפייה מרחפת מעל הלוגו ומפזרת אבקת קסמים
// כפתור יציאה בולט בפינה השמאלית-העליונה
// 12s default duration, click anywhere to skip
import { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { useLocation } from "wouter";
import { LOGO } from "@/lib/demoData";

interface SplashStageProps {
  onComplete: () => void;
  durationMs?: number;
}

export function SplashStage({ onComplete, durationMs = 12000 }: SplashStageProps) {
  const [, navigate] = useLocation();

  // Fairy dust particles - מתפזרים סביב הפייה (top-center)
  const dustParticles = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        top: 8 + Math.random() * 35,
        left: 30 + Math.random() * 40,
        size: 1.5 + Math.random() * 3,
        delay: Math.random() * 4,
        duration: 3 + Math.random() * 4,
        opacity: 0.4 + Math.random() * 0.6,
      })),
    []
  );

  // Background ambient particles - חלקיקים עדינים בכל המסך
  const bgParticles = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: 1 + Math.random() * 2,
        delay: Math.random() * 5,
        duration: 4 + Math.random() * 5,
        opacity: 0.2 + Math.random() * 0.4,
      })),
    []
  );

  useEffect(() => {
    const timer = setTimeout(onComplete, durationMs);
    return () => clearTimeout(timer);
  }, [onComplete, durationMs]);

  const handleExit = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate("/");
  };

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden cursor-pointer bg-[#06101F]"
      onClick={onComplete}
      role="button"
      aria-label="דלג למצגת"
    >
      {/* Deep navy gradient background - אחיד עם המערכת */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at top, #0a1a35 0%, #06101F 50%, #030813 100%)",
        }}
      />

      {/* Subtle ambient sparkles overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {bgParticles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-gold-light"
            style={{
              top: `${p.top}%`,
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,
              boxShadow: `0 0 ${p.size * 4}px rgba(201,169,97,0.6)`,
              animation: `fairy-dust ${p.duration}s ease-out ${p.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Fairy dust around the fairy area */}
      <div className="absolute inset-0 pointer-events-none">
        {dustParticles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              top: `${p.top}%`,
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: "rgba(255, 215, 130, 0.95)",
              opacity: p.opacity,
              boxShadow: `0 0 ${p.size * 5}px rgba(255,215,130,0.8), 0 0 ${p.size * 10}px rgba(201,169,97,0.5)`,
              animation: `fairy-dust ${p.duration}s ease-out ${p.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Subtle noise texture */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Exit button - top-left */}
      <button
        onClick={handleExit}
        className="absolute top-5 left-5 z-[110] flex items-center gap-2 rounded-full border border-gold/40 bg-black/40 backdrop-blur-md px-4 py-2 text-xs font-semibold tracking-wider text-gold hover:bg-gold/10 hover:border-gold/70 transition-all"
        aria-label="יציאה לעמוד הבית"
      >
        <X className="h-4 w-4" />
        <span>יציאה</span>
      </button>

      {/* Centered content */}
      <div className="relative h-full w-full overflow-y-auto px-5 sm:px-8 py-10">
        <div className="min-h-full w-full flex flex-col items-center justify-center text-center">
          {/* Top label */}
          <div
            className="mb-4 sm:mb-6 animate-fade-in"
            style={{ animationDelay: "0.2s", animationDuration: "1.4s" }}
          >
            <p className="label-tag text-[10px] sm:text-[11px] text-gold/80 tracking-[0.35em] sm:tracking-[0.45em]">
              Sprinkle AI · Automation Magic
            </p>
          </div>

          {/* SPARK AI logo */}
          <div
            className="animate-fade-up flex items-center justify-center w-full"
            style={{ animationDelay: "0.5s", animationDuration: "1.4s" }}
          >
            <img
              src={LOGO.clear}
              alt="SPARK AI"
              className="w-[180px] sm:w-[300px] lg:w-[480px] h-auto object-contain drop-shadow-[0_10px_40px_rgba(201,169,97,0.55)]"
              style={{ filter: "drop-shadow(0 0 30px rgba(201,169,97,0.4))" }}
            />
          </div>

          {/* Product name */}
          <div
            className="mt-2 sm:mt-4 animate-fade-in"
            style={{ animationDelay: "0.7s", animationDuration: "1.4s" }}
          >
            <p className="font-brand text-xl sm:text-3xl lg:text-4xl text-gold-light tracking-[0.16em] sm:tracking-[0.22em]">
              <span className="font-bold">SPARK</span>{" "}
              <span className="font-medium">Quality</span>
            </p>
            <p className="label-tag text-[9px] sm:text-[10px] text-gold-soft/80 tracking-[0.35em] sm:tracking-[0.4em] mt-2">
              מבית SPARK AI
            </p>
          </div>

          {/* Golden divider */}
          <div
            className="relative mt-5 sm:mt-8 animate-fade-in w-full max-w-[380px]"
            style={{ animationDelay: "1.1s", animationDuration: "1s" }}
          >
            <div className="h-px w-full bg-gradient-to-r from-transparent via-gold to-transparent" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gold shadow-[0_0_15px_rgba(201,169,97,1)]" />
          </div>

          {/* Tagline */}
          <div
            className="mt-4 sm:mt-6 animate-fade-up max-w-3xl w-full"
            style={{ animationDelay: "1.4s", animationDuration: "1.2s" }}
          >
            <p className="font-display-light text-lg sm:text-3xl lg:text-4xl text-white tracking-wide leading-relaxed px-2">
              כשהקסם של ה-AI{" "}
              <span className="text-gold font-semibold">פוגש את העוצמה שלכם</span>
            </p>

            {/* Team credits */}
            <div
              className="mt-5 sm:mt-6 animate-fade-up"
              style={{ animationDelay: "1.7s", animationDuration: "1.2s" }}
            >
              <p className="label-tag text-[9px] sm:text-[10px] text-gold/70 tracking-[0.35em] sm:tracking-[0.4em] mb-2 sm:mb-3">
                צוות SPARK AI
              </p>
              <p
                className="font-display text-base sm:text-lg text-gold-light tracking-wide"
                style={{
                  textShadow:
                    "0 2px 12px rgba(0,0,0,0.6), 0 0 18px rgba(201,169,97,0.35)",
                }}
              >
                <span className="font-bold text-gold">יפעת איתן</span>
                <span className="mx-3 sm:mx-4 text-gold/60">×</span>
                <span className="font-bold text-gold">ענת גרינברג</span>
              </p>
            </div>

            <p
              className="mt-4 sm:mt-5 label-tag text-[10px] sm:text-[11px] text-gold-soft/80 tracking-[0.35em] sm:tracking-[0.4em] animate-fade-in"
              style={{ animationDelay: "2s", animationDuration: "1s" }}
            >
              LIVE DEMO · SPARK AI · 2026
            </p>
          </div>

          {/* Skip hint */}
          <div
            className="mt-5 sm:mt-7 mb-2 sm:mb-3 animate-fade-in"
            style={{ animationDelay: "2.4s", animationDuration: "1s" }}
          >
            <p className="label-tag text-[9px] sm:text-[10px] text-white/45 tracking-[0.3em]">
              לחצו בכל מקום כדי לדלג
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
