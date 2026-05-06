// Thin Resend wrapper used to deliver real emails (e.g. contact-form submissions to Anat).
// Failure does not throw — callers should treat email as best-effort and rely on DB persistence + notifyOwner as the source of truth.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Verified domain in Resend (see scripts: GET /domains -> spark-ai.co.il)
const FROM_ADDRESS = "SPARK Quality <noreply@spark-ai.co.il>";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  /** Plain-text body. */
  text?: string;
  /** HTML body. Either text or html must be provided. */
  html?: string;
  /** Optional reply-to (e.g. the form submitter's email). */
  replyTo?: string;
  /** Optional CC list. */
  cc?: string | string[];
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY missing" };
  }
  if (!input.text && !input.html) {
    return { ok: false, error: "Either text or html body required" };
  }

  const payload: Record<string, unknown> = {
    from: FROM_ADDRESS,
    to: Array.isArray(input.to) ? input.to : [input.to],
    subject: input.subject,
  };
  if (input.text) payload.text = input.text;
  if (input.html) payload.html = input.html;
  if (input.replyTo) payload.reply_to = input.replyTo;
  if (input.cc) payload.cc = Array.isArray(input.cc) ? input.cc : [input.cc];

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 300)}` };
    }

    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id ?? "unknown" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Resend network error",
    };
  }
}
