import { describe, expect, it } from "vitest";
import { createShare, getActiveShareForUser, getShareByToken, revokeShare } from "@/lib/shares";
import { redactContactInfo } from "@/lib/engines/share-redaction";

describe("shares (public review links)", () => {
  it("creates a share and looks it up by token", () => {
    const share = createShare("user-a", "NAME: A\nEMAIL: a@test.com\nSUMMARY\nHello.");
    const found = getShareByToken(share.token);
    expect(found?.userId).toBe("user-a");
    expect(found?.snapshot).toContain("Hello.");
  });

  it("uses a long, unguessable token", () => {
    const share = createShare("user-b", "NAME: B");
    expect(share.token.length).toBeGreaterThanOrEqual(24);
  });

  it("creating a new share for the same user replaces the old one", () => {
    const first = createShare("user-c", "NAME: C v1");
    const second = createShare("user-c", "NAME: C v2");
    expect(getShareByToken(first.token)).toBeNull();
    expect(getShareByToken(second.token)?.snapshot).toContain("C v2");
  });

  it("getActiveShareForUser finds the current share for that user only", () => {
    createShare("user-d", "NAME: D");
    createShare("user-e", "NAME: E");
    expect(getActiveShareForUser("user-d")?.snapshot).toContain("D");
    expect(getActiveShareForUser("user-e")?.snapshot).toContain("E");
    expect(getActiveShareForUser("user-nobody")).toBeNull();
  });

  it("revoking a share removes it from both lookups", () => {
    const share = createShare("user-f", "NAME: F");
    expect(revokeShare("user-f")).toBe(true);
    expect(getShareByToken(share.token)).toBeNull();
    expect(getActiveShareForUser("user-f")).toBeNull();
  });

  it("revoking a user with no active share returns false", () => {
    expect(revokeShare("user-never-shared")).toBe(false);
  });

  it("an unknown token returns null, same as an expired one would", () => {
    expect(getShareByToken("not-a-real-token")).toBeNull();
  });
});

describe("redactContactInfo", () => {
  it("replaces the extracted email and phone, leaving everything else intact", () => {
    const resume = "NAME: Jordan Lee\nEMAIL: jordan@example.com\nPHONE: +1 555 0100\nSUMMARY\nSoftware engineer.";
    const redacted = redactContactInfo(resume);
    expect(redacted).not.toContain("jordan@example.com");
    expect(redacted).not.toContain("+1 555 0100");
    expect(redacted).toContain("Jordan Lee");
    expect(redacted).toContain("Software engineer.");
    expect(redacted).toContain("(hidden for this shared link)");
  });

  it("leaves the text unchanged when no email/phone was extracted", () => {
    const resume = "NAME: No Contact Info\nSUMMARY\nJust a summary.";
    expect(redactContactInfo(resume)).toBe(resume);
  });
});
