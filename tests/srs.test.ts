import { describe, expect, it } from "vitest";
import { parseResume } from "@/lib/parsers/resume-parser";
import { parseJD } from "@/lib/parsers/jd-extractor";
import { buildCareerVault, approvedEvidence, vaultCompleteness } from "@/lib/engines/career-vault";
import { computeFitReport } from "@/lib/engines/fit-score";
import { generateTailoringSuggestions } from "@/lib/engines/tailoring";
import { scanVerification, hasBlockingFindings } from "@/lib/engines/verification";
import { planCareerChange } from "@/lib/engines/career-change";
import { buildApplicationKit } from "@/lib/engines/application-kit";
import { convertLinkedInProfile } from "@/lib/engines/linkedin-import";
import { applyAcceptedSuggestions } from "@/lib/engines/tailoring";

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
    const health = vaultCompleteness(vault);
    expect(health.percent).toBeGreaterThan(0);
    expect(health.present).toContain("skill");
  });

  it("Fit Score is labeled as an estimate and has sub-scores", () => {
    const profile = parseResume("1", RESUME);
    const jd = parseJD("j", JD);
    const fit = computeFitReport(profile, jd, buildCareerVault(profile));
    expect(fit.disclaimer).toMatch(/not a universal ATS score/i);
    expect(fit.subScores.keywordCoverage).toBeGreaterThan(0);
    expect(fit.parserPreview).toMatch(/Anuja/);
    expect(fit.nextActions.length).toBeGreaterThan(0);
    expect(fit.scoreMovers.length).toBeGreaterThan(0);
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
    expect(plan.plan90).toHaveLength(3);
    expect(plan.thisMonthLearn.join(" ")).toMatch(/Career Vault/i);
  });

  it("application kit includes WhatsApp, thank-you, and referral notes bound to evidence", () => {
    const profile = parseResume("1", RESUME);
    const jd = parseJD("j", JD);
    const kit = buildApplicationKit(profile, jd, buildCareerVault(profile), []);
    expect(kit.whatsappNote).toMatch(/AI\/ML Intern/);
    expect(kit.thankYouNote).toMatch(/thank you/i);
    expect(kit.referralNote).toMatch(/will not claim/i);
  });

  it("job parser infers intern seniority from the title", () => {
    const jd = parseJD("j", JD);
    expect(jd.seniority).toBe("Intern");
  });

  it("LinkedIn paste import never adds facts beyond the paste", () => {
    const paste = `Anuja P
AI/ML student

About
Applied ML projects in Python

Experience
University Lab
Research Intern
Built a disease prediction model in Python

Skills
Python, Machine Learning, SQL`;

    const out = convertLinkedInProfile(paste);
    expect(out.resumeText).toMatch(/Anuja P/);
    expect(out.resumeText).toMatch(/Python/);
    expect(out.resumeText).not.toMatch(/Kubernetes/);
    expect(out.sections).toContain("WORK EXPERIENCE");
  });

  it("tailored draft applies only accepted suggestions", () => {
    const resume = "NAME: Test\nSKILLS:\n- Python\nPROJECTS:\n- Old bullet about Python";
    const suggestions = [
      {
        id: "1",
        original: "Old bullet about Python",
        proposed: "Old bullet about Python (relevant to Machine Learning)",
        evidenceIds: ["ev-1"],
        confidence: 80,
        reason: "test",
        status: "accepted" as const,
        blocked: false
      },
      {
        id: "2",
        original: "",
        proposed: "Do not add Kubernetes",
        evidenceIds: [],
        confidence: 95,
        reason: "blocked",
        status: "pending" as const,
        blocked: true
      }
    ];
    const next = applyAcceptedSuggestions(resume, suggestions);
    expect(next).toMatch(/Machine Learning/);
    expect(next).not.toMatch(/Do not add Kubernetes/);
  });
});
