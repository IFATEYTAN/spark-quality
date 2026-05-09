import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, X } from "lucide-react";
import { useLocation } from "wouter";

type Plan = "basic" | "pro" | "premium";

const PLAN_LABEL: Record<Plan, string> = {
  basic: "Base",
  pro: "Pro",
  premium: "Premium",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  requiredPlan: Plan;
  description?: string;
};

export function UpgradeModal({ open, onOpenChange, feature, requiredPlan, description }: Props) {
  const [, navigate] = useLocation();
  const planLabel = PLAN_LABEL[requiredPlan];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#0E1827] border border-gold/30 text-white" dir="rtl">
        <DialogHeader>
          <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-gradient-to-br from-gold/30 to-gold/10 border border-gold/40 flex items-center justify-center">
            <Crown className="h-7 w-7 text-gold" />
          </div>
          <DialogTitle className="text-center font-display text-2xl text-white">
            פיצ'ר זה דורש שדרוג ל-{planLabel}
          </DialogTitle>
          <DialogDescription className="text-center text-white/70 pt-2">
            {description || `${feature} זמין רק במנוי ${planLabel} ומעלה. שדרגו את התוכנית שלכם כדי לפתוח את הפיצ'ר ועוד יכולות מתקדמות.`}
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 p-4 rounded-md bg-gold/5 border border-gold/20">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-gold flex-shrink-0 mt-0.5" />
            <div className="text-sm text-white/80">
              <strong className="text-gold">למה לשדרג ל-{planLabel}?</strong>
              <ul className="mt-2 space-y-1 list-disc pr-5">
                {requiredPlan === "pro" && (
                  <>
                    <li>עד 1,000 לקוחות בתיק</li>
                    <li>אוטומציות WhatsApp ו-Email</li>
                    <li>עד 200 דגלים פעילים</li>
                  </>
                )}
                {requiredPlan === "premium" && (
                  <>
                    <li>לקוחות ודגלים ללא הגבלה</li>
                    <li>ייצוא מלא ל-CRM חיצוני</li>
                    <li>ניתוח AI מתקדם של תרחישים</li>
                    <li>תמיכה טלפונית VIP</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 border-white/20 bg-white/5 text-white hover:bg-white/10"
          >
            <X className="h-4 w-4 ml-1.5" />
            לא עכשיו
          </Button>
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              navigate("/pricing");
            }}
            className="flex-1 bg-gradient-to-br from-gold to-[#B89346] text-[#06101F] hover:scale-[1.02] hover:shadow-lg hover:shadow-gold/30 font-bold"
          >
            <Crown className="h-4 w-4 ml-1.5" />
            שדרגו עכשיו
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
