// Editorial Fintech | מסך העלאת דוח - "אפקט וואו" עם תמונה אבסטרקטית מאחור
import { useState } from "react";
import { Upload, FileSpreadsheet, ArrowLeft, Shield, Zap, BarChart3, Sparkles } from "lucide-react";
import { ASSETS } from "@/lib/demoData";

interface UploadStageProps {
  onUpload: () => void;
}

export function UploadStage({ onUpload }: UploadStageProps) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-navy-deep">
      {/* Background image - cinematic, abstract */}
      <div className="absolute inset-0">
        <img
          src={ASSETS.hero}
          alt=""
          className="h-full w-full object-cover"
        />
        {/* Overlay gradients - dark on right (where text sits in RTL), light on left */}
        <div className="absolute inset-0 bg-gradient-to-l from-navy-deep/30 via-navy-deep/85 to-navy-deep" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/30 to-transparent opacity-70" />
        <div className="absolute inset-0 bg-navy-deep/30" />
        {/* Animated grain */}
        <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")"
          }}
        />
      </div>

      {/* Content layout */}
      <div className="relative grid min-h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-12 gap-0">
        {/* RIGHT side (main, RTL primary): all content */}
        <div className="lg:col-span-7 flex items-center px-6 py-12 lg:px-16 lg:py-16">
          <div className="max-w-2xl animate-fade-up">
            {/* Eyebrow */}
            <div className="mb-8 flex items-center gap-3">
              <div className="h-px w-16 bg-gold" />
              <span className="label-tag text-gold text-shadow-sm">פלטפורמת AI לסוכני ביטוח · גרסה 1.0</span>
            </div>

            {/* Hero headline - bold modern typography */}
            <h1 className="font-display text-6xl font-black leading-[0.95] text-white lg:text-[5.5rem] tracking-tighter text-shadow-lg">
              מכרה הזהב<br />
              שיושב לכם<br />
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-l from-gold via-gold-soft to-gold bg-clip-text text-transparent">
                  במגירה.
                </span>
              </span>
            </h1>

            {/* Subhead */}
            <p className="mt-8 max-w-xl text-xl leading-relaxed text-white/95 font-light text-shadow-md">
              העלו את דוח <span className="font-semibold text-white">"מוצרים בניהול"</span> מתוך שורנס.
              בתוך פחות מדקה, ה-AI יזהה לקוחות בריסק זמני, הזדמנויות אאפסל,
              ולקוחות שדורשים שימור — ויפיק רשימת פעולות מיידית.
            </p>

            {/* Features - inline minimal */}
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 border-y border-white/25 py-5">
              {[
                { icon: Zap, label: "ניתוח", value: "30 שניות" },
                { icon: Shield, label: "פרטיות", value: "מאובטח 100%" },
                { icon: BarChart3, label: "דיוק AI", value: "97.4%" },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <f.icon className="h-4 w-4 text-gold" strokeWidth={1.5} />
                  <div>
                    <span className="label-tag text-[10px] text-white/70 ml-2 text-shadow-sm">{f.label}</span>
                    <span className="font-display font-bold text-white text-shadow-sm">{f.value}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Upload zone - the wow moment */}
            <button
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); onUpload(); }}
              onClick={onUpload}
              className={`mt-10 group relative w-full overflow-hidden rounded-md border-2 p-7 text-right transition-all duration-300 backdrop-blur-md ${
                isDragging
                  ? "border-gold bg-gold/20 scale-[1.02]"
                  : "border-white/20 bg-white/5 hover:border-gold hover:bg-white/10"
              }`}
            >
              {/* Animated shimmer */}
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-l from-transparent via-gold/10 to-transparent" />

              <div className="relative flex items-center gap-5">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-gold to-gold-soft text-navy-deep transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-2xl shadow-gold/30">
                  <FileSpreadsheet className="h-8 w-8" strokeWidth={2} />
                </div>
                <div className="flex-1 text-right">
                  <div className="font-display text-2xl font-bold text-white tracking-tight text-shadow-sm">
                    גררו לכאן את דוח Excel
                  </div>
                  <div className="mt-1 text-sm text-white/85">
                    או לחצו לבחירת קובץ · תומך .xlsx, .xls (עד 50MB)
                  </div>
                </div>
                <Upload className="h-6 w-6 text-white/40 transition-all group-hover:translate-x-2 group-hover:text-gold" strokeWidth={1.5} />
              </div>

              {/* Demo file shortcut */}
              <div className="relative mt-5 flex items-center justify-between border-t border-white/20 pt-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-gold animate-pulse" />
                  <span className="label-tag text-[10px] text-gold text-shadow-sm">דמו אוטומטי</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-white transition-colors group-hover:text-gold text-shadow-sm">
                  השתמש בדוח לדוגמה: דוח_מוצרים_בניהול.xlsx
                  <ArrowLeft className="h-3.5 w-3.5" />
                </div>
              </div>
            </button>

            {/* Trust badge */}
            <div className="mt-6 flex items-center gap-3 text-xs text-white/75 text-shadow-sm">
              <Shield className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />
              הנתונים נשארים בארגון שלכם · עומדים בתקני אבטחת מידע · הצפנה End-to-End
            </div>
          </div>
        </div>

        {/* LEFT side: floating stat cards over the data visualization */}
        <div className="hidden lg:col-span-5 lg:flex items-end justify-center pb-16 px-12 relative">
          {/* Editorial caption top */}
          <div className="absolute top-12 left-12 right-12 animate-fade-up" style={{ animationDelay: "0.5s" }}>
            <div className="border-r-2 border-gold pr-5 text-right backdrop-blur-sm bg-navy-deep/30 rounded-md p-4">
              <p className="font-display-light text-xl leading-relaxed text-white text-shadow-md">
                "ה-AI לא מחליף את הסוכן.<br />
                הוא נותן לו <span className="font-bold text-gold">כוח על</span>."
              </p>
              <p className="mt-3 label-tag text-[10px] text-gold-soft text-shadow-sm">
                — נועה כהן, סמנכ״לית טכנולוגיות, קואליטי
              </p>
            </div>
          </div>

          {/* Floating glass cards stacked */}
          <div className="space-y-3 w-full max-w-sm">
            <div className="glass-card animate-fade-up rounded-md p-5 bg-navy-deep/50 backdrop-blur-xl border border-white/30 shadow-2xl" style={{ animationDelay: "0.7s" }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="label-tag text-[10px] text-white/80 text-shadow-sm">פיילוט פעיל</div>
                  <div className="font-display text-2xl font-bold text-white tracking-tight text-shadow-sm">בית הסוכן קואליטי</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  <span className="text-xs text-emerald-300 font-semibold text-shadow-sm">LIVE</span>
                </div>
              </div>
            </div>

            <div className="glass-card animate-fade-up rounded-md p-5 bg-navy-deep/50 backdrop-blur-xl border border-white/30 shadow-2xl" style={{ animationDelay: "0.9s" }}>
              <div className="label-tag text-[10px] text-white/80 text-shadow-sm">דוחות מנותחים החודש</div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="display-number text-4xl font-black text-white text-shadow-sm">2,184</span>
                <span className="text-xs text-emerald-300 font-bold text-shadow-sm">↑ 24%</span>
              </div>
              {/* Mini sparkline */}
              <svg className="mt-3 w-full h-8" viewBox="0 0 200 32" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="#C9A961"
                  strokeWidth="1.5"
                  points="0,28 20,22 40,24 60,18 80,20 100,12 120,15 140,8 160,10 180,4 200,6"
                />
                <polyline
                  fill="url(#sparkgrad)"
                  stroke="none"
                  points="0,28 20,22 40,24 60,18 80,20 100,12 120,15 140,8 160,10 180,4 200,6 200,32 0,32"
                />
                <defs>
                  <linearGradient id="sparkgrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C9A961" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#C9A961" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="glass-card animate-fade-up rounded-md p-5 bg-gradient-to-br from-gold/40 to-gold/20 backdrop-blur-xl border border-gold/50 shadow-2xl shadow-gold/20" style={{ animationDelay: "1.1s" }}>
              <div className="label-tag text-[10px] text-gold-soft text-shadow-sm">פוטנציאל הכנסה זוהה</div>
              <div className="mt-2 display-number text-4xl font-black text-white text-shadow-md">
                ₪2.84M
              </div>
              <div className="text-xs text-white/90 mt-1 text-shadow-sm">בתיק לקוחות ממוצע</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
