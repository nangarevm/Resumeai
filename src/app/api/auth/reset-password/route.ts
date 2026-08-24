import { NextResponse } from "next/server";
import { verifyResetToken } from "@/lib/auth/password-reset";
import { setPassword } from "@/lib/auth/accounts";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

// The token itself is an unguessable signed JWT, so this is defense-in-depth
// against endpoint spam/DoS rather than a meaningful brute-force barrier.
const IP_MAX_ATTEMPTS = 20;
const IP_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const limit = checkRateLimit(`reset-password:${getClientIp(request)}`, IP_MAX_ATTEMPTS, IP_WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).` },
      { status: 429 }
    );
  }

  const body = (await request.json()) as { token?: string; password?: string };
  if (!body.token || !body.password) {
    return NextResponse.json({ error: "Missing token or new password." }, { status: 400 });
  }

  const email = await verifyResetToken(body.token);
  if (!email) {
    return NextResponse.json({ error: "This reset link is invalid or has expired. Request a new one." }, { status: 400 });
  }

  const ok = await setPassword(email, body.password);
  if (!ok) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters, and this email must already have an account." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, email });
}
