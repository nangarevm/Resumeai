import { describe, expect, it } from "vitest";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { POST as registerPost } from "@/app/api/auth/register/route";
import { POST as forgotPasswordPost } from "@/app/api/auth/forgot-password/route";
import { POST as magicLinkPost } from "@/app/api/auth/magic-link/route";
import { authOptions } from "@/lib/auth/config";
import { createAccount } from "@/lib/auth/accounts";

// NextAuth's CredentialsProvider() factory normalizes the outer .id to
// "credentials" for every credentials provider — the custom id we set
// ("password") survives only under .options.id.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const passwordProvider = authOptions.providers.find((p: any) => p.options?.id === "password") as any;

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

describe("checkRateLimit (core limiter)", () => {
  it("allows attempts up to the max, then blocks", () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(key, 3, 60000).allowed).toBe(true);
    }
    const blocked = checkRateLimit(key, 3, 60000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", () => {
    const keyA = `a-${Date.now()}-${Math.random()}`;
    const keyB = `b-${Date.now()}-${Math.random()}`;
    checkRateLimit(keyA, 1, 60000);
    expect(checkRateLimit(keyA, 1, 60000).allowed).toBe(false);
    expect(checkRateLimit(keyB, 1, 60000).allowed).toBe(true);
  });

  it("resets after the window expires", async () => {
    const key = `window-${Date.now()}-${Math.random()}`;
    expect(checkRateLimit(key, 1, 50).allowed).toBe(true);
    expect(checkRateLimit(key, 1, 50).allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 70));
    expect(checkRateLimit(key, 1, 50).allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("reads x-forwarded-for, taking the first address", () => {
    const req = new Request("http://localhost/x", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip, then unknown", () => {
    const req1 = new Request("http://localhost/x", { headers: { "x-real-ip": "9.9.9.9" } });
    expect(getClientIp(req1)).toBe("9.9.9.9");
    const req2 = new Request("http://localhost/x");
    expect(getClientIp(req2)).toBe("unknown");
  });
});

describe("password login rate limiting (authorize)", () => {
  it("blocks after 5 failed attempts for the same email, even with a correct password", async () => {
    const email = uniqueEmail("login");
    await createAccount(email, "correct-horse-battery");

    for (let i = 0; i < 5; i++) {
      const result = await passwordProvider.options.authorize({ email, password: "wrong-password" });
      expect(result).toBeNull();
    }

    // The 6th attempt is blocked before credentials are even checked — even
    // the CORRECT password is rejected, proving this is a hard block, not
    // just "still counting failures".
    await expect(passwordProvider.options.authorize({ email, password: "correct-horse-battery" })).rejects.toThrow("rate_limited");
  });

  it("a different email is not affected by another email's rate limit", async () => {
    const emailA = uniqueEmail("login-a");
    const emailB = uniqueEmail("login-b");
    await createAccount(emailA, "correct-horse-battery");
    await createAccount(emailB, "correct-horse-battery");

    for (let i = 0; i < 5; i++) {
      await passwordProvider.options.authorize({ email: emailA, password: "wrong" });
    }
    await expect(passwordProvider.options.authorize({ email: emailA, password: "correct-horse-battery" })).rejects.toThrow("rate_limited");

    // B's own attempt still succeeds normally.
    const resultB = await passwordProvider.options.authorize({ email: emailB, password: "correct-horse-battery" });
    expect(resultB?.email).toBe(emailB.toLowerCase());
  });
});

describe("POST /api/auth/register rate limiting", () => {
  it("blocks after 5 attempts from the same IP within the window", async () => {
    const ip = `10.0.0.${Math.floor(Math.random() * 255)}`;
    let lastStatus = 0;
    for (let i = 0; i < 6; i++) {
      const res = await registerPost(
        new Request("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
          body: JSON.stringify({ email: uniqueEmail("reg"), password: "correct-horse-battery" })
        })
      );
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });

  it("a different IP is not affected by another IP's rate limit", async () => {
    const res = await registerPost(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": `10.1.1.${Math.floor(Math.random() * 255)}` },
        body: JSON.stringify({ email: uniqueEmail("fresh"), password: "correct-horse-battery" })
      })
    );
    expect(res.status).toBe(200);
  });
});

describe("POST /api/auth/forgot-password rate limiting", () => {
  it("still returns the generic ok response once rate limited (no oracle)", async () => {
    const email = uniqueEmail("forgot");
    const ip = `10.2.2.${Math.floor(Math.random() * 255)}`;
    let last: Response | null = null;
    for (let i = 0; i < 4; i++) {
      last = await forgotPasswordPost(
        new Request("http://localhost/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
          body: JSON.stringify({ email })
        })
      );
    }
    expect(last!.status).toBe(200);
    const data = await last!.json();
    expect(data.message).toMatch(/if an account exists/i);
  });
});

describe("POST /api/auth/magic-link rate limiting", () => {
  it("blocks after 3 attempts for the same email within the window", async () => {
    const email = uniqueEmail("magic");
    const ip = `10.3.3.${Math.floor(Math.random() * 255)}`;
    const responses: Array<{ message: string }> = [];
    for (let i = 0; i < 4; i++) {
      const res = await magicLinkPost(
        new Request("http://localhost/api/auth/magic-link", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
          body: JSON.stringify({ email })
        })
      );
      responses.push(await res.json());
    }
    // First 3 get the real (dev-mode) response with a devLink; the 4th is
    // silently swapped for the generic rate-limited message with no link.
    expect(responses[3].message).toMatch(/if an account can sign in/i);
  });
});
