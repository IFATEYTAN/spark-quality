// Editorial Fintech | מסך העלאת דוח - asymmetric split-screen
import { useState } from "react";
import { Upload, FileSpreadsheet, ArrowLeft, Shield, Zap, BarChart3 } from "lucide-react";
import { ASSETS } from "@/lib/demoData";

interface UploadStageProps {
  onUpload: () => void;
}

export function UploadStage({ onUpload }: UploadStageProps) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-12">
      {/* Right side (RTL primary): content */}
      <div className="lg:col-span-7 flex items-center px-6 py-12 lg:px-16 lg:py-20 order-2 lg:order-1">
        <div className="max-w-2xl animate-fade-up">
          {/* Eyebrow */}
          <div className="mb-6 flex items-center gap-3">
            <div className="h-px w-12 bg-gold" />
            <span className="label-tag text-gold">פלטפורמת AI לסוכני ביטוח</span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-5xl font-bold leading-[1.05] text-navy-deep lg:text-7xl">
            מכרה הזהב<br />
            שיושב לכם<br />
            <span className="relative inline-block">
              <span className="relative z-10">במגירה.</span>
              <span className="absolute -bottom-1 right-0 h-3 w-full bg-gold/30" />
            </span>
          </h1>

          {/* Subhead */}
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
            העלו את דוח <span className="font-semibold text-navy-deep">"מוצרים בניהול"</span>{" "}
            מתוך שורנס. בתוך פחות מדקה, ה-AI יזהה לקוחות בריסק זמני,
            הזדמנויות אאפסל, ולקוחות שדורשים שימור — ויפיק עבורכם רשימת פעולות מיידית.
          </p>

          {/* Features */}
          <div className="mt-10 grid grid-cols-3 gap-6 border-y border-border/60 py-6">
            {[
              { icon: Zap, label: "ניתוח", value: "30 שניות" },
              { icon: Shield, label: "פרטיות", value: "מאובטח 100%" },
              { icon: BarChart3, label: "דיוק AI", value: "97.4%" },
            ].map((f, i) => (
              <div key={i}>
                <f.icon className="mb-2 h-4 w-4 text-gold" strokeWidth={1.5} />
                <div className="label-tag text-[10px] text-muted-foreground">{f.label}</div>
                <div className="mt-1 font-display text-lg font-bold text-navy-deep">
                  {f.value}
                </div>
              </div>
            ))}
          </div>

          {/* Upload zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); onUpload(); }}
            className={`mt-10 group relative cursor-pointer overflow-hidden rounded-sm border-2 border-dashed bg-card p-8 transition-all hover:border-gold ${
              isDragging ? "border-gold bg-gold/5" : "border-border"
            }`}
            onClick={onUpload}
          >
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-sm bg-navy-deep text-gold transition-transform group-hover:scale-105">
                <FileSpreadsheet className="h-7 w-7" strokeWidth={1.5} />
              </div>
              <div className="flex-1 text-right">
                <div className="font-display text-xl font-bold text-navy-deep">
                  גררו לכאן את דוח Excel
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  או לחצו לבחירת קובץ · תומך ב-.xlsx, .xls (עד 50MB)
                </div>
              </div>
              <Upload className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-gold" strokeWidth={1.5} />
            </div>

            {/* Demo file shortcut */}
            <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-5">
              <span className="label-tag text-muted-foreground">לדמו ההדרכה</span>
              <button
                onClick={(e) => { e.stopPropagation(); onUpload(); }}
                className="flex items-center gap-2 text-sm font-semibold text-navy-deep transition-colors hover:text-gold"
              >
                השתמש בדוח לדוגמה: דוח_מוצרים_בניהול.xlsx
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Trust badge */}
          <div className="mt-8 flex items-center gap-3 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />
            הנתונים נשארים בארגון שלכם · עומדים בתקני אבטחת מידע · הצפנה End-to-End
          </div>
        </div>
      </div>

      {/* Left side: hero image */}
      <div className="relative lg:col-span-5 overflow-hidden order-1 lg:order-2 min-h-[300px] lg:min-h-full">
        <div className="absolute inset-0 bg-navy-deep">
          <img
            src={ASSETS.hero}
            alt="פלטפורמת AI לסוכני ביטוח"
            className="h-full w-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-navy-deep/40 via-transparent to-transparent" />
        </div>

        {/* Floating stat cards */}
        <div className="absolute bottom-8 right-8 left-8 space-y-3 lg:bottom-12 lg:right-12 lg:left-auto lg:max-w-xs">
          <div className="glass-card animate-fade-up rounded-sm p-4" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="label-tag text-[10px] text-muted-foreground">סוכנויות פעילות</div>
                <div className="font-display text-2xl font-bold text-navy-deep">קואליטי</div>
              </div>
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            </div>
          </div>
          <div className="glass-card animate-fade-up rounded-sm p-4" style={{ animationDelay: "0.5s" }}>
            <div className="label-tag text-[10px] text-muted-foreground">דוחות מנותחים החודש</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold text-navy-deep">2,184</span>
              <span className="text-xs text-emerald-600">+24%</span>
            </div>
          </div>
        </div>

        {/* Editorial caption */}
        <div className="absolute top-8 right-8 left-8 lg:top-12 lg:right-12 lg:left-auto lg:max-w-xs">
          <div className="border-r-2 border-gold pr-4 text-right">
            <p className="text-sm leading-relaxed text-white/90">
              "ה-AI לא מחליף את הסוכן.<br />
              הוא נותן לו כוח על."
            </p>
            <p className="mt-2 label-tag text-[10px] text-gold-soft">
              SPARK AI × קוואליטי
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
