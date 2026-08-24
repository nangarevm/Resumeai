import { SignJWT, jwtVerify } from "jose";

function secretKey(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET || "resumeproof-dev-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

// Same JWT-token pattern as magic-link.ts, but with its own `purpose` claim
// so a password-reset token can never be replayed as a sign-in token (or
// vice versa) even though both are signed with the same secret.
const PURPOSE = "password-reset";

export async function createResetToken(email: string): Promise<string> {
  const normalized = email.toLowerCase().trim();
  return await new SignJWT({ email: normalized, purpose: PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(secretKey());
}

export async function verifyResetToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.purpose !== PURPOSE) return null;
    const email = payload.email;
    return typeof email === "string" ? email : null;
  } catch {
    return null;
  }
}

export function resetLinkUrl(token: string, baseUrl?: string): string {
  const origin = baseUrl || process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${origin}/login?resetToken=${encodeURIComponent(token)}`;
}
