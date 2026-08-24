import { describe, expect, it } from "vitest";
import { createAccount, verifyCredentials, findAccountByEmail, setPassword } from "@/lib/auth/accounts";
import { createResetToken, verifyResetToken } from "@/lib/auth/password-reset";
import { createMagicToken, verifyMagicToken } from "@/lib/auth/magic-link";

describe("accounts (email/password)", () => {
  it("creates an account, then verifies correct and rejects incorrect credentials", async () => {
    const email = `test-${Date.now()}@example.com`;
    const created = await createAccount(email, "correct-horse-battery");
    expect(typeof created).not.toBe("string");

    const ok = await verifyCredentials(email, "correct-horse-battery");
    expect(ok?.email).toBe(email.toLowerCase());

    const bad = await verifyCredentials(email, "wrong-password");
    expect(bad).toBeNull();
  });

  it("rejects registering the same email twice", async () => {
    const email = `dupe-${Date.now()}@example.com`;
    await createAccount(email, "correct-horse-battery");
    const second = await createAccount(email, "another-password");
    expect(second).toBe("already_registered");
  });

  it("rejects an invalid email and a too-short password", async () => {
    expect(await createAccount("not-an-email", "correct-horse-battery")).toBe("invalid_email");
    expect(await createAccount(`short-${Date.now()}@example.com`, "abc")).toBe("weak_password");
  });

  it("setPassword updates credentials for an existing account and rejects for a nonexistent one", async () => {
    const email = `reset-${Date.now()}@example.com`;
    await createAccount(email, "original-password");

    const changed = await setPassword(email, "new-password-123");
    expect(changed).toBe(true);
    expect(await verifyCredentials(email, "new-password-123")).not.toBeNull();
    expect(await verifyCredentials(email, "original-password")).toBeNull();

    const noAccount = await setPassword(`ghost-${Date.now()}@example.com`, "new-password-123");
    expect(noAccount).toBe(false);
  });

  it("findAccountByEmail returns null for an unregistered email", async () => {
    expect(await findAccountByEmail(`nobody-${Date.now()}@example.com`)).toBeNull();
  });
});

describe("password-reset tokens", () => {
  it("round-trips a valid token and rejects a tampered one", async () => {
    const token = await createResetToken("Reset@Example.com");
    expect(await verifyResetToken(token)).toBe("reset@example.com");
    expect(await verifyResetToken(`${token}x`)).toBeNull();
  });

  it("a magic-link sign-in token cannot be used as a password-reset token", async () => {
    const signInToken = await createMagicToken("user@example.com");
    expect(await verifyResetToken(signInToken)).toBeNull();
  });

  it("a password-reset token still carries a verifiable email claim", async () => {
    // verifyMagicToken doesn't check `purpose`, but it does require the
    // `email` claim, which the reset token also carries — the real
    // cross-purpose protection lives in verifyResetToken's purpose check
    // (tested above). This documents that magic-link verification has no
    // separate protection of its own — by design, since a password-reset
    // token proves the same "controls this email" fact.
    const resetToken = await createResetToken("user@example.com");
    expect(await verifyMagicToken(resetToken)).toBe("user@example.com");
  });
});
