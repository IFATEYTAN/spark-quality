// Editorial Fintech | מסך העלאת דוח - תומך בקובץ אמיתי + מצב דמו
import { useRef, useState } from "react";
import { Upload, FileSpreadsheet, ArrowLeft, Sparkles, FileCheck2, AlertCircle } from "lucide-react";
import { ASSETS } from "@/lib/demoData";
import type { ParsedReport } from "@/lib/parseReport";
import { parseShorensReport } from "@/lib/parseReport";
import { toast } from "sonner";

interface UploadStageProps {
  onUpload: (parsed?: ParsedReport) => void;
}

export function UploadStage({ onUpload }: UploadStageProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);

    const t = toast.loading(`קורא את ${file.name}…`);
    try {
      const parsed = await parseShorensReport(file);
      toast.success(
        `זוהו ${parsed.customerCount} לקוחות · ${parsed.productCount} מוצרים`,
        { id: t },
      );
      // small delay so user sees the success state
      setTimeout(() => onUpload(parsed), 600);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "לא הצלחנו לקרוא את הקובץ. ודאי שזה דוח מוצרים בניהול תקין.", { id: t });
      setIsProcessing(false);
      setFileName(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleDemo = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpload(); // trigger demo data flow
  };

  return (
    <div className="relative min-h-full w-full lg:overflow-hidden bg-navy-deep">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {/* Background image - clean abstract */}
      <div className="absolute inset-0">
        <img src={ASSETS.hero} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-l from-navy-deep via-navy-deep/75 to-navy-deep/30" />
        <div className="absolute inset-0 bg-navy-deep/20" />
      </div>

      {/* Content layout */}
      <div className="relative grid lg:h-full w-full max-w-[1500px] mx-auto grid-cols-1 lg:grid-cols-12">
        {/* RIGHT side (main, RTL primary): hero text + upload */}
        <div className="lg:col-span-8 flex items-center px-8 lg:px-16 py-8">
          <div className="max-w-2xl animate-fade-up w-full">
            {/* Eyebrow */}
            <div className="mb-7 flex items-center gap-3">
              <div className="h-px w-16 bg-gold" />
              <span className="label-tag text-gold tracking-[0.25em] text-xs">
                כשהקסם של ה-AI פוגש את העוצמה שלכם
              </span>
            </div>

            {/* Hero headline */}
            <h1 className="font-display text-5xl font-black leading-[1] text-white lg:text-[4.25rem] tracking-tighter">
              מכרה הזהב<br />
              שיושב לכם{" "}
              <span
                className="text-[#F4D87C]"
                style={{
                  textShadow:
                    "0 4px 24px rgba(244, 216, 124, 0.45), 0 2px 6px rgba(0,0,0,0.6)",
                }}
              >
                במגירה.
              </span>
            </h1>

            {/* Subhead */}
            <p className="mt-7 max-w-xl text-base lg:text-lg leading-relaxed text-white/90 font-light">
              העלו את דוח <span className="font-semibold text-white">"מוצרים בניהול"</span> ממערכת surense.
              <br />
              ה-AI יזהה לקוחות בריסק, הזדמנויות אאפסל וקריאות לפעולה — בפחות מדקה.
            </p>

            {/* Upload zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={handleClick}
              className={`mt-9 group relative w-full overflow-hidden rounded-lg border-2 p-6 text-right transition-all duration-300 backdrop-blur-md cursor-pointer ${
                isDragging
                  ? "border-gold bg-gold/20 scale-[1.02]"
                  : isProcessing
                    ? "border-emerald-400 bg-emerald-400/10"
                    : "border-white/25 bg-white/5 hover:border-gold hover:bg-white/10"
              }`}
            >
              {/* Animated shimmer */}
              {!isProcessing && (
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-l from-transparent via-gold/10 to-transparent" />
              )}

              <div className="relative flex items-center gap-5">
                <div className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg transition-all shadow-2xl ${
                  isProcessing
                    ? "bg-emerald-400 text-navy-deep shadow-emerald-400/30 animate-pulse"
                    : "bg-gradient-to-br from-gold to-gold-soft text-navy-deep group-hover:scale-110 shadow-gold/30"
                }`}>
                  {isProcessing ? <FileCheck2 className="h-8 w-8" strokeWidth={2} /> : <FileSpreadsheet className="h-8 w-8" strokeWidth={2} />}
                </div>
                <div className="flex-1 text-right">
                  <div className="font-display text-2xl font-bold text-white tracking-tight">
                    {isProcessing ? "מעבד את הקובץ…" : fileName ? fileName : "גררו לכאן את דוח Excel"}
                  </div>
                  <div className="mt-1 text-sm text-white/75">
                    {isProcessing ? "מנתח גליונות, מאחד לקוחות, מזהה דגלים" : "או לחצו לבחירת קובץ · תומך .xlsx, .xls, .csv"}
                  </div>
                </div>
                {!isProcessing && (
                  <Upload
                    className="h-7 w-7 text-white/40 transition-all group-hover:translate-x-2 group-hover:text-gold"
                    strokeWidth={1.5}
                  />
                )}
              </div>

              {/* Demo file shortcut */}
              <div className="relative mt-5 flex items-center justify-between border-t border-white/15 pt-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-white/40" />
                  <span className="text-[11px] text-white/50">
                    הקובץ נשאר בדפדפן בלבד · לא נשלח לשרת
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDemo}
                  className="flex items-center gap-2 text-sm font-semibold text-white/95 transition-colors hover:text-gold"
                >
                  <Sparkles className="h-4 w-4 text-gold animate-pulse" />
                  השתמש בדוח לדוגמה
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* LEFT side: just the editorial quote, much lighter */}
        <div className="hidden lg:col-span-4 lg:flex items-center px-8">
          <div className="animate-fade-up w-full" style={{ animationDelay: "0.4s" }}>
            <div className="border-r-2 border-gold pr-6 text-right">
              <p className="font-display-light text-2xl leading-relaxed text-white/95">
                "ה-AI לא מחליף את הסוכן.<br />
                הוא נותן לו <span className="font-bold text-gold">כוח על</span>."
              </p>
              <p className="mt-4 label-tag text-[11px] text-gold-soft tracking-widest">
                — רונית אבני, סוכנת ביטוח בכירה
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
