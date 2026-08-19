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
import { matchExperience, parseJdYears } from "@/lib/engines/experience-matcher";
import { computeOutcomeStats } from "@/lib/engines/outcome-tracker";
import { strengthenBullets } from "@/lib/engines/evidence-rewrite";
import { parseJsonLdJobPosting } from "@/lib/parsers/job-board-fetch";
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

  it("tailoring does not append misleading (relevant to X) on partial automation bullets", () => {
    const resume = `NAME: Vivek
WORK EXPERIENCE
- Developed and maintained a Java BDD UI automation framework (JBehave, Selenium)
SKILLS
- Java, Selenium, API testing`;
    const profile = parseResume("v", resume);
    const jd = parseJD("j", "POSITION: SDET\nMANDATORY REQUIREMENTS:\n- Playwright\n- Python\n");
    const suggestions = generateTailoringSuggestions(profile, jd, buildCareerVault(profile));
    const playwrightSug = suggestions.find((s) => /playwright/i.test(s.reason) && !s.blocked);
    if (playwrightSug) {
      expect(playwrightSug.proposed).not.toMatch(/\(relevant to Playwright\)/i);
      expect(playwrightSug.proposed).not.toMatch(/\(\s*$/);
    }
    expect(suggestions.some((s) => s.blocked && /Python/i.test(s.proposed))).toBe(true);
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
    expect(kit.shortCover).toMatch(/Applying for/);
    expect(kit.referrerChecklist.length).toBeGreaterThan(2);
  });

  it("job parser infers intern seniority from the title", () => {
    const jd = parseJD("j", JD);
    expect(jd.seniority).toBe("Intern");
  });

  it("long unstructured JD extracts core skills instead of every bullet", () => {
    const longJd = `Senior QA Engineer

Responsibilities
- Perform functional, regression, integration, system, smoke, sanity, and exploratory testing across multiple modules
- Validate UI, business workflows, data validation, error handling, and edge cases in production-like environments
- Design and maintain automated test frameworks with reusable page objects and fixtures

Requirements
- Strong experience with Playwright and Selenium
- CI/CD with Jenkins or Azure DevOps
- REST API testing with Postman
- SQL for data validation
- 5+ years QA experience`;

    const jd = parseJD("qa", longJd);
    expect(jd.mandatoryRequirements.length).toBeLessThan(20);
    expect(jd.mandatoryRequirements.some((r) => /playwright/i.test(r.name))).toBe(true);
    expect(jd.responsibilities?.length).toBeGreaterThan(0);
    expect(jd.mandatoryRequirements.some((r) => /Perform functional/i.test(r.name))).toBe(false);
  });

  it("fit score includes apply readiness for skill-heavy QA resume", () => {
    const qaResume = `NAME: Vivek
EMAIL: vivek@example.com
PHONE: +91 9876543210
TECHNICAL SKILLS:
- Playwright, Selenium, Cypress, Postman, Jenkins, Azure DevOps, Java, TypeScript, SQL, Jira, Agile
WORK EXPERIENCE:
- QA Engineer at Acme — built Playwright UI and API automation in CI/CD pipelines
EDUCATION:
- B.Tech Computer Science`;

    const jd = parseJD(
      "qa",
      `Senior QA Engineer
Requirements
- Playwright
- Selenium
- API testing
- Jenkins
- SQL
- 5+ years experience`
    );
    const fit = computeFitReport(parseResume("v", qaResume), jd, buildCareerVault(parseResume("v", qaResume)));
    expect(fit.jdInsight.coreSkillCount).toBeLessThan(15);
    expect(fit.coreMatches.length).toBeGreaterThan(2);
    expect(fit.applyReadiness).toBeDefined();
    expect(fit.applyReadiness.checklist.length).toBeGreaterThan(0);
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

  it("experience matcher compares JD years to resume dates", () => {
    const resume = `NAME: Vivek
WORK EXPERIENCE:
QA Engineer — Acme
Jan 2019 - Present
- Playwright automation`;
    const jd = parseJD("j", "Senior QA\n5-8 years experience required\nPlaywright");
    const m = matchExperience(parseResume("v", resume), jd);
    expect(parseJdYears(jd).min).toBe(5);
    expect(m.resumeYears).toBeGreaterThan(0);
    expect(["meets", "under", "over", "unknown"]).toContain(m.status);
  });

  it("outcome tracker aggregates interview rate by fit band", () => {
    const stats = computeOutcomeStats([
      {
        id: "1",
        jobId: "j",
        jobTitle: "QA",
        company: "Co",
        status: "Interview",
        notes: "",
        savedAt: "",
        fitScore: 72,
        fitBand: "60–79 Promising"
      },
      {
        id: "2",
        jobId: "j2",
        jobTitle: "Dev",
        company: "Co",
        status: "Rejected",
        notes: "",
        savedAt: "",
        fitScore: 30,
        fitBand: "0–39 Early"
      }
    ]);
    expect(stats.totals.applications).toBe(2);
    expect(stats.byBand["60–79 Promising"]?.interview).toBe(1);
  });

  it("evidence rewrite does not add new tool names", () => {
    const profile = parseResume(
      "v",
      `NAME: T
SKILLS: Playwright
WORK EXPERIENCE:
- Built regression suites with Playwright for checkout flows`
    );
    const jd = parseJD("j", "POSITION: QA\nMANDATORY:\n- Playwright");
    const vault = buildCareerVault(profile);
    const rw = strengthenBullets(profile, jd, vault);
    expect(rw.length).toBeGreaterThan(0);
    expect(rw[0].rewritten.toLowerCase()).toMatch(/playwright/);
    expect(rw[0].rewritten.toLowerCase()).not.toMatch(/kubernetes/);
  });

  it("JSON-LD job parser extracts title from HTML", () => {
    const html = `<script type="application/ld+json">{"@type":"JobPosting","title":"QA Engineer","description":"<p>Playwright required</p>","hiringOrganization":{"name":"Acme"}}</script>`;
    const r = parseJsonLdJobPosting(html);
    expect(r?.title).toBe("QA Engineer");
    expect(r?.text).toMatch(/Playwright/);
  });
});
