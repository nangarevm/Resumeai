import { describe, expect, it } from "vitest";
import { parseResume } from "@/lib/parsers/resume-parser";
import { parseJD } from "@/lib/parsers/jd-extractor";
import { buildCareerVault } from "@/lib/engines/career-vault";
import { computeFitReport } from "@/lib/engines/fit-score";
import { buildSkillGapPlan } from "@/lib/engines/skill-gap-plan";
import { detectOpportunities } from "@/lib/engines/opportunity-detector";
import { getMarketSignals } from "@/lib/engines/market-intelligence";
import { scoreResponsibilityMatch } from "@/lib/engines/responsibility-matcher";
import { scoreSoftSkillDimensions } from "@/lib/engines/soft-skill-scorer";

const RESUME = `NAME: Test User
EMAIL: test@example.com
PHONE: +91 99999 99999
SKILLS
Python, Playwright, API testing, CI/CD, Jenkins
WORK EXPERIENCE
Acme | SDET | 2022–Present
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

describe("career optimizer engines", () => {
  it("attach optimizer report to fit score", () => {
    const profile = parseResume("t", RESUME);
    const jd = parseJD("j", JD);
    const vault = buildCareerVault(profile);
    const fit = computeFitReport(profile, jd, vault);
    expect(fit.optimizer).toBeDefined();
    expect(fit.optimizer!.jdMatch.overall).toBe(fit.score);
    expect(fit.optimizer!.careerOpportunityScore).toBeGreaterThan(0);
    expect(fit.optimizer!.skillGapPlan.length).toBeGreaterThan(0);
  });

  it("skill gap plan categorizes strong vs missing", () => {
    const profile = parseResume("t", RESUME);
    const jd = parseJD("j", `${JD}\n- Kubernetes`);
    const plan = buildSkillGapPlan(profile, jd);
    expect(plan.some((p) => p.level === "strong" && p.emoji === "🟢")).toBe(true);
    expect(plan.some((p) => p.level === "missing" && p.emoji === "🔴")).toBe(true);
  });

  it("opportunity detector returns best-fit and adjacent", () => {
    const profile = parseResume("t", RESUME);
    const jd = parseJD("j", JD);
    const vault = buildCareerVault(profile);
    const ops = detectOpportunities(profile, jd, vault, 75);
    expect(ops.some((o) => o.category === "best_fit")).toBe(true);
    expect(ops.length).toBeGreaterThan(1);
  });

  it("market signals resolve SDET family", () => {
    const signals = getMarketSignals("SDET Engineer", "Technology");
    expect(signals.fastGrowing.some((s) => /Playwright/i.test(s))).toBe(true);
  });

  it("responsibility matcher scores duty-line overlap", () => {
    const profile = parseResume("t", RESUME);
    const jd = parseJD(
      "j",
      `${JD}\nRESPONSIBILITIES:\n- Design Playwright API automation frameworks\n- Collaborate with developers on CI/CD pipelines`
    );
    const result = scoreResponsibilityMatch(profile, jd);
    expect(result.totalCount).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThan(0);
    expect(result.highlights.length).toBeGreaterThan(0);
  });

  it("soft-skill dimensions score leadership and communication", () => {
    const profile = parseResume("t", `${RESUME}\n- Led QA team and mentored juniors on stakeholder demos`);
    const jd = parseJD("j", `${JD}\n- Strong communication and leadership required`);
    const dims = scoreSoftSkillDimensions(profile, jd);
    expect(dims.leadershipMatch).toBeGreaterThan(40);
    expect(dims.communicationMatch).toBeGreaterThan(40);
  });
});
