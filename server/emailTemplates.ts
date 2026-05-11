// SPARK Quality · Unified branded RTL email template system.
//
// All outgoing customer-facing emails MUST flow through this module so the
// look-and-feel stays consistent: same gold/navy palette, Heebo typography,
// right-to-left direction, and a clear logo → headline → body → CTA layout.
//
// Public API
// ----------
//   renderBrandedEmail(opts) → { subject, html, text }
//
// The helper returns plain-text fallback as well so we can pass it straight to
// `sendEmail({ subject, html, text })` from `./email.ts`.

export type BrandedEmailCTA = {
  label: string;
  url: string;
  /** Visual emphasis. Defaults to "primary" (gold). */
  variant?: "primary" | "secondary";
};

export type BrandedEmailOptions = {
  /** Email subject line (rendered as-is). */
  subject: string;
  /** Greeting line. e.g. "שלום דניאל,". Optional but recommended. */
  greeting?: string;
  /** Big headline above the body, in Hebrew. Falls back to `subject` if empty. */
  headline?: string;
  /** Optional eyebrow/kicker shown above the headline (e.g. "חשבונית · SPARK Quality"). */
  eyebrow?: string;
  /**
   * Body sections — each entry becomes its own paragraph block.
   * Strings are rendered as plain paragraphs; objects can be highlight cards.
   */
  body: Array<
    | string
    | {
        type: "highlight";
        /** Optional small label above the value (e.g. "סכום לחיוב"). */
        label?: string;
        /** The big value (e.g. "₪389 / חודש"). */
        value: string;
        /** Optional supporting line under the value. */
        note?: string;
        /** "warn" turns the card red (used for suspension), "success" green. */
        tone?: "default" | "warn" | "success";
      }
    | {
        type: "list";
        /** Title above the list. */
        title?: string;
        items: string[];
      }
  >;
  /** Optional primary call-to-action button. */
  cta?: BrandedEmailCTA;
  /** Optional secondary call-to-action button (rendered next to or under the primary). */
  secondaryCta?: BrandedEmailCTA;
  /** Footer note shown above the legal block (e.g. "אם לא יזמת בקשה זו, אנא התעלם/י."). */
  footerNote?: string;
};

const PALETTE = {
  bgPage: "#06101F",
  bgCard: "#0B1A2D",
  cardBorder: "rgba(201,169,97,0.18)",
  text: "#FFFFFF",
  textMuted: "rgba(255,255,255,0.72)",
  textFaint: "rgba(255,255,255,0.55)",
  gold: "#C9A961",
  goldDark: "#B89346",
  goldSoft: "rgba(201,169,97,0.85)",
  warn: "#F87171",
  success: "#34D399",
};

const LOGO_URL = "https://spark-ai.co.il/logo-mark-gold.png";
const SUPPORT_EMAIL = "anathemell@gmail.com";
const COMPANY_FULL_NAME = "SPARK AI · ספארק איי.אי. בע״מ";
const SITE_URL = "https://spark-ai.co.il";

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderCta(cta: BrandedEmailCTA): string {
  const isPrimary = (cta.variant ?? "primary") === "primary";
  const bg = isPrimary
    ? `background: linear-gradient(135deg, ${PALETTE.gold} 0%, ${PALETTE.goldDark} 100%); color: ${PALETTE.bgPage};`
    : `background: rgba(255,255,255,0.06); color: ${PALETTE.text}; border: 1px solid rgba(255,255,255,0.25);`;
  return `
    <a href="${escapeHtml(cta.url)}"
       style="display:inline-block;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;font-family:'Heebo',Arial,sans-serif;line-height:1;${bg}">
      ${escapeHtml(cta.label)}
    </a>
  `;
}

