import { Resend } from "resend";
import { logger } from "@/lib/core/logger";

const FROM = process.env.EMAIL_FROM ?? "MediFlow <onboarding@resend.dev>";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Sends an email via Resend, or logs it to the server console when no API key
 * is configured (dev). Never throws — a failed notification must not break the
 * booking/auth flow that triggered it.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!isEmailConfigured()) {
    logger.info({ to: opts.to, subject: opts.subject }, "email (console fallback)");
    // Plain-text dump so OTPs etc. are readable during local dev.
    console.log(
      `\n──── email ────\nTo: ${opts.to}\nSubject: ${opts.subject}\n${opts.html
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()}\n───────────────\n`
    );
    return;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    if (error) logger.error({ error, to: opts.to }, "resend send failed");
  } catch (error) {
    logger.error({ error, to: opts.to }, "resend threw");
  }
}

/** Minimal branded wrapper so every email looks consistent. */
export function emailLayout(body: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;color:#0f172a">
  <div style="padding:20px 0;font-size:18px;font-weight:600;color:#0f766e">MediFlow</div>
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;line-height:1.6">${body}</div>
  <p style="color:#94a3b8;font-size:12px;margin-top:16px">Not for medical emergencies — call your local emergency number.</p>
</div>`;
}
