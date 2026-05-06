// SPARK Quality | Fairy Mascot
// פיית האשפית של SPARK AI – מרחפת ומפזרת אבקת קסמים
// משמשת כ-wizard בתהליך ה-Onboarding ובמסכים נוספים
import { useMemo } from "react";

const FAIRY_IMAGE = "/manus-storage/spark-fairy-clean_1c43284b.png";

export type FairySize = "sm" | "md" | "lg" | "xl";
export type FairyPosition = "left" | "right" | "center";

interface FairyMascotProps {
  size?: FairySize;
  position?: FairyPosition;
  message?: string;
  showDust?: boolean;
  className?: string;
}

const sizeClasses: Record<FairySize, string> = {
  sm: "w-20 h-20",
  md: "w-32 h-32",
  lg: "w-48 h-48",
  xl: "w-64 h-64",
};

export function FairyMascot({
  size = "lg",
  position = "right",
  message,
  showDust = true,
  className = "",
}: FairyMascotProps) {
  // Pre-compute sparkle particles so re-renders don't re-randomise
  const sparkles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        // sparkles emerge from the wand area (left side of fairy)
        leftPercent: 5 + Math.random() * 35,
        topPercent: 25 + Math.random() * 40,
        size: 2 + Math.random() * 4,
        delay: Math.random() * 2.5,
        duration: 2 + Math.random() * 2,
      })),
    []
  );

  return (
    <div
      className={`relative pointer-events-none ${sizeClasses[size]} ${className}`}
      aria-hidden="true"
    >
      {/* Floating dust particles emerging from the wand */}
      {showDust && (
        <div className="absolute inset-0 z-10">
          {sparkles.map((s) => (
            <span
              key={s.id}
              className="absolute rounded-full bg-gold-light"
              style={{
                left: `${s.leftPercent}%`,
                top: `${s.topPercent}%`,
                width: `${s.size}px`,
                height: `${s.size}px`,
                boxShadow: "0 0 6px 1px rgba(232,201,131,0.8)",
                animation: `fairy-dust ${s.duration}s ease-out ${s.delay}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      {/* The fairy herself, floating */}
      <img
        src={FAIRY_IMAGE}
        alt="פיית SPARK"
        className="w-full h-full object-contain animate-fairy-float"
        style={{
          filter: "drop-shadow(0 8px 24px rgba(232,201,131,0.45))",
          transform: position === "left" ? "scaleX(-1)" : undefined,
        }}
      />

      {/* Optional speech-bubble style message */}
      {message && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 ${position === "right" ? "right-full mr-4" : "left-full ml-4"} pointer-events-auto`}
          style={{ minWidth: "220px" }}
        >
          <div
            className="relative px-5 py-3 rounded-2xl bg-[#0F1B30]/95 border border-gold/30 shadow-xl"
            style={{
              boxShadow: "0 8px 30px rgba(0,0,0,0.4), 0 0 25px rgba(232,201,131,0.15)",
            }}
          >
            <p className="text-sm text-white leading-relaxed font-display">
              {message}
            </p>
            {/* Bubble tail pointing toward the fairy */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 ${position === "right" ? "-left-2" : "-right-2"} w-4 h-4 rotate-45 bg-[#0F1B30] border-gold/30`}
              style={{
                borderRightWidth: position === "right" ? 0 : "1px",
                borderTopWidth: position === "right" ? 0 : 0,
                borderBottomWidth: position === "right" ? "1px" : 0,
                borderLeftWidth: position === "right" ? "1px" : 0,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
