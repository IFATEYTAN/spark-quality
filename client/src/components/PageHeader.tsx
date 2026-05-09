// PageHeader — כותרת אחידה לכל מסך במערכת/אתר/דמו
// Eyebrow זהב קטן | כותרת ראשית בגופן Cinzel | תת-כותרת ב-Heebo
import type { ReactNode } from "react";

interface PageHeaderProps {
  /** תווית קטנה זהב מעל הכותרת. למשל: "SPARK QUALITY · דשבורד" */
  eyebrow?: string;
  /** הכותרת הראשית (חובה) */
  title: ReactNode;
  /** תת-כותרת קצרה */
  subtitle?: ReactNode;
  /** תוכן עזר משמאל (כפתור, אינדיקטור, סטטוס) */
  actions?: ReactNode;
  /** מרווח עליון/תחתון — ברירת מחדל compact לדשבורדים */
  spacing?: "compact" | "default" | "spacious";
  /** יישור התוכן: ימני (ברירת מחדל RTL), מרכז (Hero), שמאלי */
  align?: "right" | "center" | "left";
}

const SPACING_MAP = {
  compact: "py-6 sm:py-8",
  default: "py-10 sm:py-14",
  spacious: "py-16 sm:py-24",
} as const;

const ALIGN_MAP = {
  right: "text-right items-end",
  center: "text-center items-center",
  left: "text-left items-start",
} as const;

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  spacing = "default",
  align = "right",
}: PageHeaderProps) {
  return (
    <header
      dir="rtl"
      className={`relative ${SPACING_MAP[spacing]} container`}
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-8">
        <div className={`flex flex-col gap-3 ${ALIGN_MAP[align]} flex-1 min-w-0`}>
          {eyebrow ? (
            <div className="flex items-center gap-3 text-gold/85">
              <span className="h-px w-8 bg-gradient-to-l from-transparent via-gold/60 to-gold/0" />
              <span className="text-[10px] sm:text-xs font-semibold tracking-[0.35em] uppercase">
                {eyebrow}
              </span>
            </div>
          ) : null}

          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.1] text-white">
            {title}
          </h1>

          {subtitle ? (
            <p className="text-sm sm:text-base text-white/70 max-w-2xl">
              {subtitle}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex items-center gap-3 shrink-0">{actions}</div>
        ) : null}
      </div>

      {/* underline accent */}
      <div className="mt-6 h-px w-full bg-gradient-to-l from-transparent via-gold/30 to-transparent" />
    </header>
  );
}
