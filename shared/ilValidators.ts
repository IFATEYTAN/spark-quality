// Israeli ID + Tax ID + Mobile-phone validators (shared client/server).
//
// All three accept lightly-formatted input (spaces, dashes, hyphens) and
// validate the *digits-only* form. Each returns a boolean — keep them pure so
// the same code runs in the React form and inside the tRPC procedure.

/** Strip everything that is not a digit. */
function digits(value: string): string {
  return (value || "").replace(/\D+/g, "");
}

/**
 * Israeli ID number (תעודת זהות) check-digit algorithm — official spec from the
 * Population Registry. Always 9 digits, padded with leading zeros if shorter
 * input was provided. The algorithm:
 *   1. Multiply each digit alternately by 1, 2, 1, 2…
 *   2. If the product is ≥ 10, sum its own digits.
 *   3. The total mod 10 must equal 0.
 */
export function isValidIsraeliId(value: string): boolean {
  const d = digits(value);
  if (d.length === 0 || d.length > 9) return false;
  const padded = d.padStart(9, "0");
  let total = 0;
  for (let i = 0; i < 9; i++) {
    let n = Number(padded[i]) * ((i % 2) + 1);
    if (n > 9) n -= 9;
    total += n;
  }
  return total % 10 === 0;
}

/**
 * Israeli company number (ח.פ / מלכ"ר) — 9 digits with the same Luhn-like
 * check-digit as ת״ז, but the first digit must be 5 (חברה בע"מ),
 * 6 (שותפויות), or rare cases 7-8. We accept any 9-digit value that passes
 * the check-digit so we don't reject niche entity types (אגודות שיתופיות).
 */
export function isValidIsraeliCompanyId(value: string): boolean {
  const d = digits(value);
  if (d.length !== 9) return false;
  // Same check-digit algorithm as ID. Re-uses the same fn.
  return isValidIsraeliId(d);
}

/**
 * Either a valid 9-digit ת״ז (individual / עוסק פטור / עוסק מורשה) or a valid
 * 9-digit ח.פ. This is the value SPARK actually persists for billing.
 */
export function isValidIsraeliTaxId(value: string, kind?: "individual" | "company"): boolean {
  const d = digits(value);
  if (d.length !== 9) return false;
  if (kind === "company") return isValidIsraeliCompanyId(d);
  if (kind === "individual") return isValidIsraeliId(d);
  return isValidIsraeliId(d) || isValidIsraeliCompanyId(d);
}

/**
 * Israeli mobile phone — accepts:
 *   05X-XXXXXXX  /  05XXXXXXXXX  /  +9725XXXXXXXX
 * Returns the normalized national form ("05XXXXXXXXX") if valid, or null.
 * We don't accept landlines because billing alerts ride over SMS-capable lines.
 */
export function normalizeIsraeliMobile(raw: string): string | null {
  let d = digits(raw);
  // Drop a leading "972" country code if present.
  if (d.startsWith("972")) d = "0" + d.slice(3);
  if (d.length !== 10) return null;
  if (!d.startsWith("05")) return null;
  // Israeli mobile prefixes: 050, 052, 053, 054, 055, 058 (and historically 057).
  const prefix = d.slice(0, 3);
  if (!["050", "052", "053", "054", "055", "057", "058"].includes(prefix)) {
    return null;
  }
  return d;
}

export function isValidIsraeliMobile(raw: string): boolean {
  return normalizeIsraeliMobile(raw) !== null;
}
