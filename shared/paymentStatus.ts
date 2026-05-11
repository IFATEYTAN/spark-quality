// Round 112: shared mapping from workspace.subscriptionStatus (+ suspendedAt) to
// an admin-facing "payment status" badge. Pure & framework-agnostic so it can
// be reused on the server, in vitest, and inside React components.

export type WorkspaceSubscriptionStatus =
  | "pending_payment"
  | "active"
  | "past_due"
  | "suspended"
  | "cancelled";

export type PaymentStatusTone = "green" | "amber" | "red" | "neutral";

export interface PaymentStatusDescriptor {
  /** Hebrew short label shown inside the badge. */
  label: string;
  /** Colour tone bucket (UI maps it to Tailwind classes). */
  tone: PaymentStatusTone;
  /** Optional hover tooltip text, longer Hebrew explanation. */
  tooltip: string;
}

/**
 * Map a workspace's payment situation to a single descriptor used in the
 * admin users table. The user-level `suspendedAt` is intentionally NOT
 * considered here — that's shown in the separate "סטטוס" column.
 *
 * Order of precedence:
 *   1. No workspace at all              → ללא סוכנות (neutral)
 *   2. Workspace suspended by admin     → מושעית (red)
 *   3. subscriptionStatus === cancelled → בוטל (red)
 *   4. subscriptionStatus === past_due  → פג תוקף (red)
 *   5. subscriptionStatus === active    → שולם (green)
 *   6. subscriptionStatus === suspended → מושעית (red)
 *   7. subscriptionStatus === pending_payment OR null → ממתין לתשלום (amber)
 */
export function getPaymentStatusDescriptor(args: {
  subscriptionStatus: WorkspaceSubscriptionStatus | string | null | undefined;
  workspaceSuspendedAt: Date | string | null | undefined;
  hasWorkspace: boolean;
}): PaymentStatusDescriptor {
  if (!args.hasWorkspace) {
    return {
      label: "ללא סוכנות",
      tone: "neutral",
      tooltip: "המשתמש עדיין לא יצר סוכנות.",
    };
  }

  if (args.workspaceSuspendedAt) {
    return {
      label: "מושעית",
      tone: "red",
      tooltip: "הסוכנות הושעתה ידנית על-ידי Super-Admin.",
    };
  }

  switch (args.subscriptionStatus) {
    case "active":
      return {
        label: "שולם",
        tone: "green",
        tooltip: "מנוי פעיל — התשלום אושר ב-iCount.",
      };
    case "past_due":
      return {
        label: "פג תוקף",
        tone: "red",
        tooltip: "המנוי פג ולא חודש. הגישה חסומה עד תשלום.",
      };
    case "cancelled":
      return {
        label: "בוטל",
        tone: "red",
        tooltip: "המנוי בוטל. הגישה חסומה.",
      };
    case "suspended":
      return {
        label: "מושעית",
        tone: "red",
        tooltip: "הסוכנות הושעתה במערכת החיוב.",
      };
    case "pending_payment":
    case null:
    case undefined:
    case "":
      return {
        label: "ממתין לתשלום",
        tone: "amber",
        tooltip: "החשבון נפתח אך טרם הושלם תשלום ב-iCount.",
      };
    default:
      // Unknown future status — surface as amber so it's visible without
      // crashing the UI.
      return {
        label: String(args.subscriptionStatus),
        tone: "amber",
        tooltip: "סטטוס מנוי לא מזוהה — בדקו ב-iCount.",
      };
  }
}
