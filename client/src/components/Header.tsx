// Editorial Fintech | header עם לוגו SPARK AI מימין, אינדיקטור שלב במרכז
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
            className="group flex items-center justify-center h-20 transition-transform duration-300 hover:scale-[1.03]"
            aria-label="חזרה למסך הראשי"
          >
            <img
              src={LOGO.clear}
              alt="SPARK AI"
              className="h-full w-auto object-contain"
              style={{ filter: "drop-shadow(0 2px 6px rgba(201, 169, 97, 0.2))" }}
            />
          </button>

          {/* LEFT side - stage indicator + LIVE pill */}
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
        </div>
      </div>
      <div className="gold-divider-solid" />
    </header>
  );
}
