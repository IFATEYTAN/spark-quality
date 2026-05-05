// Editorial Fintech | header עם 2 לוגואים בשני צידי המסך - SPARK AI מימין | Quality משמאל
import { LOGO } from "@/lib/demoData";

interface HeaderProps {
  stage?: string;
  onReset?: () => void;
}

export function Header({ stage, onReset }: HeaderProps) {
  return (
    <header className="relative z-50 border-b border-border/40 bg-background/95 backdrop-blur-md">
      <div className="container">
        <div className="flex h-28 items-center justify-between gap-6">
          {/* RIGHT side (RTL primary) - SPARK AI logo */}
          <button
            onClick={onReset}
            className="group flex items-center relative overflow-hidden h-24 w-64"
            aria-label="חזרה למסך הראשי"
          >
            <img
              src={LOGO.clear}
              alt="SPARK AI"
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] max-w-none object-cover transition-transform duration-300 group-hover:scale-105"
              style={{ filter: "drop-shadow(0 2px 8px rgba(201, 169, 97, 0.15))" }}
            />
          </button>

          {/* CENTER - stage indicator + LIVE pill */}
          <div className="hidden md:flex items-center gap-6">
            {stage && (
              <div className="flex items-center gap-3">
                <span className="label-tag text-muted-foreground">שלב</span>
                <span className="font-display text-sm font-bold text-navy-deep">
                  {stage}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-full bg-navy-deep/5 px-3 py-1.5 border border-navy-deep/10">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              <span className="label-tag text-[10px] text-navy-deep">
                LIVE DEMO
              </span>
            </div>
          </div>

          {/* LEFT side - Quality logo with centered caption above */}
          <div className="flex flex-col items-center gap-1">
            <span className="label-tag text-[10px] text-muted-foreground tracking-[0.18em]">
              בשיתוף בית הסוכן
            </span>
            <img
              src={LOGO.quality}
              alt="Quality - פיננסים וביטוח"
              className="h-16 w-auto object-contain transition-transform duration-300 hover:scale-105"
            />
          </div>
        </div>
      </div>
      <div className="gold-divider-solid" />
    </header>
  );
}
