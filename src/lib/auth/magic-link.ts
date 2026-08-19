import { SignJWT, jwtVerify } from "jose";

function secretKey(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET || "resumeproof-dev-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

export async function createMagicToken(email: string): Promise<string> {
  const normalized = email.toLowerCase().trim();
  return await new SignJWT({ email: normalized })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secretKey());
}

export async function verifyMagicToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const email = payload.email;
    return typeof email === "string" ? email : null;
  } catch {
    return null;
  }
}

export function magicLinkUrl(token: string, baseUrl?: string): string {
  const origin = baseUrl || process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${origin}/login?token=${encodeURIComponent(token)}`;
}
