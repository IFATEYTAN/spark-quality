// Editorial Fintech | מסך פתיחה דרמטי - שני הלוגואים על רקע נייבי + חלקיקי זהב
// 3 שניות → ממשיך אוטומטית ל-Intro
import { useEffect, useMemo } from "react";
import { LOGO } from "@/lib/demoData";

interface SplashStageProps {
  onComplete: () => void;
  durationMs?: number;
}

export function SplashStage({ onComplete, durationMs = 3500 }: SplashStageProps) {
  // Pre-compute particle positions once
  const particles = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: 1 + Math.random() * 3,
        delay: Math.random() * 2,
        duration: 2.5 + Math.random() * 3,
        opacity: 0.3 + Math.random() * 0.6,
      })),
    []
  );

  useEffect(() => {
    const timer = setTimeout(onComplete, durationMs);
    return () => clearTimeout(timer);
  }, [onComplete, durationMs]);

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden cursor-pointer"
      onClick={onComplete}
      role="button"
      aria-label="דלג למצגת"
    >
      {/* Deep navy gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#06101F] via-navy-deep to-[#0F1F38]" />

      {/* Radial glow center */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(201, 169, 97, 0.18) 0%, transparent 55%)",
        }}
      />

      {/* Animated golden particles */}
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
              boxShadow: "0 0 10px rgba(201, 169, 97, 0.7)",
            }}
          />
        ))}
      </div>

      {/* Grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.07] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Centered content - logos + tagline */}
      <div className="relative h-full w-full flex flex-col items-center justify-center px-8">
        {/* Two logos side by side with × separator - both on white plates for consistency */}
        <div className="flex items-center gap-8 lg:gap-12 animate-fade-up" style={{ animationDuration: "1.2s" }}>
          {/* Quality logo plate */}
          <div
            className="bg-white/95 rounded-md px-6 py-5 lg:px-8 lg:py-6 shadow-2xl shadow-gold/20 animate-fade-up flex items-center justify-center"
            style={{ animationDelay: "0.3s", animationDuration: "1.2s", minWidth: "200px", minHeight: "120px" }}
          >
            <img
              src={LOGO.quality}
              alt="Quality"
              className="h-16 lg:h-24 w-auto object-contain"
            />
          </div>

          {/* × Multiplier */}
          <div
            className="font-display text-5xl lg:text-7xl font-thin text-gold/70 animate-fade-in"
            style={{ animationDelay: "0.6s", animationDuration: "1s" }}
          >
            ×
          </div>

          {/* SPARK AI logo on matching white plate (cropped to remove padding around logo) */}
          <div
            className="bg-white/95 rounded-md shadow-2xl shadow-gold/20 animate-fade-up overflow-hidden flex items-center justify-center"
            style={{ animationDelay: "0.5s", animationDuration: "1.2s", width: "320px", height: "120px" }}
          >
            <div className="relative w-full h-full">
              <img
                src={LOGO.clear}
                alt="SPARK AI"
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] max-w-none object-cover"
              />
            </div>
          </div>
        </div>

        {/* Divider line - animates in */}
        <div
          className="mt-12 h-px bg-gradient-to-r from-transparent via-gold to-transparent animate-fade-in"
          style={{ width: "320px", animationDelay: "1s", animationDuration: "1s" }}
        />

        {/* Tagline */}
        <div
          className="mt-8 text-center animate-fade-up"
          style={{ animationDelay: "1.3s", animationDuration: "1.2s" }}
        >
          <p className="font-display-light text-2xl lg:text-3xl text-white/90 tracking-wide">
            כשהקסם של ה-AI{" "}
            <span className="text-gold font-semibold">פוגש את העוצמה שלכם</span>
          </p>
          <p className="mt-4 label-tag text-[11px] text-gold-soft/70 tracking-[0.4em]">
            LIVE DEMO · QUALITY × SPARK AI · 2026
          </p>
        </div>

        {/* Skip hint - bottom */}
        <div
          className="absolute bottom-8 right-1/2 translate-x-1/2 animate-fade-in"
          style={{ animationDelay: "2s", animationDuration: "1s" }}
        >
          <p className="label-tag text-[10px] text-white/35 tracking-[0.3em]">
            לחצו בכל מקום כדי לדלג
          </p>
        </div>
      </div>
    </div>
  );
}
