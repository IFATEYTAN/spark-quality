// Editorial Fintech | אורקסטרציה ראשית של הדמו
// תכונות: ניווט מקלדת (חצים), מסך מלא, כפתורי ניווט קבועים, Splash דרמטי
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
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
import type { ParsedReport } from "@/lib/parseReport";
import { useAuth } from "@/_core/hooks/useAuth";

const STAGE_LABELS: Record<Stage, string> = {
  splash: "0 / 5 · פתיחה",
  intro: "0 / 5 · פתיחה",
  upload: "1 / 5 · העלאת דוח",
  analyzing: "2 / 5 · ניתוח AI",
  dashboard: "3 / 5 · תוצאות",
  actions: "4 / 5 · פעולות אוטומטיות",
  summary: "5 / 5 · סיכום",
};

// Linear navigation order. UploadStage — admin-only.
// Non-admin / guests get a skip flow that goes straight from Intro to Analyzing.
const STAGE_ORDER_FULL: Stage[] = [
  "intro",
  "upload",
  "analyzing",
  "dashboard",
  "actions",
  "summary",
];
const STAGE_ORDER_GUEST: Stage[] = [
  "intro",
  "analyzing",
  "dashboard",
  "actions",
  "summary",
];

export default function DemoExperience() {
  // Demo flow - no auth required
  const [location] = useLocation();
  // Presentation mode: ?clean=true → hides header (no "חזרה למסך הראשי" / יציאה)
  // Useful for live training so the user can't accidentally exit back to /dashboard
  const cleanMode = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("clean") === "true";
  }, [location]);
  // Admin gate — only authenticated admin users can reach UploadStage and try a real file.
  // Everyone else (guests + regular logged-in users) sees the demo with embedded mock data.
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const STAGE_ORDER = isAdmin ? STAGE_ORDER_FULL : STAGE_ORDER_GUEST;
  const STAGE_LABELS_DYNAMIC: Record<Stage, string> = isAdmin
    ? STAGE_LABELS
    : {
        ...STAGE_LABELS,
        intro: "0 / 4 · פתיחה",
        analyzing: "1 / 4 · ניתוח AI",
        dashboard: "2 / 4 · תוצאות",
        actions: "3 / 4 · פעולות אוטומטיות",
        summary: "4 / 4 · סיכום",
      };
  const [stage, setStage] = useState<Stage>("splash");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [parsedReport, setParsedReport] = useState<ParsedReport | null>(null);

  const reset = useCallback(() => {
    setParsedReport(null);
    setStage("splash");
  }, []);

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
      {!cleanMode && (
        <div className="hidden md:block">
          <Header stage={STAGE_LABELS_DYNAMIC[stage]} onReset={reset} />
        </div>
      )}

      {/* Slide-mode main: each stage controls its own internal scroll if needed; outer is fixed */}
      <main className="flex-1 min-h-0 overflow-hidden relative">
        {stage === "intro" && (
          <IntroStage
            onContinue={() => setStage(isAdmin ? "upload" : "analyzing")}
          />
        )}
        {/* UploadStage — admin-only. Non-admin users never reach this stage. */}
        {stage === "upload" && isAdmin && (
          <UploadStage
            onUpload={(parsed) => {
              if (parsed) setParsedReport(parsed);
              setStage("analyzing");
            }}
          />
        )}
        {/* Safety net: if a non-admin somehow lands on "upload" via stale state, jump them forward. */}
        {stage === "upload" && !isAdmin && (() => {
          // Side effect inside render is okay here because it only runs once per state transition.
          queueMicrotask(() => setStage("analyzing"));
          return null;
        })()}
        {stage === "analyzing" && (
          <AnalyzingStage onComplete={() => setStage("dashboard")} />
        )}
        {stage === "dashboard" && (
          <DashboardStage onAction={() => setStage("actions")} parsed={parsedReport} />
        )}
        {stage === "actions" && (
          <ActionsStage onComplete={() => setStage("summary")} />
        )}
        {stage === "summary" && <SummaryStage onReset={reset} />}
      </main>

      {/* Floating navigation cluster - bottom-left corner (away from RTL primary action zone) */}
      <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-50 flex items-center gap-2">
        {/* Fullscreen toggle - hidden on very small screens where it overlaps */}
        <button
          onClick={toggleFullscreen}
          className="hidden sm:flex group relative h-11 w-11 rounded-full bg-navy-deep/85 backdrop-blur-md border border-gold/30 items-center justify-center text-gold/90 shadow-xl shadow-black/30 transition-all hover:bg-navy-deep hover:border-gold hover:text-gold hover:scale-105"
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
          className="group h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-navy-deep/85 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/80 shadow-xl shadow-black/30 transition-all hover:bg-navy-deep hover:border-white/40 hover:text-white hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
          aria-label="מסך קודם (חץ ימין)"
          title="מסך קודם (→)"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2} />
        </button>

        {/* Next - the primary, larger, gold */}
        <button
          onClick={goNext}
          disabled={!canGoForward}
          className="group h-12 w-12 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-gold to-[#B89346] flex items-center justify-center text-navy-deep shadow-xl shadow-gold/30 transition-all hover:scale-110 hover:shadow-gold/50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
          aria-label="מסך הבא (חץ שמאל)"
          title="מסך הבא (←)"
        >
          <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
        </button>
      </div>

    </div>
  );
}
