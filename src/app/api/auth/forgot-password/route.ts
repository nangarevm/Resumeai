import { NextResponse } from "next/server";
import { createResetToken, resetLinkUrl } from "@/lib/auth/password-reset";
import { sendEmail } from "@/lib/auth/email";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

const GENERIC_MESSAGE = "If an account exists for that email, a password reset link has been sent.";

// Two separate limits: per-email stops someone from email-bombing one
// target's inbox with reset links; per-IP stops one client from working
// through many target addresses.
const EMAIL_MAX_ATTEMPTS = 3;
const EMAIL_WINDOW_MS = 15 * 60 * 1000;
const IP_MAX_ATTEMPTS = 10;
const IP_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const ipLimit = checkRateLimit(`forgot-password-ip:${getClientIp(request)}`, IP_MAX_ATTEMPTS, IP_WINDOW_MS);
  const emailLimit = checkRateLimit(`forgot-password-email:${email.toLowerCase()}`, EMAIL_MAX_ATTEMPTS, EMAIL_WINDOW_MS);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    // Same generic response either way — a distinct "rate limited" message
    // here would let an attacker confirm they've found a real, actively-
    // targeted email address, which is exactly the enumeration this
    // generic-response pattern already exists to prevent (see below).
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }

  // Always issue a token and respond identically whether or not an account
  // exists for this email — the reset step is where a nonexistent account
  // actually gets rejected, so this never leaks which emails are registered.
  const token = await createResetToken(email);
  const link = resetLinkUrl(token, new URL(request.url).origin);
  const { sent } = await sendEmail({
    to: email,
    subject: "Reset your ResumeProof password",
    text: `Reset your password: ${link}\n\nThis link expires in 30 minutes. If you didn't request this, you can ignore this email.`
  });

  return NextResponse.json({
    ok: true,
    message: sent ? GENERIC_MESSAGE : `Dev mode (no SMTP configured): ${GENERIC_MESSAGE}`,
    devLink: sent ? undefined : link
  });
}
