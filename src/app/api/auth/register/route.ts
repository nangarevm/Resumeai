import { NextResponse } from "next/server";
import { createAccount } from "@/lib/auth/accounts";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_email: "Enter a valid email address.",
  weak_password: "Password must be at least 8 characters.",
  already_registered: "An account with that email already exists — sign in instead."
};

// By IP, not email — the harm here is mass account creation / signup spam,
// which is an IP-level pattern rather than a single-target attack.
const REGISTER_MAX_ATTEMPTS = 5;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  const limit = checkRateLimit(`register:${getClientIp(request)}`, REGISTER_MAX_ATTEMPTS, REGISTER_WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Too many signup attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).` },
      { status: 429 }
    );
  }

  const body = (await request.json()) as { email?: string; password?: string };
  if (!body.email || !body.password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const result = await createAccount(body.email, body.password);
  if (typeof result === "string") {
    return NextResponse.json({ error: ERROR_MESSAGES[result] }, { status: 400 });
  }

  return NextResponse.json({ ok: true, email: result.email });
}
