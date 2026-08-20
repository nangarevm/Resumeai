import { describe, expect, it } from "vitest";
import { parseResume } from "@/lib/parsers/resume-parser";
import { parseJD } from "@/lib/parsers/jd-extractor";
import { buildCareerVault } from "@/lib/engines/career-vault";
import { computeFitReport } from "@/lib/engines/fit-score";
import { computeResumeHealth } from "@/lib/engines/resume-health";

const RESUME = `NAME: Test User
EMAIL: test@example.com
PHONE: +91 99999 99999
SKILLS
Python, Playwright, API testing, CI/CD, Jenkins
WORK EXPERIENCE
Acme | SDET | 2022-Present
- Built Playwright API automation reducing regression time 40%
EDUCATION
B.Tech CS`;

const JD = `POSITION: SDET
COMPANY: Test Corp
MANDATORY REQUIREMENTS:
- Python
- Playwright
- API testing
- CI/CD`;

describe("computeResumeHealth", () => {
  it("scores all 7 categories and computes a single overall number without a target job", () => {
    const profile = parseResume("t", RESUME);
    const vault = buildCareerVault(profile);
    const health = computeResumeHealth(profile, vault, null);
    expect(health.categories).toHaveLength(7);
    expect(health.overall).toBeGreaterThan(0);
    expect(health.overall).toBeLessThanOrEqual(100);
  });

  it("marks JD-dependent categories as unavailable (not faked) without a target job", () => {
    const profile = parseResume("t", RESUME);
    const vault = buildCareerVault(profile);
    const health = computeResumeHealth(profile, vault, null);
    const alignment = health.categories.find((c) => c.key === "alignment")!;
    const keywords = health.categories.find((c) => c.key === "keywords")!;
    expect(alignment.score).toBeNull();
    expect(keywords.score).toBeNull();
    expect(alignment.note).toMatch(/add a target job/i);
    expect(health.categoriesScored).toBeLessThan(health.categoriesTotal);
  });

  it("fills in JD-dependent categories once a fit report is available", () => {
    const profile = parseResume("t", RESUME);
    const jd = parseJD("j", JD);
    const vault = buildCareerVault(profile);
    const fit = computeFitReport(profile, jd, vault);
    const health = computeResumeHealth(profile, vault, fit);
    const alignment = health.categories.find((c) => c.key === "alignment")!;
    const keywords = health.categories.find((c) => c.key === "keywords")!;
    expect(alignment.score).not.toBeNull();
    expect(keywords.score).not.toBeNull();
    expect(health.categoriesScored).toBe(health.categoriesTotal);
  });

  it("never counts an unavailable category toward the overall average", () => {
    const profile = parseResume("t", RESUME);
    const vault = buildCareerVault(profile);
    const health = computeResumeHealth(profile, vault, null);
    const scoredValues = health.categories.filter((c) => c.score !== null).map((c) => c.score as number);
    const expectedOverall = Math.round(scoredValues.reduce((a, b) => a + b, 0) / scoredValues.length);
    expect(health.overall).toBe(expectedOverall);
  });

  it("surfaces top improvements only for categories scoring below 70", () => {
    const profile = parseResume("t", "NAME: Empty Resume\nEMAIL: empty@example.com");
    const vault = buildCareerVault(profile);
    const health = computeResumeHealth(profile, vault, null);
    expect(health.topImprovements.length).toBeGreaterThan(0);
    expect(health.topImprovements.length).toBeLessThanOrEqual(5);
  });
});
