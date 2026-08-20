import { NextResponse } from "next/server";
import { createAccount } from "@/lib/auth/accounts";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_email: "Enter a valid email address.",
  weak_password: "Password must be at least 8 characters.",
  already_registered: "An account with that email already exists — sign in instead."
};

export async function POST(request: Request) {
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
