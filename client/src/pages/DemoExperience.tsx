// Editorial Fintech | אורקסטרציה ראשית של הדמו
// תכונות: ניווט מקלדת (חצים), מסך מלא, כפתורי ניווט קבועים, Splash דרמטי
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ChevronRight, ChevronLeft, Maximize2, Minimize2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
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

// Two distinct stage maps: admins see Upload (real-data path); guests skip it (canned demo).
const STAGE_LABELS_ADMIN: Record<Stage, string> = {
  splash: "0 / 7 · פתיחה",
  intro: "0 / 7 · פתיחה",
  upload: "1 / 7 · העלאת דוח",
  analyzing: "2 / 7 · ניתוח AI",
  dashboard: "3א / 7 · תוצאות",
  dashboard2: "3ב / 7 · תוצאות",
  dashboard3: "3ג / 7 · תוצאות",
  actions: "4 / 7 · פעולות אוטומטיות",
  summary: "5 / 7 · סיכום",
};

const STAGE_LABELS_GUEST: Record<Stage, string> = {
  splash: "0 / 6 · פתיחה",
  intro: "0 / 6 · פתיחה",
  upload: "—",
  analyzing: "1 / 6 · ניתוח AI",
  dashboard: "2א / 6 · תוצאות",
  dashboard2: "2ב / 6 · תוצאות",
  dashboard3: "2ג / 6 · תוצאות",
  actions: "3 / 6 · פעולות אוטומטיות",
  summary: "4 / 6 · סיכום",
};

const STAGE_ORDER_ADMIN: Stage[] = [
  "intro",
  "upload",
  "analyzing",
  "dashboard",
  "dashboard2",
  "dashboard3",
  "actions",
  "summary",
];

const STAGE_ORDER_GUEST: Stage[] = [
  "intro",
  "analyzing",
  "dashboard",
  "dashboard2",
  "dashboard3",
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
  // Detect admin: workspaceRole owner/admin OR super-admin OR app-level role admin.
  const { user } = useAuth();
  const isAdmin = useMemo(() => {
    if (!user) return false;
    if ((user as { isSuperAdmin?: boolean }).isSuperAdmin) return true;
    const role = (user as { role?: string }).role;
    if (role === "admin") return true;
    const wsRole = (user as { workspaceRole?: string }).workspaceRole;
    if (wsRole === "owner" || wsRole === "admin") return true;
    return false;
  }, [user]);
  const STAGE_ORDER: Stage[] = isAdmin ? STAGE_ORDER_ADMIN : STAGE_ORDER_GUEST;
  const STAGE_LABELS_DYNAMIC: Record<Stage, string> = isAdmin
    ? STAGE_LABELS_ADMIN
    : STAGE_LABELS_GUEST;
  const [stage, setStage] = useState<Stage>("splash");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [parsedReport, setParsedReport] = useState<ParsedReport | null>(null);
  const [analysis, setAnalysis] = useState<unknown>(null);
  const analyzingRef = useRef(false);
  const analyzeMutation = trpc.reports.analyze.useMutation();

  // When admin uploads a real file, kick off the LLM analyzer in background.
  // The result is stored on `analysis` and passed down to dashboard/actions/summary.
  useEffect(() => {
    if (!parsedReport || analyzingRef.current) return;
    analyzingRef.current = true;
    setAnalysis(null);
    const t = toast.loading("AI מנתח את התיק — מסתמלו על דעתכם…");
    analyzeMutation
      .mutateAsync({ parsed: parsedReport })
      .then((res) => {
        setAnalysis(res?.analysis ?? null);
        toast.success("הניתוח הושלם — מציגים תובנות אמיתיות", { id: t });
      })
      .catch((err) => {
        console.warn("[reports.analyze] failed", err);
        toast.error("לא הצלחנו להריץ ניתוח AI — מציגים תוצאות מקומיות", { id: t });
      })
      .finally(() => {
        analyzingRef.current = false;
      });
  }, [parsedReport, analyzeMutation]);

  const reset = useCallback(() => {
    setParsedReport(null);
    setAnalysis(null);
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
  }, [STAGE_ORDER]);

  const goPrev = useCallback(() => {
    setStage((current) => {
      if (current === "splash") return current;
      const idx = STAGE_ORDER.indexOf(current);
      if (idx > 0) {
        return STAGE_ORDER[idx - 1];
      }
      return current;
    });
  }, [STAGE_ORDER]);

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
    <div className="min-h-screen lg:h-screen flex flex-col lg:overflow-hidden bg-navy-deep">
      {!cleanMode && (
        <div className="hidden md:block">
          <Header stage={STAGE_LABELS_DYNAMIC[stage]} onReset={reset} />
        </div>
      )}

      {/* Slide-mode main on desktop (≥lg). On mobile we let content scroll naturally so nothing is clipped. */}
      <main className="flex-1 min-h-0 lg:overflow-hidden relative pb-24 lg:pb-0">
        {stage === "intro" && (
          <IntroStage onContinue={() => setStage("upload")} />
        )}
        {stage === "upload" && isAdmin && (
          <UploadStage
            onUpload={(parsed) => {
              if (parsed) setParsedReport(parsed);
              setStage("analyzing");
            }}
          />
        )}
        {/* Safety net: if a non-admin somehow lands on "upload", jump them forward. */}
        {stage === "upload" && !isAdmin && (() => {
          queueMicrotask(() => setStage("analyzing"));
          return null;
        })()}
        {stage === "analyzing" && (
          <AnalyzingStage
            onComplete={() => setStage("dashboard")}
            hasRealFile={!!parsedReport}
            llmStatus={
              !parsedReport
                ? "idle"
                : analyzeMutation.isPending
                  ? "running"
                  : analyzeMutation.isError
                    ? "error"
                    : analysis
                      ? "done"
                      : "running"
            }
          />
        )}
        {stage === "dashboard" && (
          <DashboardStage onAction={() => setStage("actions")} parsed={parsedReport} analysis={analysis} slide={1} />
        )}
        {stage === "dashboard2" && (
          <DashboardStage onAction={() => setStage("actions")} parsed={parsedReport} analysis={analysis} slide={2} />
        )}
        {stage === "dashboard3" && (
          <DashboardStage onAction={() => setStage("actions")} parsed={parsedReport} analysis={analysis} slide={3} />
        )}
        {stage === "actions" && (
          <ActionsStage onComplete={() => setStage("summary")} parsed={parsedReport} analysis={analysis} />
        )}
        {stage === "summary" && <SummaryStage onReset={reset} parsed={parsedReport} analysis={analysis} />}
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
// touched: 1778376207.2083578
