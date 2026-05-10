// shared/copy.ts
// Single source of truth for the SPARK Quality marketing copy that appears on
// the landing page (Home.tsx) and the dedicated /pricing page (Pricing.tsx).
// Keeping these strings here lets us swap A/B variants from one place — switch
// the exported `PRICING_COPY` constant to one of the variants below to flip
// the headline + sub-headline + CTA across the whole site at once.

export type PricingCopyVariant = {
  /** Short slug used in analytics so we can attribute conversions per variant. */
  variant: "default" | "roi-focused" | "outcome-focused";
  /** Section eyebrow (small uppercase line above the plan card). */
  badge: string;
  /** Big-card heading. Two short clauses work best in Hebrew. */
  headline: string;
  /** Sub-headline shown directly under the price line. */
  subheadline: string;
  /** Primary CTA inside the SPARK Quality card. */
  primaryCta: string;
  /** Headline for the Enterprise contact card. */
  enterpriseHeadline: string;
};

export const PRICING_COPY_DEFAULT: PricingCopyVariant = {
  variant: "default",
  badge: "★ כל היכולות · ללא מגבלה",
  headline: "תוכנית אחת. כל הכלים. ללא מגבלה.",
  subheadline: "ללא הגבלת לקוחות, ללא הגבלת טריגרים, ללא חברי-צוות נוספים בתשלום.",
  primaryCta: "הצטרפו ל-SPARK Quality",
  enterpriseHeadline: "לסוכנויות גדולות · פתרון מותאם.",
};

export const PRICING_COPY_ROI: PricingCopyVariant = {
  variant: "roi-focused",
  badge: "★ מחזירה את עצמה בעסקת שימור אחת",
  headline: "החזר השקעה כבר בלקוח הראשון שלא ייעלם.",
  subheadline: "שימור לקוח אחד מכסה את עלות השנה — וזה לפני כל הזדמנות חדשה שהמערכת מאתרת.",
  primaryCta: "התחילו לעבוד עם SPARK Quality",
  enterpriseHeadline: "לסוכנויות בצמיחה · ROI מדיד.",
};

export const PRICING_COPY_OUTCOME: PricingCopyVariant = {
  variant: "outcome-focused",
  badge: "★ מהדוח החודשי לפעולה אוטומטית",
  headline: "כל ההזדמנויות בתיק, מיד לאחר שהדוח עולה.",
  subheadline: "16 טריגרים חכמים, AI Composer, ורשימת משימות יומית — בלי שתצטרכו לחפש כלום ידנית.",
  primaryCta: "תתחילו עם SPARK Quality",
  enterpriseHeadline: "לסוכנויות שמרחיבות פעילות.",
};

/**
 * The variant that the public site renders today. Swap this assignment to
 * roll out a different A/B variant globally; downstream code reads only from
 * `PRICING_COPY` so a single line change here propagates everywhere.
 */
export const PRICING_COPY: PricingCopyVariant = PRICING_COPY_DEFAULT;

/**
 * Pricing source-of-truth for the SPARK Quality plan. Keep numbers here so
 * Home.tsx, Pricing.tsx, billing procedures, and any docs share the same
 * canonical figures.
 */
export const SPARK_QUALITY_PRICING = {
  monthlyIls: 349,
  /** Effective monthly price when billed yearly (≈ 15% off the monthly tier). */
  yearlyMonthlyIls: 297,
  yearlyTotalIls: 3567,
  yearlyDiscountPct: 15,
} as const;
