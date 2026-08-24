import { describe, expect, it } from "vitest";
import { looksLikeScannedPdf } from "@/lib/parsers/pdf-quality";

describe("looksLikeScannedPdf", () => {
  it("flags completely empty extracted text", () => {
    expect(looksLikeScannedPdf("")).toBe(true);
  });

  it("flags whitespace-only extracted text", () => {
    expect(looksLikeScannedPdf("   \n\n   \t  ")).toBe(true);
  });

  it("flags a handful of stray characters (typical of embedded-metadata noise)", () => {
    expect(looksLikeScannedPdf("...  ---  ")).toBe(true);
  });

  it("does not flag a real extracted resume's worth of text", () => {
    const text = `NAME: Jane Doe
EMAIL: jane@example.com
PHONE: 555-1212

WORK EXPERIENCE
Acme Corp, Software Engineer, 2022-Present
- Built a real feature that shipped to production
- Led a migration project

SKILLS
Python, TypeScript, SQL`;
    expect(looksLikeScannedPdf(text)).toBe(false);
  });

  it("does not flag a short but still meaningful single line", () => {
    expect(looksLikeScannedPdf("NAME: Jane Doe EMAIL: jane@example.com PHONE: 555-1212")).toBe(false);
  });
});
