import { NextResponse } from "next/server";
import { createMagicToken, magicLinkUrl } from "@/lib/auth/magic-link";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const token = await createMagicToken(email);
  const link = magicLinkUrl(token, new URL(request.url).origin);
  const isDev = process.env.NODE_ENV !== "production" || !process.env.SMTP_HOST;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return NextResponse.json(
      {
        error:
          "SMTP is configured but email delivery is not enabled in this build. Use the dev link below or GitHub OAuth."
      },
      { status: 501 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: isDev ? "Dev mode: use the link below (no SMTP configured)." : "Magic link generated.",
    devLink: isDev ? link : undefined
  });
}
