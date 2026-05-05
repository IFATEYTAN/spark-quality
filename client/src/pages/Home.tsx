// Editorial Fintech | אורקסטרציה ראשית של הדמו
// תכונות: ניווט מקלדת (חצים), מסך מלא, כפתורי ניווט קבועים, Splash דרמטי
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, ChevronLeft, Maximize2, Minimize2 } from "lucide-react";
import { Header } from "@/components/Header";
import { SplashStage } from "@/components/SplashStage";
import { IntroStage } from "@/components/IntroStage";
import { UploadStage } from "@/components/UploadStage";
import { AnalyzingStage } from "@/components/AnalyzingStage";
import { DashboardStage } from "@/components/DashboardStage";
import { ActionsStage } from "@/components/ActionsStage";
import { SummaryStage } from "@/components/SummaryStage";
import type { Stage } from "@/lib/demoData";

const STAGE_LABELS: Record<Stage, string> = {
  splash: "0 / 5 · פתיחה",
  intro: "0 / 5 · פתיחה",
  upload: "1 / 5 · העלאת דוח",
  analyzing: "2 / 5 · ניתוח AI",
  dashboard: "3 / 5 · תוצאות",
  actions: "4 / 5 · פעולות אוטומטיות",
  summary: "5 / 5 · סיכום",
};

// Linear navigation order (skip splash from arrows after first time)
const STAGE_ORDER: Stage[] = [
  "intro",
  "upload",
  "analyzing",
  "dashboard",
  "actions",
  "summary",
];

export default function Home() {
  const [stage, setStage] = useState<Stage>("splash");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const reset = useCallback(() => setStage("splash"), []);

  const goNext = useCallback(() => {
    setStage((current) => {
      if (current === "splash") return "intro";
      const idx = STAGE_ORDER.indexOf(current);
      if (idx >= 0 && idx < STAGE_ORDER.length - 1) {
        return STAGE_ORDER[idx + 1];
      }
      return current;
    });
  }, []);

  const goPrev = useCallback(() => {
    setStage((current) => {
      if (current === "splash") return current;
      const idx = STAGE_ORDER.indexOf(current);
      if (idx > 0) {
        return STAGE_ORDER[idx - 1];
      }
      return current;
    });
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // RTL: ArrowLeft = forward, ArrowRight = back  (intuitive for Hebrew flow)
      if (e.key === "ArrowLeft" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowRight" || e.key === "PageUp") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "Escape" && stage === "splash") {
        e.preventDefault();
        setStage("intro");
      } else if (e.key === "Home") {
        e.preventDefault();
        reset();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, toggleFullscreen, reset, stage]);

  // Track fullscreen state
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Special: Splash is overlay, render BEFORE main shell
  if (stage === "splash") {
    return <SplashStage onComplete={() => setStage("intro")} />;
  }

  const currentIdx = STAGE_ORDER.indexOf(stage);
  const canGoBack = currentIdx > 0;
  const canGoForward = currentIdx < STAGE_ORDER.length - 1;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-navy-deep">
      <Header stage={STAGE_LABELS[stage]} onReset={reset} />

      <main className="flex-1 overflow-hidden relative">
        {stage === "intro" && (
          <IntroStage onContinue={() => setStage("upload")} />
        )}
        {stage === "upload" && (
          <UploadStage onUpload={() => setStage("analyzing")} />
        )}
        {stage === "analyzing" && (
          <AnalyzingStage onComplete={() => setStage("dashboard")} />
        )}
        {stage === "dashboard" && (
          <DashboardStage onAction={() => setStage("actions")} />
        )}
        {stage === "actions" && (
          <ActionsStage onComplete={() => setStage("summary")} />
        )}
        {stage === "summary" && <SummaryStage onReset={reset} />}
      </main>

      {/* Floating navigation cluster - bottom-left corner (away from RTL primary action zone) */}
      <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2">
        {/* Fullscreen toggle */}
        <button
          onClick={toggleFullscreen}
          className="group relative h-11 w-11 rounded-full bg-navy-deep/85 backdrop-blur-md border border-gold/30 flex items-center justify-center text-gold/90 shadow-xl shadow-black/30 transition-all hover:bg-navy-deep hover:border-gold hover:text-gold hover:scale-105"
          aria-label={isFullscreen ? "יציאה ממסך מלא" : "מסך מלא (F)"}
          title={isFullscreen ? "יציאה ממסך מלא (Esc)" : "מסך מלא (F)"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" strokeWidth={2} />
          ) : (
            <Maximize2 className="h-4 w-4" strokeWidth={2} />
          )}
        </button>

        {/* Previous */}
        <button
          onClick={goPrev}
          disabled={!canGoBack}
          className="group h-11 w-11 rounded-full bg-navy-deep/85 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/80 shadow-xl shadow-black/30 transition-all hover:bg-navy-deep hover:border-white/40 hover:text-white hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
          aria-label="מסך קודם (חץ ימין)"
          title="מסך קודם (→)"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2} />
        </button>

        {/* Next - the primary, larger, gold */}
        <button
          onClick={goNext}
          disabled={!canGoForward}
          className="group h-12 w-12 rounded-full bg-gradient-to-br from-gold to-[#B89346] flex items-center justify-center text-navy-deep shadow-xl shadow-gold/30 transition-all hover:scale-110 hover:shadow-gold/50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
          aria-label="מסך הבא (חץ שמאל)"
          title="מסך הבא (←)"
        >
          <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
        </button>
      </div>

      {/* Keyboard hint - first time only, fades after a few seconds */}
      <KeyboardHint />
    </div>
  );
}

function KeyboardHint() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-7 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-fade-in"
      style={{ animationDelay: "1s" }}
    >
      <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-navy-deep/80 backdrop-blur-md border border-gold/20 shadow-lg">
        <span className="label-tag text-[10px] text-white/60 tracking-widest">
          טיפ
        </span>
        <kbd className="px-2 py-0.5 text-[10px] font-mono rounded bg-white/10 text-gold-soft border border-white/20">
          ←
        </kbd>
        <span className="text-[11px] text-white/70">למעבר בין מסכים</span>
        <span className="text-white/30">·</span>
        <kbd className="px-2 py-0.5 text-[10px] font-mono rounded bg-white/10 text-gold-soft border border-white/20">
          F
        </kbd>
        <span className="text-[11px] text-white/70">למסך מלא</span>
      </div>
    </div>
  );
}
