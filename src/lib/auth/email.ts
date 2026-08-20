import nodemailer from "nodemailer";

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null | undefined;

function getTransporter() {
  if (transporter !== undefined) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    transporter = null;
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  return transporter;
}

/** Sends real email when SMTP_HOST/SMTP_USER/SMTP_PASS are configured;
 *  otherwise a no-op that returns { sent: false } so callers can fall back
 *  to the dev-mode link-in-response pattern already used by magic-link
 *  auth in this codebase. Never throws — a misconfigured or unreachable
 *  SMTP server degrades to dev-mode rather than 500ing the request. */
export async function sendEmail(input: SendEmailInput): Promise<{ sent: boolean }> {
  const t = getTransporter();
  if (!t) return { sent: false };
  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: input.to,
      subject: input.subject,
      text: input.text
    });
    return { sent: true };
  } catch {
    return { sent: false };
  }
}
