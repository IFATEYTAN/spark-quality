// Editorial Fintech | header עם לוגו SPARK AI הרשמי × קוואליטי - co-brand
import { LOGO } from "@/lib/demoData";

interface HeaderProps {
  stage?: string;
  onReset?: () => void;
}

export function Header({ stage, onReset }: HeaderProps) {
  return (
    <header className="relative z-50 border-b border-border/40 bg-background/95 backdrop-blur-md">
      <div className="container">
        <div className="flex h-24 items-center justify-between">
          {/* Co-branded logos - RTL: מימין */}
          <button
            onClick={onReset}
            className="flex items-center gap-5 group"
            aria-label="חזרה למסך הראשי"
          >
            {/* SPARK AI - dominant logo */}
            <div className="relative flex items-center">
              <img
                src={LOGO.clear}
                alt="SPARK AI"
                className="h-20 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                style={{ filter: "drop-shadow(0 2px 8px rgba(201, 169, 97, 0.15))" }}
              />
            </div>

            {/* Divider */}
            <div className="hidden sm:flex flex-col items-center">
              <div className="h-12 w-px bg-gradient-to-b from-transparent via-gold/60 to-transparent" />
              <span className="my-1 text-[10px] font-display tracking-[0.2em] text-gold/70">×</span>
              <div className="h-12 w-px bg-gradient-to-b from-transparent via-gold/60 to-transparent" />
            </div>

            {/* Quality logo */}
            <div className="hidden sm:flex flex-col items-end">
              <span className="label-tag text-[9px] text-muted-foreground mb-1">בשיתוף בית הסוכן</span>
              <img
                src={LOGO.quality}
                alt="Quality - פיננסים וביטוח"
                className="h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          </button>

          {/* Stage indicator + LIVE */}
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
