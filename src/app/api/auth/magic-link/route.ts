import { NextResponse } from "next/server";
import { createMagicToken, magicLinkUrl } from "@/lib/auth/magic-link";
import { sendEmail } from "@/lib/auth/email";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

// Same reasoning as forgot-password: per-email stops inbox-bombing one
// target, per-IP stops working through many targets from one client.
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

  const ipLimit = checkRateLimit(`magic-link-ip:${getClientIp(request)}`, IP_MAX_ATTEMPTS, IP_WINDOW_MS);
  const emailLimit = checkRateLimit(`magic-link-email:${email.toLowerCase()}`, EMAIL_MAX_ATTEMPTS, EMAIL_WINDOW_MS);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    return NextResponse.json({
      ok: true,
      message: "If an account can sign in with that email, a link has been sent."
    });
  }

  const token = await createMagicToken(email);
  const link = magicLinkUrl(token, new URL(request.url).origin);
  const { sent } = await sendEmail({
    to: email,
    subject: "Your ResumeProof sign-in link",
    text: `Sign in to ResumeProof: ${link}\n\nThis link expires in 15 minutes. If you didn't request it, you can ignore this email.`
  });

  return NextResponse.json({
    ok: true,
    message: sent ? "Magic link sent — check your email." : "Dev mode: use the link below (no SMTP configured).",
    devLink: sent ? undefined : link
  });
}
