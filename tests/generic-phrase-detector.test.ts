import { describe, expect, it } from "vitest";
import { detectGenericPhrases } from "@/lib/engines/generic-phrase-detector";

describe("detectGenericPhrases", () => {
  it("flags a known resume cliché with the offending phrase and line", () => {
    const resume = `SUMMARY
Results-driven software engineer with a passion for building things.`;
    const findings = detectGenericPhrases(resume);
    expect(findings.some((f) => f.phrase === "results-driven")).toBe(true);
    expect(findings.find((f) => f.phrase === "results-driven")?.line).toContain("Results-driven software engineer");
  });

  it("flags multiple distinct clichés on different lines", () => {
    const resume = `SUMMARY
Hardworking team player with a proven track record of success.`;
    const findings = detectGenericPhrases(resume);
    const phrases = findings.map((f) => f.phrase);
    expect(phrases).toContain("hardworking");
    expect(phrases).toContain("team player");
    expect(phrases).toContain("proven track record");
  });

  it("does not flag specific, evidenced language", () => {
    const resume = `SUMMARY
Flutter Developer with 2+ years building cross-platform apps used by 10,000+ users.`;
    const findings = detectGenericPhrases(resume);
    expect(findings.length).toBe(0);
  });

  it("deduplicates the same phrase repeated on the same line", () => {
    const resume = `SUMMARY
A hardworking, hardworking professional.`;
    const findings = detectGenericPhrases(resume);
    expect(findings.filter((f) => f.phrase === "hardworking").length).toBe(1);
  });

  it("returns an empty array for text with no clichés", () => {
    const resume = `SUMMARY\nBuilt and shipped three production Flutter apps.`;
    expect(detectGenericPhrases(resume)).toEqual([]);
  });
});
