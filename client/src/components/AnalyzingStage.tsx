// Editorial Fintech | מסך אנליזה - דרמטי, וויזואלי, full screen immersive
import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { ANALYSIS_STEPS, ASSETS } from "@/lib/demoData";

interface AnalyzingStageProps {
  onComplete: () => void;
}

export function AnalyzingStage({ onComplete }: AnalyzingStageProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let mounted = true;

    const runStep = (idx: number) => {
      if (!mounted) return;
      if (idx >= ANALYSIS_STEPS.length) {
        timeoutId = setTimeout(() => mounted && onComplete(), 600);
        return;
      }
      setCurrentStep(idx);
      timeoutId = setTimeout(() => runStep(idx + 1), ANALYSIS_STEPS[idx].duration);
    };
    runStep(0);

    const totalDuration = ANALYSIS_STEPS.reduce((s, st) => s + st.duration, 0);
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min(100, (elapsed / totalDuration) * 100));
      if (elapsed >= totalDuration) clearInterval(progressInterval);
    }, 50);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
    };
  }, [onComplete]);

  return (
    <div className="relative min-h-full w-full overflow-y-auto overflow-x-hidden bg-navy-deep">
      {/* Background image with strong overlay */}
      <div className="absolute inset-0">
        <img src={ASSETS.brain} alt="" className="h-full w-full object-cover scale-110 animate-[fade-in_2s]" />
        <div className="absolute inset-0 bg-gradient-to-l from-navy-deep/60 via-navy-deep/90 to-navy-deep" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/40 to-transparent opacity-80" />
        <div className="absolute inset-0 bg-navy-deep/40" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "linear-gradient(rgba(201,169,97,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(201,169,97,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)"
        }}
      />

      <div className="relative grid min-h-full w-full max-w-[1600px] mx-auto grid-cols-1 lg:grid-cols-12">
        {/* RIGHT (RTL primary): progress steps */}
        <div className="lg:col-span-7 flex items-start lg:items-center px-4 py-6 sm:px-6 lg:px-12 lg:py-8">
          <div className="w-full max-w-2xl animate-fade-in">
            <div className="mb-6 lg:mb-8 flex items-center gap-3 flex-wrap">
              <div className="h-px w-10 sm:w-16 bg-gold" />
              <span className="label-tag text-gold text-shadow-sm text-[10px] sm:text-xs">מנוע SPARK AI · פעיל</span>
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-[4rem] font-black leading-[1.05] lg:leading-[0.95] text-white tracking-tighter text-shadow-lg">
              מנתח את התיק<br />
              <span className="bg-gradient-to-l from-gold to-gold-soft bg-clip-text text-transparent">
                שלכם.
              </span>
            </h1>
            <p className="mt-4 lg:mt-6 text-sm sm:text-base lg:text-lg text-white/90 max-w-xl font-light text-shadow-md">
              המערכת קוראת את כל הגיליונות, מצליבה נתונים, ומזהה הזדמנויות עסקיות בזמן אמת.
            </p>

            {/* Progress bar */}
            <div className="mt-8">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="label-tag text-white/80 text-shadow-sm">התקדמות הניתוח</span>
                <span className="display-number text-3xl font-black text-white mono-num text-shadow-sm">
                  {Math.round(progress)}<span className="text-base text-white/60 font-normal">%</span>
                </span>
              </div>
              <div className="relative h-1.5 overflow-hidden bg-white/20 rounded-full">
                <div
                  className="absolute inset-y-0 right-0 bg-gradient-to-l from-gold via-gold-soft to-gold transition-all duration-200 ease-out rounded-full"
                  style={{ width: `${progress}%` }}
                />
                <div className="shimmer-bg absolute inset-0" />
              </div>
            </div>

            {/* Steps list */}
            <div className="mt-6 space-y-1.5">
              {ANALYSIS_STEPS.map((step, idx) => {
                const isDone = idx < currentStep;
                const isActive = idx === currentStep;
                const isPending = idx > currentStep;
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-4 rounded-md border-r-2 px-4 py-3 transition-all duration-300 ${
                      isActive
                        ? "border-gold bg-gold/15 backdrop-blur-sm shadow-lg shadow-gold/10"
                        : isDone
                          ? "border-emerald-400/60 bg-emerald-500/5"
                          : "border-white/10 opacity-50"
                    }`}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full">
                      {isDone && (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20">
                          <Check className="h-4 w-4 text-emerald-300" strokeWidth={2.5} />
                        </div>
                      )}
                      {isActive && (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/30">
                          <Loader2 className="h-4 w-4 animate-spin text-gold" strokeWidth={2.5} />
                        </div>
                      )}
                      {isPending && (
                        <div className="h-2 w-2 rounded-full bg-white/20" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`font-display text-base font-bold text-shadow-sm ${isActive ? "text-white" : isDone ? "text-white/90" : "text-white/70"}`}>
                        {step.label}
                      </div>
                    </div>
                    {isActive && (
                      <span className="label-tag text-[10px] text-gold animate-pulse text-shadow-sm">פעיל</span>
                    )}
                    {isDone && (
                      <span className="label-tag text-[10px] text-emerald-300 text-shadow-sm">הושלם</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* LEFT: live counters - giant numbers */}
        <div className="hidden lg:col-span-5 lg:flex items-center justify-center pr-8">
          <div className="space-y-6 text-right w-full backdrop-blur-sm bg-navy-deep/30 rounded-lg p-6 border border-white/10">
            <div className="animate-fade-up">
              <div className="label-tag text-[10px] text-gold mb-2 text-shadow-sm">לקוחות שזוהו</div>
              <div className="display-number text-7xl font-black text-white mono-num text-shadow-md">
                {Math.round(1247 * (progress / 100)).toLocaleString("he-IL")}
              </div>
            </div>
            <div className="gold-divider w-32" />
            <div className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
              <div className="label-tag text-[10px] text-gold mb-2 text-shadow-sm">מוצרים מנותחים</div>
              <div className="display-number text-6xl font-black text-white mono-num text-shadow-md">
                {Math.round(2891 * (progress / 100)).toLocaleString("he-IL")}
              </div>
            </div>
            <div className="gold-divider w-32" />
            <div className="animate-fade-up" style={{ animationDelay: "0.4s" }}>
              <div className="label-tag text-[10px] text-gold mb-2 text-shadow-sm">דגלים שזוהו</div>
              <div className="display-number text-5xl font-black mono-num bg-gradient-to-l from-gold to-gold-soft bg-clip-text text-transparent">
                {Math.round(1071 * (progress / 100)).toLocaleString("he-IL")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
