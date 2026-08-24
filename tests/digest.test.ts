import { describe, expect, it } from "vitest";
import { computeDigestContent } from "@/lib/engines/digest";
import { parseResume } from "@/lib/parsers/resume-parser";
import { buildCareerVault } from "@/lib/engines/career-vault";
import { computeResumeHealth } from "@/lib/engines/resume-health";
import type { SeekerWorkspace } from "@/lib/srs-models";

function makeSeeker(resumeText: string): SeekerWorkspace {
  const profile = parseResume("t1", resumeText);
  const vault = buildCareerVault(profile);
  return {
    profile,
    vault,
    versions: [],
    applications: [],
    activeJob: null,
    fit: null,
    suggestions: [],
    findings: []
  };
}

const RESUME = `NAME: Jane Doe
EMAIL: jane@example.com
PHONE: 555-1212

WORK EXPERIENCE
Acme Corp, Senior Engineer, 2022-Present
- Built a real feature that shipped to production, cutting load time by 30%

SKILLS
Python, TypeScript, SQL`;

describe("computeDigestContent", () => {
  it("returns null when no resume has been saved yet", () => {
    const seeker = makeSeeker("");
    expect(computeDigestContent(seeker, null)).toBeNull();
  });

  it("includes the current health percent with no delta line on the first-ever digest", () => {
    const seeker = makeSeeker(RESUME);
    const content = computeDigestContent(seeker, null);
    expect(content).not.toBeNull();
    expect(content!.text).toMatch(/Career Vault is \d+% complete/);
    expect(content!.text).not.toMatch(/since your last digest/);
    expect(content!.subject).toContain(`${content!.healthPercent}%`);
  });

  it("reports an upward delta when health improved since the last digest", () => {
    const seeker = makeSeeker(RESUME);
    const content = computeDigestContent(seeker, Math.max(0, computeDigestContent(seeker, null)!.healthPercent - 10));
    expect(content!.text).toMatch(/up \d+ points? since your last digest/);
  });

  it("reports a downward delta when health dropped since the last digest", () => {
    const seeker = makeSeeker(RESUME);
    const content = computeDigestContent(seeker, computeDigestContent(seeker, null)!.healthPercent + 10);
    expect(content!.text).toMatch(/down \d+ points? since your last digest/);
  });

  it("reports no change when the percent is identical to last time", () => {
    const seeker = makeSeeker(RESUME);
    const first = computeDigestContent(seeker, null)!;
    const content = computeDigestContent(seeker, first.healthPercent);
    expect(content!.text).toContain("No change since your last digest.");
  });

  it("never invents an improvement suggestion not already produced by resume-health", () => {
    const seeker = makeSeeker(RESUME);
    const content = computeDigestContent(seeker, null)!;
    const health = computeResumeHealth(seeker.profile, seeker.vault, seeker.fit);
    const bulletLines = content.text.split("\n").filter((l) => l.startsWith("- ")).map((l) => l.slice(2));
    for (const line of bulletLines) {
      expect(health.topImprovements).toContain(line);
    }
  });
});
