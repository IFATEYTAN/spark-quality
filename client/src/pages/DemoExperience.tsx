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
import { CategoryPickerStage } from "@/components/CategoryPickerStage";
import { AnalyzingStage } from "@/components/AnalyzingStage";
import { DashboardStage } from "@/components/DashboardStage";
import { ActionsStage } from "@/components/ActionsStage";
import { SummaryStage } from "@/components/SummaryStage";
import type { Stage, AnalysisCategory } from "@/lib/demoData";
import type { ParsedReport } from "@/lib/parseReport";

// Two distinct stage maps:
// - Admins see Upload (real-data path) and skip the Category picker (they
//   work with their actual file, no need to bucket).
// - Guests skip Upload entirely and instead pick a single analysis category
//   so they don't drown in 16 triggers at once.
const STAGE_LABELS_ADMIN: Record<Stage, string> = {
  splash: "0 / 7 · פתיחה",
  intro: "0 / 7 · פתיחה",
  upload: "1 / 7 · העלאת דוח",
  category: "—",
  analyzing: "2 / 7 · ניתוח AI",
  dashboard: "3א / 7 · תוצאות",
  dashboard2: "3ב / 7 · תוצאות",
  dashboard3: "3ג / 7 · תוצאות",
  actions: "4 / 7 · פעולות אוטומטיות",
  summary: "5 / 7 · סיכום",
};

