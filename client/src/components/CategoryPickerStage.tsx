// Editorial Fintech | מסך בחירת ניתוח לסוכן (אורח)
// במקום להציף בכל הנתונים בבת אחת, הסוכן בוחר מה הוא רוצה לראות
// ואז כל הזרימה (Dashboard/Actions/Summary) מסתננת לפי הבחירה.
import { ASSETS, ANALYSIS_CATEGORIES, type AnalysisCategory } from "@/lib/demoData";
import { ArrowLeft, Sparkles } from "lucide-react";

interface CategoryPickerStageProps {
  onSelect: (category: AnalysisCategory) => void;
}

export function CategoryPickerStage({ onSelect }: CategoryPickerStageProps) {
  return (
    <div className="relative min-h-full w-full lg:overflow-hidden bg-navy-deep flex items-center">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={ASSETS.hero} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-l from-navy-deep via-navy-deep/85 to-navy-deep/40" />
      </div>

      <div className="relative w-full max-w-[1500px] mx-auto px-8 lg:px-16 py-10 lg:py-12">
        <div className="animate-fade-up">
          {/* Eyebrow */}
          <div className="mb-6 flex items-center gap-3 justify-end">
            <span className="label-tag text-gold tracking-[0.25em] text-xs">
              איזה ניתוח תרצו לראות תחילה?
            </span>
            <div className="h-px w-16 bg-gold" />
          </div>

          {/* Hero */}
          <h1 className="font-display text-4xl lg:text-5xl font-black leading-[1.05] text-white tracking-tighter text-right">
            לא כל הזדמנות{" "}
            <span
              className="text-[#F4D87C]"
              style={{ textShadow: "0 4px 24px rgba(244, 216, 124, 0.45), 0 2px 6px rgba(0,0,0,0.6)" }}
            >
              שווה אותו זמן.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl ml-auto text-base lg:text-lg text-white/85 font-light text-right leading-relaxed">
            בחרו את קבוצת הלקוחות שתרצו להתחיל בה. הדשבורד, רשימת הפעולות וסיכום המפגש יסוננו
            אוטומטית — כך לא תאבדו שעות בין מאות טריגרים.
          </p>

          {/* Grid */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ANALYSIS_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelect(cat.id)}
                className="group relative overflow-hidden rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] hover:border-gold/60 backdrop-blur-md p-5 text-right transition-all duration-300 cursor-pointer"
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-l from-transparent via-gold/10 to-transparent transition-transform duration-700" />
                <div className="relative flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className={`h-4 w-4 ${cat.accent}`} />
                    <ArrowLeft className="h-4 w-4 text-white/40 group-hover:text-gold group-hover:-translate-x-1 transition-all" />
                  </div>
                  <div className={`label-tag text-[10px] tracking-widest ${cat.accent}`}>
                    {cat.priorityLabel}
                  </div>
                </div>
                <div className={`relative font-display font-bold text-lg ${cat.accent} mb-1`}>
                  {cat.name}
                </div>
                <div className="relative text-xs text-white/60 mb-2 uppercase tracking-wider">
                  {cat.subtitle}
                </div>
                <p className="relative text-sm text-white/80 leading-relaxed line-clamp-3">
                  {cat.description}
                </p>
              </button>
            ))}
          </div>

          <p className="mt-6 text-xs text-white/50 text-center">
            ניתן לחזור למסך זה בכל עת ולהחליף ניתוח ֻ הנתונים מתעדכנים בזמן אמת.
          </p>
        </div>
      </div>
    </div>
  );
}
