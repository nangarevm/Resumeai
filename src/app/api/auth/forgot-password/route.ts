import { NextResponse } from "next/server";
import { createResetToken, resetLinkUrl } from "@/lib/auth/password-reset";
import { sendEmail } from "@/lib/auth/email";

export const dynamic = "force-dynamic";

const GENERIC_MESSAGE = "If an account exists for that email, a password reset link has been sent.";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
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