const STAGE_LABELS_GUEST: Record<Stage, string> = {
  splash: "0 / 7 · פתיחה",
  intro: "0 / 7 · פתיחה",
  upload: "—",
  category: "1 / 7 · בחירת ניתוח",
  analyzing: "2 / 7 · ניתוח AI",
  dashboard: "3א / 7 · תוצאות",
  dashboard2: "3ב / 7 · תוצאות",
  dashboard3: "3ג / 7 · תוצאות",
  actions: "4 / 7 · פעולות אוטומטיות",
  summary: "5 / 7 · סיכום",
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
  "category",
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
  // Guest-only: which analysis category the user picked on the CategoryPickerStage.
  // Used to filter Dashboard/Actions/Summary so the agent doesn't drown in
  // 16 triggers at once. Defaults to "all" until they pick.
  const [selectedCategory, setSelectedCategory] = useState<AnalysisCategory>("all");
  // Timed-out flag: if the LLM doesn't respond within ANALYZE_TIMEOUT_MS we mark
  // it as "timed out" so the AnalyzingStage gating effect can advance with the
  // canned dataset rather than block forever.
  const [analyzeTimedOut, setAnalyzeTimedOut] = useState(false);
  const analyzingRef = useRef(false);
  const analyzeMutation = trpc.reports.analyze.useMutation();

  // Hard cap on how long the AnalyzingStage may wait for the LLM response.
  // Anthropic occasionally takes 30-45s for large payloads; beyond that we'd
  // rather show local results than leave the agent staring at a spinner during
  // a live demo.
  const ANALYZE_TIMEOUT_MS = 25_000;

  // When admin uploads a real file, kick off the LLM analyzer in background.
  // The result is stored on `analysis` and passed down to dashboard/actions/summary.
  //
  // IMPORTANT: this effect must depend ONLY on `parsedReport`. Including the
  // `analyzeMutation` object in the dep array re-runs the effect on every
  // render (its identity is unstable from `useMutation`), causing the analyzer
  // to be invoked repeatedly in a loop. We rely on a stable `analyzedKeyRef`
  // to ensure each unique parsed report is analyzed at most once per session.
  const analyzedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!parsedReport) return;
    // Build a stable key for the current parsed report. We use object identity
    // (a counter on each parse) plus a short hash of the row count so that
    // re-uploading the same file does still kick off a fresh analysis.
    const key = `${parsedReport.fileName}|${parsedReport.rawRows}|${parsedReport.customerCount}`;
    if (analyzedKeyRef.current === key || analyzingRef.current) return;
    analyzedKeyRef.current = key;
    analyzingRef.current = true;
    setAnalysis(null);
    setAnalyzeTimedOut(false);
    const startedAt = Date.now();
    const t = toast.loading("AI מנתח את התיק שלכם…");

    // Watchdog: after ANALYZE_TIMEOUT_MS, mark as timed out so the gating
    // effect lets the user advance regardless of mutation state. We do NOT
    // cancel the mutation — if Anthropic eventually replies we still surface
    // the live analysis on the dashboard.
    const watchdog = setTimeout(() => {
      console.warn(
        `[reports.analyze] watchdog fired after ${ANALYZE_TIMEOUT_MS}ms — falling back to local analysis`,
      );
      setAnalyzeTimedOut(true);
      toast.warning(
        "הניתוח של Claude מתעכב — ממשיכים עם נתוני הדוח המקומיים",
        { id: t },
      );
    }, ANALYZE_TIMEOUT_MS);

    analyzeMutation
      .mutateAsync({ parsed: parsedReport })
      .then((res) => {
        clearTimeout(watchdog);
        const elapsed = Date.now() - startedAt;
        console.info(`[reports.analyze] completed in ${elapsed}ms`);
        setAnalysis(res?.analysis ?? null);
        toast.success("הניתוח הושלם — מציגים תובנות אמיתיות", { id: t });
      })
      .catch((err) => {
        clearTimeout(watchdog);
        console.warn("[reports.analyze] failed", err);
        setAnalyzeTimedOut(true);
        toast.error("לא הצלחנו להריץ ניתוח AI — מציגים תוצאות מקומיות", { id: t });
      })
      .finally(() => {
        analyzingRef.current = false;
      });
    // We deliberately exclude `analyzeMutation` from the deps to avoid
    // re-running this effect when its identity changes between renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedReport]);

  const reset = useCallback(() => {
    setParsedReport(null);
    setAnalysis(null);
    analyzedKeyRef.current = null;
    analyzingRef.current = false;
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
          <IntroStage
            onContinue={() =>
              setStage(isAdmin ? "upload" : "category")
            }
          />
        )}
        {stage === "upload" && isAdmin && (
          <UploadStage
            onUpload={(parsed) => {
              if (parsed) setParsedReport(parsed);
              setStage("analyzing");
            }}
          />
        )}
        {/* Safety net: if a non-admin somehow lands on "upload", route them
            to the category picker instead. */}
        {stage === "upload" && !isAdmin && (() => {
          queueMicrotask(() => setStage("category"));
          return null;
        })()}
        {stage === "category" && !isAdmin && (
          <CategoryPickerStage
            onSelect={(cat) => {
              setSelectedCategory(cat);
              setStage("analyzing");
            }}
          />
        )}
        {/* Safety net: admins shouldn't see the category picker; bounce them. */}
        {stage === "category" && isAdmin && (() => {
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
                : analyzeTimedOut
                  ? "error"
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
          <DashboardStage
            onAction={() => setStage("actions")}
            parsed={parsedReport}
            analysis={analysis}
            category={!isAdmin ? selectedCategory : undefined}
            slide={1}
          />
        )}
        {stage === "dashboard2" && (
          <DashboardStage
            onAction={() => setStage("actions")}
            parsed={parsedReport}
            analysis={analysis}
            category={!isAdmin ? selectedCategory : undefined}
            slide={2}
          />
        )}
        {stage === "dashboard3" && (
          <DashboardStage
            onAction={() => setStage("actions")}
            parsed={parsedReport}
            analysis={analysis}
            category={!isAdmin ? selectedCategory : undefined}
            slide={3}
          />
        )}
        {stage === "actions" && (
          <ActionsStage
            onComplete={() => setStage("summary")}
            parsed={parsedReport}
            analysis={analysis}
            category={!isAdmin ? selectedCategory : undefined}
          />
        )}
        {stage === "summary" && (
          <SummaryStage
            onReset={reset}
            parsed={parsedReport}
            analysis={analysis}
            category={!isAdmin ? selectedCategory : undefined}
          />
        )}
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
