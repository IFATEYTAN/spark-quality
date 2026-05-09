import { useState, useEffect } from "react";
import { X, Sparkles, Loader2, Play } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface AIBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisContext: any;
}

export function AIBriefingModal({ isOpen, onClose, analysisContext }: AIBriefingModalProps) {
  const [briefing, setBriefing] = useState<string | null>(null);
  const briefingMutation = trpc.reports.briefing.useMutation();

  useEffect(() => {
    if (isOpen && !briefing && !briefingMutation.isPending) {
      briefingMutation.mutate(
        { analysis: analysisContext, agentName: "יפעת" },
        {
          onSuccess: (res) => setBriefing(String(res.briefing)),
        }
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/10 text-gold">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-navy-deep">תדריך בוקר אישי</h3>
              <p className="text-[10px] text-muted-foreground">מופק על ידי SPARK AI</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {briefingMutation.isPending ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-gold mb-4" />
              <p className="text-sm">מכין את התדריך היומי שלך...</p>
            </div>
          ) : briefing ? (
            <div className="prose prose-sm prose-p:leading-relaxed prose-headings:font-display prose-headings:text-navy-deep max-w-none whitespace-pre-wrap text-foreground/80">
              {briefing}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm text-red-500">שגיאה בהפקת התדריך.</p>
            </div>
          )}
        </div>
        
        <div className="border-t border-border/50 bg-muted/20 px-4 py-3 flex justify-end">
          <button onClick={onClose} className="rounded-md bg-navy-deep px-4 py-2 text-xs font-semibold text-cream hover:bg-navy">
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
