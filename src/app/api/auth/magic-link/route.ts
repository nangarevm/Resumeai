import { NextResponse } from "next/server";
import { createMagicToken, magicLinkUrl } from "@/lib/auth/magic-link";
import { sendEmail } from "@/lib/auth/email";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
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
