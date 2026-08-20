import { NextResponse } from "next/server";
import { verifyResetToken } from "@/lib/auth/password-reset";
import { setPassword } from "@/lib/auth/accounts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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