function renderHighlight(block: {
  label?: string;
  value: string;
  note?: string;
  tone?: "default" | "warn" | "success";
}): string {
  const accent =
    block.tone === "warn"
      ? PALETTE.warn
      : block.tone === "success"
        ? PALETTE.success
        : PALETTE.gold;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;">
      <tr>
        <td style="padding:18px 22px;border:1px solid ${accent}40;border-radius:10px;background:rgba(255,255,255,0.03);">
          ${
            block.label
              ? `<div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${PALETTE.textFaint};margin-bottom:6px;">${escapeHtml(block.label)}</div>`
              : ""
          }
          <div style="font-size:24px;font-weight:800;color:${accent};font-family:'Heebo',Arial,sans-serif;">${escapeHtml(block.value)}</div>
          ${
            block.note
              ? `<div style="font-size:13px;color:${PALETTE.textMuted};margin-top:4px;line-height:1.6;">${escapeHtml(block.note)}</div>`
              : ""
          }
        </td>
      </tr>
    </table>
  `;
}

function renderList(block: { title?: string; items: string[] }): string {
  const items = block.items
    .map(
      (item) => `
        <tr>
          <td style="padding:6px 0;color:${PALETTE.textMuted};font-size:14px;line-height:1.7;">
            <span style="color:${PALETTE.gold};font-weight:700;margin-left:8px;">·</span>${escapeHtml(item)}
          </td>
        </tr>`,
    )
    .join("");
  return `
    ${block.title ? `<p style="font-size:14px;font-weight:700;color:${PALETTE.text};margin:18px 0 8px;">${escapeHtml(block.title)}</p>` : ""}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;">${items}</table>
  `;
}

export function renderBrandedEmail(opts: BrandedEmailOptions): {
  subject: string;
  html: string;
  text: string;
} {
  const headline = opts.headline ?? opts.subject;

  const bodyHtml = opts.body
    .map((block) => {
      if (typeof block === "string") {
        return `<p style="font-size:15px;line-height:1.8;color:${PALETTE.textMuted};margin:0 0 14px;">${escapeHtml(block)}</p>`;
      }
      if (block.type === "highlight") return renderHighlight(block);
      if (block.type === "list") return renderList(block);
      return "";
    })
    .join("");

  const ctaHtml =
    opts.cta || opts.secondaryCta
      ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 6px;">
          <tr>
            <td align="center" style="padding:8px 0;">
              ${opts.cta ? renderCta(opts.cta) : ""}
              ${opts.cta && opts.secondaryCta ? "<div style=\"height:10px\"></div>" : ""}
              ${opts.secondaryCta ? renderCta({ ...opts.secondaryCta, variant: opts.secondaryCta.variant ?? "secondary" }) : ""}
            </td>
          </tr>
        </table>
      `
      : "";

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${escapeHtml(opts.subject)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800;900&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${PALETTE.bgPage};font-family:'Heebo',Arial,sans-serif;direction:rtl;text-align:right;">
  <div style="display:none;max-height:0;overflow:hidden;color:transparent;">
    ${escapeHtml(headline)} · SPARK Quality
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PALETTE.bgPage};padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${PALETTE.bgCard};border:1px solid ${PALETTE.cardBorder};border-radius:14px;overflow:hidden;">
          <!-- Header strip -->
          <tr>
            <td style="background:linear-gradient(90deg, rgba(201,169,97,0.15) 0%, rgba(201,169,97,0.04) 100%);padding:22px 32px;border-bottom:1px solid ${PALETTE.cardBorder};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="right" style="vertical-align:middle;">
                    <span style="font-family:'Heebo',Arial,sans-serif;font-weight:800;color:${PALETTE.gold};font-size:18px;letter-spacing:0.04em;">SPARK Quality</span>
                    <span style="display:inline-block;font-size:10px;color:${PALETTE.textFaint};letter-spacing:0.3em;margin-right:10px;text-transform:uppercase;">מבית SPARK AI</span>
                  </td>
                  <td align="left" style="vertical-align:middle;">
                    <img src="${LOGO_URL}" alt="SPARK" width="40" height="40" style="display:block;border-radius:8px;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 36px 24px;">
              ${
                opts.eyebrow
                  ? `<div style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:${PALETTE.gold};margin-bottom:10px;">${escapeHtml(opts.eyebrow)}</div>`
                  : ""
              }
              <h1 style="font-family:'Heebo',Arial,sans-serif;font-size:26px;line-height:1.25;font-weight:900;color:${PALETTE.text};margin:0 0 18px;">
                ${escapeHtml(headline)}
              </h1>
              ${
                opts.greeting
                  ? `<p style="font-size:15px;color:${PALETTE.textMuted};margin:0 0 18px;font-weight:500;">${escapeHtml(opts.greeting)}</p>`
                  : ""
              }
              ${bodyHtml}
              ${ctaHtml}
            </td>
          </tr>

          <!-- Footer note -->
          ${
            opts.footerNote
              ? `<tr>
                  <td style="padding:0 36px 24px;">
                    <p style="font-size:12px;color:${PALETTE.textFaint};line-height:1.7;margin:0;border-top:1px solid rgba(255,255,255,0.08);padding-top:18px;">
                      ${escapeHtml(opts.footerNote)}
                    </p>
                  </td>
                </tr>`
              : ""
          }

          <!-- Legal footer -->
          <tr>
            <td style="background:rgba(0,0,0,0.25);padding:22px 36px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="font-size:11px;color:${PALETTE.textFaint};line-height:1.7;margin:0 0 6px;">
                ${escapeHtml(COMPANY_FULL_NAME)} · נשלח ממערכת SPARK Quality.
              </p>
              <p style="font-size:11px;color:${PALETTE.textFaint};line-height:1.7;margin:0;">
                לתמיכה: <a href="mailto:${SUPPORT_EMAIL}" style="color:${PALETTE.goldSoft};text-decoration:none;">${SUPPORT_EMAIL}</a>
                &nbsp;·&nbsp;
                <a href="${SITE_URL}" style="color:${PALETTE.goldSoft};text-decoration:none;">${SITE_URL}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Build a clean plain-text fallback so spam filters and accessibility-text
  // readers still get the message.
  const textLines: string[] = [];
  textLines.push(`SPARK Quality`);
  if (opts.eyebrow) textLines.push(opts.eyebrow);
  textLines.push("");
  textLines.push(headline);
  textLines.push("");
  if (opts.greeting) {
    textLines.push(opts.greeting);
    textLines.push("");
  }
  for (const block of opts.body) {
    if (typeof block === "string") {
      textLines.push(block);
      textLines.push("");
    } else if (block.type === "highlight") {
      if (block.label) textLines.push(`[${block.label}]`);
      textLines.push(block.value);
      if (block.note) textLines.push(block.note);
      textLines.push("");
    } else if (block.type === "list") {
      if (block.title) textLines.push(block.title);
      for (const item of block.items) textLines.push(`· ${item}`);
      textLines.push("");
    }
  }
  if (opts.cta) textLines.push(`${opts.cta.label}: ${opts.cta.url}`);
  if (opts.secondaryCta)
    textLines.push(`${opts.secondaryCta.label}: ${opts.secondaryCta.url}`);
  if (opts.footerNote) {
    textLines.push("");
    textLines.push(opts.footerNote);
  }
  textLines.push("");
  textLines.push("—");
  textLines.push(COMPANY_FULL_NAME);
  textLines.push(`לתמיכה: ${SUPPORT_EMAIL}`);

  return {
    subject: opts.subject,
    html,
    text: textLines.join("\n"),
  };
}
