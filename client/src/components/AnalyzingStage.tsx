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
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-navy-deep">
      {/* Background image with strong overlay */}
      <div className="absolute inset-0">
        <img src={ASSETS.brain} alt="" className="h-full w-full object-cover scale-110 animate-[fade-in_2s]" />
        <div className="absolute inset-0 bg-gradient-to-l from-navy-deep/40 via-navy-deep/80 to-navy-deep" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-transparent to-transparent opacity-60" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "linear-gradient(rgba(201,169,97,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(201,169,97,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)"
        }}
      />

      <div className="relative grid min-h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-12">
        {/* RIGHT (RTL primary): progress steps */}
        <div className="lg:col-span-7 flex items-center px-6 py-12 lg:px-16 lg:py-20">
          <div className="w-full max-w-2xl animate-fade-in">
            <div className="mb-8 flex items-center gap-3">
              <div className="h-px w-16 bg-gold" />
              <span className="label-tag text-gold">מנוע SPARK AI · פעיל</span>
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
            </div>

            <h1 className="font-display text-6xl font-black leading-[0.95] text-white lg:text-7xl tracking-tighter">
              מנתח את התיק<br />
              <span className="bg-gradient-to-l from-gold to-gold-soft bg-clip-text text-transparent">
                שלכם.
              </span>
            </h1>
            <p className="mt-6 text-lg text-white/60 max-w-xl font-light">
              המערכת קוראת את כל הגיליונות, מצליבה נתונים, ומזהה הזדמנויות עסקיות בזמן אמת.
            </p>

            {/* Progress bar */}
            <div className="mt-12">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="label-tag text-white/50">התקדמות הניתוח</span>
                <span className="display-number text-3xl font-black text-white mono-num">
                  {Math.round(progress)}<span className="text-base text-white/40 font-normal">%</span>
                </span>
              </div>
              <div className="relative h-1.5 overflow-hidden bg-white/10 rounded-full">
                <div
                  className="absolute inset-y-0 right-0 bg-gradient-to-l from-gold via-gold-soft to-gold transition-all duration-200 ease-out rounded-full"
                  style={{ width: `${progress}%` }}
                />
                <div className="shimmer-bg absolute inset-0" />
              </div>
            </div>

            {/* Steps list */}
            <div className="mt-10 space-y-1.5">
              {ANALYSIS_STEPS.map((step, idx) => {
                const isDone = idx < currentStep;
                const isActive = idx === currentStep;
                const isPending = idx > currentStep;
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-4 rounded-md border-r-2 px-4 py-3 transition-all duration-300 ${
                      isActive
                        ? "border-gold bg-gold/10 backdrop-blur-sm"
                        : isDone
                          ? "border-emerald-400/50 bg-transparent"
                          : "border-transparent opacity-30"
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
                      <div className={`font-display text-base font-bold ${isActive ? "text-white" : isDone ? "text-white/70" : "text-white/40"}`}>
                        {step.label}
                      </div>
                    </div>
                    {isActive && (
                      <span className="label-tag text-[10px] text-gold animate-pulse">פעיל</span>
                    )}
                    {isDone && (
                      <span className="label-tag text-[10px] text-emerald-400">הושלם</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* LEFT: live counters - giant numbers */}
        <div className="hidden lg:col-span-5 lg:flex items-center justify-center pr-12">
          <div className="space-y-10 text-right w-full">
            <div className="animate-fade-up">
              <div className="label-tag text-[10px] text-gold-soft mb-2">לקוחות שזוהו</div>
              <div className="display-number text-7xl font-black text-white mono-num">
                {Math.round(1247 * (progress / 100)).toLocaleString("he-IL")}
              </div>
            </div>
            <div className="gold-divider w-32" />
            <div className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
              <div className="label-tag text-[10px] text-gold-soft mb-2">מוצרים מנותחים</div>
              <div className="display-number text-6xl font-black text-white/90 mono-num">
                {Math.round(2891 * (progress / 100)).toLocaleString("he-IL")}
              </div>
            </div>
            <div className="gold-divider w-32" />
            <div className="animate-fade-up" style={{ animationDelay: "0.4s" }}>
              <div className="label-tag text-[10px] text-gold-soft mb-2">דגלים שזוהו</div>
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
