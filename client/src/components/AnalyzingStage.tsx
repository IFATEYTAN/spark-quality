// Editorial Fintech | מסך אנליזה - דרמטי, ויזואלי
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
    <div className="relative grid min-h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-12">
      {/* Right: progress steps */}
      <div className="lg:col-span-7 flex items-center px-6 py-12 lg:px-16 lg:py-20 order-2 lg:order-1">
        <div className="w-full max-w-2xl animate-fade-in">
          <div className="mb-8 flex items-center gap-3">
            <div className="h-px w-12 bg-gold" />
            <span className="label-tag text-gold">מנוע SPARK AI פעיל</span>
          </div>

          <h1 className="font-display text-5xl font-bold leading-[1.05] text-navy-deep lg:text-6xl">
            מנתח את התיק<br />
            שלכם<span className="text-gold">.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            המערכת קוראת את כל הגיליונות, מצליבה נתונים, ומזהה הזדמנויות עסקיות.
          </p>

          {/* Progress bar */}
          <div className="mt-12">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="label-tag text-muted-foreground">התקדמות</span>
              <span className="font-display text-2xl font-bold text-navy-deep">
                {Math.round(progress)}<span className="text-base text-muted-foreground">%</span>
              </span>
            </div>
            <div className="relative h-1 overflow-hidden bg-border">
              <div
                className="absolute inset-y-0 right-0 bg-gradient-to-l from-gold to-navy-deep transition-all duration-200 ease-out"
                style={{ width: `${progress}%` }}
              />
              <div className="shimmer-bg absolute inset-0" />
            </div>
          </div>

          {/* Steps list */}
          <div className="mt-10 space-y-1">
            {ANALYSIS_STEPS.map((step, idx) => {
              const isDone = idx < currentStep;
              const isActive = idx === currentStep;
              const isPending = idx > currentStep;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-4 rounded-sm border-r-2 px-4 py-3 transition-all duration-300 ${
                    isActive
                      ? "border-gold bg-gold/5"
                      : isDone
                        ? "border-emerald-600/40 bg-transparent"
                        : "border-transparent opacity-40"
                  }`}
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full">
                    {isDone && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600/10">
                        <Check className="h-4 w-4 text-emerald-700" strokeWidth={2.5} />
                      </div>
                    )}
                    {isActive && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/20">
                        <Loader2 className="h-4 w-4 animate-spin text-gold" strokeWidth={2.5} />
                      </div>
                    )}
                    {isPending && (
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`font-display text-base font-bold ${isActive ? "text-navy-deep" : "text-foreground/80"}`}>
                      {step.label}
                    </div>
                  </div>
                  {isActive && (
                    <span className="label-tag text-[10px] text-gold animate-pulse">פעיל</span>
                  )}
                  {isDone && (
                    <span className="label-tag text-[10px] text-emerald-700">הושלם</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Left: brain image with overlay */}
      <div className="relative lg:col-span-5 overflow-hidden bg-navy-deep order-1 lg:order-2 min-h-[300px] lg:min-h-full">
        <img
          src={ASSETS.brain}
          alt="AI מנתח נתונים"
          className="h-full w-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-navy-deep/60 to-transparent" />

        {/* Live counters overlay */}
        <div className="absolute inset-0 flex flex-col justify-center px-8 lg:px-12">
          <div className="space-y-6 text-right">
            <div className="animate-fade-up">
              <div className="label-tag text-[10px] text-gold-soft">לקוחות שזוהו</div>
              <div className="font-display text-6xl font-bold text-white display-number">
                {Math.round(1247 * (progress / 100)).toLocaleString("he-IL")}
              </div>
            </div>
            <div className="gold-divider w-32" />
            <div className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
              <div className="label-tag text-[10px] text-gold-soft">מוצרים מנותחים</div>
              <div className="font-display text-5xl font-bold text-white/90 display-number">
                {Math.round(2891 * (progress / 100)).toLocaleString("he-IL")}
              </div>
            </div>
            <div className="gold-divider w-32" />
            <div className="animate-fade-up" style={{ animationDelay: "0.4s" }}>
              <div className="label-tag text-[10px] text-gold-soft">דגלים שזוהו</div>
              <div className="font-display text-4xl font-bold text-gold display-number">
                {Math.round(1071 * (progress / 100)).toLocaleString("he-IL")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
