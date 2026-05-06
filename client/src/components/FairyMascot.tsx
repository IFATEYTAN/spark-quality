// SPARK Quality | Fairy Mascot
// פיית האשפית של SPARK AI – מרחפת, מפזרת אבקת קסמים, וניתן לגרור או למזער
import { useEffect, useMemo, useRef, useState } from "react";
import { Minimize2, Sparkles } from "lucide-react";

const FAIRY_IMAGE = "/manus-storage/spark-fairy-clean_1c43284b.png";

export type FairySize = "sm" | "md" | "lg" | "xl";
export type FairyPosition = "left" | "right" | "center";

interface FairyMascotProps {
  size?: FairySize;
  position?: FairyPosition;
  message?: string;
  showDust?: boolean;
  className?: string;
  /** הופך את הפיה לרכיב צף שניתן לגרור על-פני העמוד */
  draggable?: boolean;
  /** מיקום ההתחלה כש-draggable=true (פיקסלים מהפינה הימנית-תחתונה) */
  initialOffset?: { right: number; bottom: number };
  /** מאפשר למזער/להחזיר את הפיה */
  minimizable?: boolean;
  /** מפתח storage לשמירת המיקום בין רענונים */
  storageKey?: string;
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
  draggable = false,
  initialOffset = { right: 24, bottom: 24 },
  minimizable = false,
  storageKey = "spark-fairy-pos",
}: FairyMascotProps) {
  const sparkles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        leftPercent: 5 + Math.random() * 35,
        topPercent: 25 + Math.random() * 40,
        size: 2 + Math.random() * 4,
        delay: Math.random() * 2.5,
        duration: 2 + Math.random() * 2,
      })),
    []
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!draggable) return;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          setPos(parsed);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    if (typeof window !== "undefined") {
      setPos({
        x: window.innerWidth - initialOffset.right - 200,
        y: window.innerHeight - initialOffset.bottom - 200,
      });
    }
  }, [draggable, storageKey, initialOffset.right, initialOffset.bottom]);

  useEffect(() => {
    if (!draggable || !pos) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(pos));
    } catch {
      /* ignore */
    }
  }, [draggable, pos, storageKey]);

  useEffect(() => {
    if (!draggable || !isDragging) return;

    function clamp(x: number, y: number) {
      const w = containerRef.current?.offsetWidth ?? 200;
      const h = containerRef.current?.offsetHeight ?? 200;
      const maxX = window.innerWidth - w;
      const maxY = window.innerHeight - h;
      return {
        x: Math.max(0, Math.min(x, maxX)),
        y: Math.max(0, Math.min(y, maxY)),
      };
    }

    function onMove(e: MouseEvent | TouchEvent) {
      const point = "touches" in e ? e.touches[0] : (e as MouseEvent);
      if (!point) return;
      const next = clamp(
        point.clientX - dragOffsetRef.current.x,
        point.clientY - dragOffsetRef.current.y
      );
      setPos(next);
      if ("touches" in e) e.preventDefault();
    }
    function onUp() {
      setIsDragging(false);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [draggable, isDragging]);

  function startDrag(e: React.MouseEvent | React.TouchEvent) {
    if (!draggable || minimized) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = "touches" in e ? e.touches[0] : (e as React.MouseEvent);
    dragOffsetRef.current = {
      x: point.clientX - rect.left,
      y: point.clientY - rect.top,
    };
    setIsDragging(true);
  }

  if (draggable && minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="fixed z-50 flex items-center gap-2 rounded-full border border-gold/40 bg-[#06101F]/90 backdrop-blur-md px-3 py-2 shadow-xl hover:bg-gold/15 transition"
        style={{
          right: `${initialOffset.right}px`,
          bottom: `${initialOffset.bottom}px`,
        }}
        aria-label="הצג את פיית SPARK"
      >
        <Sparkles className="h-4 w-4 text-gold animate-pulse" />
        <span className="text-xs font-semibold text-gold tracking-wider">פיית SPARK</span>
      </button>
    );
  }

  const mascotInner = (
    <>
      {showDust && (
        <div className="absolute inset-0 z-10 pointer-events-none">
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
      <img
        src={FAIRY_IMAGE}
        alt="פיית SPARK"
        draggable={false}
        className="w-full h-full object-contain animate-fairy-float select-none"
        style={{
          filter: "drop-shadow(0 8px 24px rgba(232,201,131,0.45))",
          transform: position === "left" ? "scaleX(-1)" : undefined,
        }}
      />
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
            <p className="text-sm text-white leading-relaxed font-display">{message}</p>
            <div
              className={`absolute top-1/2 -translate-y-1/2 ${position === "right" ? "-left-2" : "-right-2"} w-4 h-4 rotate-45 bg-[#0F1B30] border-gold/30`}
              style={{
                borderRightWidth: position === "right" ? 0 : "1px",
                borderBottomWidth: position === "right" ? "1px" : 0,
                borderLeftWidth: position === "right" ? "1px" : 0,
              }}
            />
          </div>
        </div>
      )}
    </>
  );

  if (draggable) {
    return (
      <div
        ref={containerRef}
        className={`fixed z-50 select-none ${sizeClasses[size]} ${className} ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{
          left: pos?.x ?? undefined,
          top: pos?.y ?? undefined,
          right: pos ? undefined : initialOffset.right,
          bottom: pos ? undefined : initialOffset.bottom,
          touchAction: "none",
        }}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        role="img"
        aria-label="פיית SPARK – ניתן לגרור"
      >
        <div className="relative w-full h-full">{mascotInner}</div>
        {minimizable && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMinimized(true);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="absolute -top-2 -left-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-gold/50 bg-[#06101F]/95 text-gold shadow-md hover:bg-gold/20 transition"
            aria-label="מזער את הפיה"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative pointer-events-none ${sizeClasses[size]} ${className}`}
      aria-hidden="true"
    >
      {mascotInner}
    </div>
  );
}
