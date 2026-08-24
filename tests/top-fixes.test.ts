import { describe, expect, it } from "vitest";
import { computeTopFixes } from "@/lib/engines/top-fixes";
import { parseResume } from "@/lib/parsers/resume-parser";
import { buildCareerVault } from "@/lib/engines/career-vault";

const WEAK_RESUME = `NAME: Weak Resume
Just a short line with no real structure.`;

const STRONG_RESUME = `NAME: Strong Candidate
EMAIL: strong@example.com
PHONE: +1 555 0100

SUMMARY
Senior software engineer with 6 years of experience shipping production systems.

SKILLS
Python, SQL, AWS, Kubernetes, Terraform, PostgreSQL, Docker, CI/CD, React, TypeScript

WORK EXPERIENCE
Acme Corp, Senior Engineer, 2020-Present
- Led the migration of the payments platform to Kubernetes, cutting deploy time by 40 percent
- Owned a 2 million dollar annual cloud infrastructure budget across three teams
- Mentored four junior engineers, two of whom were promoted within a year
- Reduced API p99 latency from 800ms to 120ms through careful query optimization work
- Designed the on-call rotation system that was later adopted company-wide

Beta Health, Software Engineer, 2017-2020
- Built the core billing reconciliation service handling millions of transactions monthly
- Partnered with product and design to ship the self-serve onboarding flow
- Wrote the incident response runbook still used by the team today

PROJECTS
- Internal deployment tool used daily by more than thirty engineers across the org

EDUCATION
- B.S. Computer Science, State University, 2017

CERTIFICATIONS
- AWS Certified Solutions Architect, Professional level, earned in 2021`;

describe("computeTopFixes", () => {
  it("surfaces the highest-weight failing ATS checks first, capped at 3", () => {
    const profile = parseResume("weak", WEAK_RESUME);
    const vault = buildCareerVault(profile);
    const fixes = computeTopFixes(profile, vault, null);
    expect(fixes.length).toBeLessThanOrEqual(3);
    expect(fixes.length).toBeGreaterThan(0);
    // Contact details and Standard headings are both weight-15 failures for
    // this resume and should outrank the weight-10 checks.
    const titles = fixes.map((f) => f.title);
    expect(titles).toContain("Contact details");
  });

  it("gives each fix a specific, non-empty detail string (not a placeholder)", () => {
    const profile = parseResume("weak2", WEAK_RESUME);
    const vault = buildCareerVault(profile);
    const fixes = computeTopFixes(profile, vault, null);
    for (const fix of fixes) {
      expect(fix.detail.length).toBeGreaterThan(10);
      expect(fix.id).toBeTruthy();
    }
  });

  it("falls back to resume-health suggestions when ATS checks all pass", () => {
    const profile = parseResume("strong", STRONG_RESUME);
    const vault = buildCareerVault(profile);
    const fixes = computeTopFixes(profile, vault, null);
    // A resume this complete should have no failing ATS checks at all —
    // any fixes present must come from the health-level fallback instead.
    for (const fix of fixes) {
      expect(fix.id.startsWith("ats-")).toBe(false);
    }
  });

  it("never returns more than 3 fixes even with many problems", () => {
    const profile = parseResume("terrible", "NAME: X");
    const vault = buildCareerVault(profile);
    const fixes = computeTopFixes(profile, vault, null);
    expect(fixes.length).toBeLessThanOrEqual(3);
  });

  it("does not duplicate a health suggestion that repeats an already-listed ATS fix", () => {
    const profile = parseResume("weak3", WEAK_RESUME);
    const vault = buildCareerVault(profile);
    const fixes = computeTopFixes(profile, vault, null);
    const titles = fixes.map((f) => f.title.toLowerCase());
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(titles.length);
  });
});
