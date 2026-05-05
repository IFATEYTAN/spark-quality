// Editorial Fintech | header עם לוגו SPARK AI הרשמי × קוואליטי
import { LOGO } from "@/lib/demoData";

interface HeaderProps {
  stage?: string;
  onReset?: () => void;
}

export function Header({ stage, onReset }: HeaderProps) {
  return (
    <header className="relative z-50 border-b border-border/40 bg-background/90 backdrop-blur-md">
      <div className="container">
        <div className="flex h-20 items-center justify-between">
          {/* Logo - RTL: מימין */}
          <button
            onClick={onReset}
            className="flex items-center gap-4 group"
            aria-label="חזרה למסך הראשי"
          >
            <div className="relative flex items-center">
              <img
                src={LOGO.clear}
                alt="SPARK AI"
                className="h-14 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </div>
            <div className="text-right border-r border-border/60 pr-4 hidden sm:block">
              <div className="label-tag text-[10px] text-muted-foreground">
                בשיתוף
              </div>
              <div className="font-display text-base font-bold leading-tight text-navy-deep">
                קוואליטי
              </div>
            </div>
          </button>

          {/* Stage indicator + meta */}
          <div className="flex items-center gap-6">
            {stage && (
              <div className="hidden items-center gap-3 md:flex">
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
        </div>
      </div>
      <div className="gold-divider-solid" />
    </header>
  );
}
