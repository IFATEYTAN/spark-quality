// SPARK AI · SequenceModal — enroll selected clients in a timed follow-up
// cadence. Each step becomes a scheduled reminder (surfaced in "My Tasks
// Today"); there is no auto-send — the agent is prompted on the right day.
import { useState } from "react";
import { Loader2, CalendarClock, Plus, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Channel = "whatsapp" | "email" | "call" | "sms" | "meeting";

interface Step {
  offsetDays: number;
  channel: Channel;
  note: string;
}

const CHANNEL_LABEL: Record<Channel, string> = {
  whatsapp: "וואטסאפ",
  email: "מייל",
  call: "שיחה",
  sms: "SMS",
  meeting: "פגישה",
};

const DEFAULT_STEPS: Step[] = [
  { offsetDays: 0, channel: "whatsapp", note: "פנייה ראשונה בוואטסאפ" },
  { offsetDays: 3, channel: "email", note: "מייל המשך עם פירוט והצעה" },
  { offsetDays: 7, channel: "call", note: "שיחת טלפון לסגירה" },
];

export interface SequenceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientIds: number[];
  onEnrolled?: () => void;
}

export function SequenceModal({ open, onOpenChange, clientIds, onEnrolled }: SequenceModalProps) {
  const [steps, setSteps] = useState<Step[]>(DEFAULT_STEPS);

  const enroll = trpc.sequences.enroll.useMutation({
    onSuccess: (res) => {
      toast.success("הרצף הופעל", {
        description: `${res.enrolledClients} לקוחות · ${res.remindersCreated} תזכורות נקבעו`,
      });
      setSteps(DEFAULT_STEPS);
      onEnrolled?.();
      onOpenChange(false);
    },
    onError: (err) => toast.error("שגיאה בהפעלת הרצף", { description: err.message }),
  });

  const updateStep = (i: number, patch: Partial<Step>) =>
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const removeStep = (i: number) => setSteps((prev) => prev.filter((_, idx) => idx !== i));
  const addStep = () =>
    setSteps((prev) => [
      ...prev,
      { offsetDays: (prev[prev.length - 1]?.offsetDays ?? 0) + 3, channel: "call", note: "" },
    ]);

  const valid = steps.length > 0 && steps.every((s) => s.note.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-gold" />
            רצף מעקב ל-{clientIds.length.toLocaleString("he-IL")} לקוחות
          </DialogTitle>
          <DialogDescription>
            כל שלב נקבע כתזכורת ביום שבחרת — תופיע ב"המשימות שלי היום". אין שליחה
            אוטומטית; אתם פועלים בזמן.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {steps.map((s, i) => (
            <div
              key={i}
              className="flex items-end gap-2 rounded-md border border-white/10 p-3"
            >
              <div className="w-20 shrink-0">
                <Label className="mb-1 block text-[11px] text-white/55">יום</Label>
                <Input
                  type="number"
                  min={0}
                  max={365}
                  value={s.offsetDays}
                  onChange={(e) => updateStep(i, { offsetDays: Number(e.target.value) || 0 })}
                  className="h-9"
                />
              </div>
              <div className="w-28 shrink-0">
                <Label className="mb-1 block text-[11px] text-white/55">ערוץ</Label>
                <select
                  value={s.channel}
                  onChange={(e) => updateStep(i, { channel: e.target.value as Channel })}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                >
                  {(Object.keys(CHANNEL_LABEL) as Channel[]).map((c) => (
                    <option key={c} value={c} className="bg-[#0E1C35]">
                      {CHANNEL_LABEL[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <Label className="mb-1 block text-[11px] text-white/55">תיאור הצעד</Label>
                <Input
                  value={s.note}
                  onChange={(e) => updateStep(i, { note: e.target.value })}
                  placeholder="מה לעשות בשלב זה"
                  maxLength={500}
                  className="h-9"
                />
              </div>
              <button
                type="button"
                onClick={() => removeStep(i)}
                disabled={steps.length === 1}
                className="mb-1 p-2 text-white/50 hover:text-rose-300 disabled:opacity-30"
                aria-label="הסר שלב"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          <Button variant="ghost" size="sm" onClick={addStep} disabled={steps.length >= 10}>
            <Plus className="h-4 w-4 ml-1" /> הוסף שלב
          </Button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={enroll.isPending}>
            ביטול
          </Button>
          <Button
            onClick={() => enroll.mutate({ clientIds, steps })}
            disabled={!valid || enroll.isPending}
          >
            {enroll.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin ml-1" />
            ) : (
              <Zap className="h-4 w-4 ml-1" />
            )}
            הפעל רצף
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
