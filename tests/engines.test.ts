import { describe, expect, it } from "vitest";
import { classifyContext } from "@/lib/engines/context-engine";
import { extractEvidence, findEvidenceForRequirement } from "@/lib/engines/evidence-engine";
import { evaluateCandidate } from "@/lib/engines/mode-evaluator";
import { rankCandidates } from "@/lib/engines/ranking-engine";
import { parseResume } from "@/lib/parsers/resume-parser";
import { createRequirement, parseJD } from "@/lib/parsers/jd-extractor";
import { optimizeResume } from "@/lib/engines/resume-optimizer";
import { scoreAts } from "@/lib/engines/ats-score-engine";
import { generateCoverLetter } from "@/lib/engines/cover-letter-engine";
import { validateTimeline } from "@/lib/engines/timeline-validator";

const SAMPLE_JD = `POSITION: AI/ML Intern

MANDATORY REQUIREMENTS:
- Python
- Machine Learning
- At least 1 AI/ML project

PREFERRED REQUIREMENTS:
- SQL
- Deep Learning
- Computer Vision
- Git`;

const ANUJA = `NAME: Anuja P
TECHNICAL SKILLS:
- Languages: Python, SQL
- Concepts: Machine Learning
PROJECTS:
- Disease Prediction System using Machine Learning
  Developed a disease prediction system using machine learning algorithms in Python.`;

const RAHUL = `NAME: Rahul K
TECHNICAL SKILLS:
- Languages: Python, Java, SQL
- Concepts: Machine Learning
PROJECTS:
- E-Commerce Web Portal
  Built a web portal using HTML, CSS, MySQL.`;

const PRIYA = `NAME: Priya S
SUMMARY:
Interested in learning Python. Familiar with machine learning concepts from tutorials.`;

const SANJANA = `NAME: Sanjana R
TECHNICAL SKILLS:
- Languages: Python, PyTorch, OpenCV
PROJECTS:
- Real-Time Traffic Sign Detection using Computer Vision & Deep Learning
  Engineered an object detection system using OpenCV and PyTorch.`;

describe("ResumeProof original suite (tests 1-10)", () => {
  it("Test 1: Experienced in Python -> Strong/Partial", () => {
    const str = classifyContext("Experienced in Python programming.", "WORK_EXPERIENCE", "python");
    expect(["STRONG", "PARTIAL"]).toContain(str);
  });

  it("Test 2: Interested in learning Python -> Unclear/Partial", () => {
    const str = classifyContext("Interested in learning Python.", "SUMMARY", "python");
    expect(["UNCLEAR", "PARTIAL"]).toContain(str);
  });

  it("Test 3: No experience with Python -> Negative", () => {
    const str = classifyContext("No experience with Python development.", "SUMMARY", "python");
    expect(str).toBe("NEGATIVE");
  });

  it("Test 4: Developed ML project in Python -> Strong", () => {
    const str = classifyContext("Developed a machine learning project using Python.", "PROJECTS", "python");
    expect(str).toBe("STRONG");
  });

  it("Test 5: Familiar with machine learning -> Unclear", () => {
    const str = classifyContext("Familiar with machine learning concepts.", "SUMMARY", "machine learning");
    expect(str).toBe("UNCLEAR");
  });

  it("Test 6: STRICT rejects missing AI/ML project", () => {
    const c = parseResume("rahul", RAHUL);
    const jd = parseJD("job1", SAMPLE_JD);
    const ev = extractEvidence(c, jd);
    const res = evaluateCandidate(c, jd, "STRICT", ev);
    expect(res.isShortlisted).toBe(false);
    expect(res.rejectionReason).toMatch(/AI\/ML project/i);
  });

  it("Test 7: BALANCED shortlists Anuja with score > 70", () => {
    const c = parseResume("anuja", ANUJA);
    const jd = parseJD("job1", SAMPLE_JD);
    const ev = extractEvidence(c, jd);
    const res = evaluateCandidate(c, jd, "BALANCED", ev);
    expect(res.isShortlisted).toBe(true);
    expect(res.qualificationScore).toBeGreaterThanOrEqual(70);
  });

  it("Test 8: BEST MATCH keeps Rahul in the list", () => {
    const c = parseResume("rahul", RAHUL);
    const jd = parseJD("job1", SAMPLE_JD);
    const ev = extractEvidence(c, jd);
    const res = evaluateCandidate(c, jd, "BEST_MATCH", ev);
    expect(res.isShortlisted).toBe(true);
  });

  it("Test 9: stronger evidence ranks higher", () => {
    const c1 = parseResume("sanjana", SANJANA);
    const c2 = parseResume("priya", PRIYA);
    const jd = parseJD("job1", SAMPLE_JD);
    const r1 = evaluateCandidate(c1, jd, "BEST_MATCH", extractEvidence(c1, jd));
    const r2 = evaluateCandidate(c2, jd, "BEST_MATCH", extractEvidence(c2, jd));
    const list = rankCandidates([r1, r2]);
    expect(list[0].candidateName).toBe("Sanjana R");
  });

  it("Test 10: synonym matching finds prediction system", () => {
    const req = createRequirement("AI/ML project", true);
    req.synonyms = ["ai project", "prediction system"];
    const c = parseResume("anuja", ANUJA);
    const ev = findEvidenceForRequirement(c, req);
    expect(ev.strength).toBe("STRONG");
    expect(ev.snippet).toMatch(/Disease Prediction System/i);
  });
});

