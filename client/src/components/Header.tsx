// Editorial Fintech | header עם לוגו SPARK AI × קוואליטי
import { Sparkles } from "lucide-react";

interface HeaderProps {
  stage?: string;
  onReset?: () => void;
}

export function Header({ stage, onReset }: HeaderProps) {
  return (
    <header className="relative z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container">
        <div className="flex h-16 items-center justify-between">
          {/* Logo - RTL: מימין */}
          <button
            onClick={onReset}
            className="flex items-center gap-3 group"
          >
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-navy-deep text-gold transition-transform group-hover:scale-105">
                <Sparkles className="h-5 w-5" strokeWidth={1.5} />
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-lg font-bold leading-none text-navy-deep">
                SPARK<span className="text-gold">.</span>AI
              </div>
              <div className="label-tag mt-1 text-[10px] text-muted-foreground">
                × קוואליטי
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
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
              <span className="label-tag text-[10px] text-muted-foreground">
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
