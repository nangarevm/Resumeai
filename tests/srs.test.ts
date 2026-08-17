import { describe, expect, it } from "vitest";
import { parseResume } from "@/lib/parsers/resume-parser";
import { parseJD } from "@/lib/parsers/jd-extractor";
import { buildCareerVault, approvedEvidence } from "@/lib/engines/career-vault";
import { computeFitReport } from "@/lib/engines/fit-score";
import { generateTailoringSuggestions } from "@/lib/engines/tailoring";
import { scanVerification, hasBlockingFindings } from "@/lib/engines/verification";
import { planCareerChange } from "@/lib/engines/career-change";

const RESUME = `NAME: Anuja P
EMAIL: anuja@example.com
PHONE: +91 111
PREFERRED ROLE: AI/ML Intern
TECHNICAL SKILLS:
- Python, SQL, Machine Learning
PROJECTS:
- Disease Prediction System using Machine Learning
  Developed a disease prediction system using machine learning algorithms in Python.`;

const JD = `POSITION: AI/ML Intern
MANDATORY REQUIREMENTS:
- Python
- Machine Learning
PREFERRED REQUIREMENTS:
- SQL`;

describe("SRS v2 candidate engines", () => {
  it("Career Vault stores typed evidence from the resume", () => {
    const profile = parseResume("1", RESUME);
    const vault = buildCareerVault(profile, "AI/ML Intern", "Internship");
    expect(approvedEvidence(vault).length).toBeGreaterThan(2);
    expect(vault.evidence.some((e) => e.type === "skill")).toBe(true);
    expect(vault.evidence.some((e) => e.type === "project")).toBe(true);
  });

  it("Fit Score is labeled as an estimate and has sub-scores", () => {
    const profile = parseResume("1", RESUME);
    const jd = parseJD("j", JD);
    const fit = computeFitReport(profile, jd, buildCareerVault(profile));
    expect(fit.disclaimer).toMatch(/not a universal ATS score/i);
    expect(fit.subScores.keywordCoverage).toBeGreaterThan(0);
    expect(fit.parserPreview).toMatch(/Anuja/);
  });

  it("tailoring blocks requirements with no evidence", () => {
    const profile = parseResume("1", RESUME);
    const jd = parseJD(
      "j",
      "POSITION: Staff\nMANDATORY REQUIREMENTS:\n- Kubernetes\n- Python\n"
    );
    const suggestions = generateTailoringSuggestions(profile, jd, buildCareerVault(profile));
    expect(suggestions.some((s) => s.blocked && /Kubernetes/i.test(s.proposed))).toBe(true);
  });

  it("verification flags invented metrics not in the vault", () => {
    const profile = parseResume("1", RESUME);
    const vault = buildCareerVault(profile);
    const findings = scanVerification(
      "Grew revenue 400% as VP of Engineering across three continents.",
      vault,
      profile
    );
    expect(findings.length).toBeGreaterThan(0);
    expect(hasBlockingFindings(findings)).toBe(true);
  });

  it("career change does not invent missing skills", () => {
    const vault = buildCareerVault(parseResume("1", RESUME));
    const plan = planCareerChange(vault, "product manager");
    expect(plan.missing.length).toBeGreaterThan(0);
    expect(plan.truthfulFraming.join(" ")).toMatch(/Do not write/i);
  });
});
