// Editorial Fintech | מסך פתיחה דרמטי וסינמטי
// תמונת רקע ריאליסטית של מהפכה שקטה: ספר, נר, חלקיקי זהב עולים — מתואמים למסר
// 4 שניות → ממשיך אוטומטית ל-Intro
import { useEffect, useMemo } from "react";
import { LOGO } from "@/lib/demoData";

interface SplashStageProps {
  onComplete: () => void;
  durationMs?: number;
}

const HERO_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/99541940/ZqvPyEVdTkw9DPvc2ezGwV/splash_hero_cinematic-hy4Db4SsQYS4322PWXEJLK.webp";

export function SplashStage({ onComplete, durationMs = 4200 }: SplashStageProps) {
  // Floating extra particles in front of the image
  const particles = useMemo(
    () =>
      Array.from({ length: 35 }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: 1 + Math.random() * 2.5,
        delay: Math.random() * 2,
        duration: 2.5 + Math.random() * 3,
        opacity: 0.3 + Math.random() * 0.5,
      })),
    []
  );

  useEffect(() => {
    const timer = setTimeout(onComplete, durationMs);
    return () => clearTimeout(timer);
  }, [onComplete, durationMs]);

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden cursor-pointer bg-[#06101F]"
      onClick={onComplete}
      role="button"
      aria-label="דלג למצגת"
    >
      {/* Cinematic hero background image with subtle parallax-style scale */}
      <div
        className="absolute inset-0 animate-splash-zoom"
        style={{
          backgroundImage: `url(${HERO_IMAGE})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Lighter overlay - lets the book image shine through */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#06101F]/45 via-[#06101F]/15 to-[#06101F]/75" />

      {/* Soft side vignette only - keeps the center bright */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 65%, transparent 30%, rgba(6,16,31,0.55) 95%)",
        }}
      />

      {/* Animated golden particles (front layer) */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-gold animate-pulse"
            style={{
              top: `${p.top}%`,
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              boxShadow: "0 0 12px rgba(201, 169, 97, 0.85)",
            }}
          />
        ))}
      </div>

      {/* Grain */}
      <div
        className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Centered content - logos + tagline */}
      <div className="relative h-full w-full flex flex-col items-center justify-center px-8">
        {/* Top label - Hebrew kicker */}
        <div
          className="mb-10 text-center animate-fade-in"
          style={{ animationDelay: "0.2s", animationDuration: "1.4s" }}
        >
          <p className="label-tag text-[11px] text-gold/70 tracking-[0.45em]">
            Sprinkle AI · Automation Magic
          </p>
        </div>

        {/* SPARK AI logo - centered, integrated into the scene without a plate */}
        <div
          className="animate-fade-up flex items-center justify-center"
          style={{ animationDelay: "0.4s", animationDuration: "1.4s" }}
        >
          <img
            src={LOGO.clear}
            alt="SPARK AI"
            className="w-[420px] lg:w-[520px] h-auto object-contain drop-shadow-[0_10px_40px_rgba(201,169,97,0.55)]"
            style={{ filter: "drop-shadow(0 0 30px rgba(201,169,97,0.4))" }}
          />
        </div>

        {/* Golden divider with sparkle */}
        <div
          className="relative mt-14 animate-fade-in"
          style={{ animationDelay: "1.1s", animationDuration: "1s" }}
        >
          <div className="h-px bg-gradient-to-r from-transparent via-gold to-transparent" style={{ width: "380px" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gold shadow-[0_0_15px_rgba(201,169,97,1)]" />
        </div>

        {/* Tagline */}
        <div
          className="mt-10 text-center animate-fade-up max-w-3xl"
          style={{ animationDelay: "1.4s", animationDuration: "1.2s" }}
        >
          <p className="font-display-light text-3xl lg:text-4xl text-white tracking-wide leading-relaxed">
            כשהקסם של ה-AI{" "}
            <span className="text-gold font-semibold">פוגש את העוצמה שלכם</span>
          </p>

          {/* Team credits — SPARK AI */}
          <div
            className="mt-10 animate-fade-up"
            style={{ animationDelay: "1.7s", animationDuration: "1.2s" }}
          >
            <p className="label-tag text-[10px] text-gold/60 tracking-[0.4em] mb-3">
              צוות SPARK AI
            </p>
            <p className="font-display text-lg text-gold-light tracking-wide">
              <span className="font-semibold">יפעת איתן</span>
              <span className="mx-4 text-gold/50">×</span>
              <span className="font-semibold">ענת גרינברג</span>
            </p>
          </div>

          <p
            className="mt-8 label-tag text-[11px] text-gold-soft/70 tracking-[0.4em] animate-fade-in"
            style={{ animationDelay: "2s", animationDuration: "1s" }}
          >
            LIVE DEMO · SPARK AI · 2026
          </p>
        </div>

        {/* Skip hint - bottom */}
        <div
          className="absolute bottom-8 right-1/2 translate-x-1/2 animate-fade-in"
          style={{ animationDelay: "2.4s", animationDuration: "1s" }}
        >
          <p className="label-tag text-[10px] text-white/35 tracking-[0.3em]">
            לחצו בכל מקום כדי לדלג
          </p>
        </div>
      </div>
    </div>
  );
}