describe("suggested modules", () => {
  it("optimizer never writes red claims into the draft as facts", () => {
    const c = parseResume(
      "x",
      "NAME: Alex\nSUMMARY:\nResponsible for meetings.\nPROJECTS:\n- Helped with docs\n"
    );
    const jd = parseJD("job1", SAMPLE_JD);
    const result = optimizeResume(c, jd);
    expect(result.layers).toHaveLength(4);
    expect(result.optimizedResume).toMatch(/blocked/i);
    expect(result.matchBreakdown.gaps.length + result.matchBreakdown.noEvidence.length).toBeGreaterThan(0);
  });

  it("ATS scorer rewards contact + headings", () => {
    const resume = `NAME: Anuja P
EMAIL: anuja@example.com
PHONE: +91 9876543210
SKILLS:
- Python
EXPERIENCE:
- Built APIs
EDUCATION:
- B.Tech
PROJECTS:
- Disease Prediction System`;
    const report = scoreAts(resume, parseJD("job1", SAMPLE_JD));
    expect(report.score).toBeGreaterThan(40);
    expect(report.checks.find((c) => c.name === "Contact details")?.passed).toBe(true);
  });

  it("ATS scorer does not flag a single 'Company | Role | Dates' line as a complex table", () => {
    const resume = `NAME: Anuja P
EMAIL: anuja@example.com
PHONE: +91 9876543210
SKILLS:
- Python
EXPERIENCE:
Acme Corp | Senior Engineer | 2022-Present
- Built APIs
EDUCATION:
- B.Tech`;
    const report = scoreAts(resume, parseJD("job1", SAMPLE_JD));
    expect(report.checks.find((c) => c.name === "No complex tables")?.passed).toBe(true);
  });

  it("ATS scorer still flags a genuinely wide pasted table (4+ columns on one line)", () => {
    const resume = `NAME: Anuja P
EMAIL: anuja@example.com
PHONE: +91 9876543210
SKILLS:
- Python
EXPERIENCE:
Acme Corp | Senior Engineer | Bangalore | 2022-Present | Full-time
- Built APIs`;
    const report = scoreAts(resume, parseJD("job1", SAMPLE_JD));
    expect(report.checks.find((c) => c.name === "No complex tables")?.passed).toBe(false);
  });

  it("cover letter uses only evidenced requirements", () => {
    const c = parseResume("anuja", ANUJA);
    const jd = parseJD("job1", SAMPLE_JD);
    const letter = generateCoverLetter(c, jd);
    expect(letter.letter).toMatch(/Anuja P/);
    expect(letter.usedEvidence.join(" ").toLowerCase()).toMatch(/python|machine learning/);
  });

  it("timeline validator flags intern vs huge leadership", () => {
    const c = parseResume(
      "y",
      "NAME: Intern\nWORK EXPERIENCE:\nSoftware Intern (2024 - 2025)\nLed a team of 40 engineers across three continents."
    );
    const findings = validateTimeline(c);
    expect(findings.some((f) => /mismatch/i.test(f.title))).toBe(true);
  });
});
