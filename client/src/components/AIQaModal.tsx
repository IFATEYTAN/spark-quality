import { useState, useEffect } from "react";
import { X, Sparkles, Loader2, Send, MessageSquare, Lightbulb } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface AIQaModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisContext: any;
}

export function AIQaModal({ isOpen, onClose, analysisContext }: AIQaModalProps) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const qaMutation = trpc.reports.qa.useMutation();
  const suggestionsMutation = trpc.reports.smartSuggestions.useMutation();

  useEffect(() => {
    if (isOpen && suggestions.length === 0 && !suggestionsMutation.isPending) {
      suggestionsMutation.mutate(
        { analysis: analysisContext },
        {
          onSuccess: (res) => {
            if (res.suggestions && Array.isArray(res.suggestions)) {
              setSuggestions(res.suggestions);
            }
          }
        }
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAsk = () => {
    if (!question.trim() || qaMutation.isPending) return;
    
    const currentQ = question;
    setQuestion("");
    
    qaMutation.mutate(
      { analysis: analysisContext, question: currentQ },
      {
        onSuccess: (res) => {
          setHistory(prev => [...prev, { q: currentQ, a: String(res.answer) }]);
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-navy-deep">שאלות ותשובות על הדוח</h3>
              <p className="text-[10px] text-muted-foreground">SPARK AI Assistant</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col gap-4">
          {history.length === 0 && !qaMutation.isPending && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-60">
              <MessageSquare className="h-12 w-12 mb-4" />
              <p className="text-sm">שאל כל שאלה על הנתונים בדוח שהועלה.</p>
            </div>
          )}

          {/* Smart Suggestions Chips */}
          {history.length === 0 && suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {suggestions.map((sug, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuestion(sug);
                    // We don't auto-submit so the user can read it first, but we could.
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold/10 text-gold border border-gold/20 text-xs hover:bg-gold/20 transition-colors"
                >
                  <Lightbulb className="h-3 w-3" />
                  {sug}
                </button>
              ))}
            </div>
          )}
          
          {history.map((item, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="self-end bg-navy-deep text-cream px-4 py-2 rounded-2xl rounded-tr-sm max-w-[80%] text-sm">
                {item.q}
              </div>
              <div className="self-start bg-muted/50 text-navy-deep px-4 py-3 rounded-2xl rounded-tl-sm max-w-[90%] text-sm whitespace-pre-wrap border border-border/50">
                {item.a}
              </div>
            </div>
          ))}
          
          {qaMutation.isPending && (
            <div className="self-start bg-muted/50 text-navy-deep px-4 py-3 rounded-2xl rounded-tl-sm text-sm border border-border/50 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-gold" />
              חושב...
            </div>
          )}
        </div>
        
        <div className="border-t border-border/50 bg-muted/20 p-4">
          <div className="relative flex items-center">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder="שאל שאלה על הדוח..."
              className="w-full rounded-full border border-border bg-background pl-12 pr-4 py-3 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
              dir="rtl"
            />
            <button 
              onClick={handleAsk}
              disabled={!question.trim() || qaMutation.isPending}
              className="absolute left-2 flex h-8 w-8 items-center justify-center rounded-full bg-gold text-white transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              <Send className="h-4 w-4 -ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
