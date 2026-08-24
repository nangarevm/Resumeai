import type { AtsReport, JobDescription } from "../models";
import { allRequirements } from "../models";
import { expandSynonyms } from "./synonym-lexicon";

export function scoreAts(resumeText: string, jd?: JobDescription): AtsReport {
  const text = resumeText || "";
  const lower = text.toLowerCase();
  const checks: AtsReport["checks"] = [];

  const hasEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text);
  const hasPhone = /(\+?\d[\d\s().-]{8,}\d)/.test(text);
  checks.push({
    name: "Contact details",
    passed: hasEmail && hasPhone,
    weight: 15,
    detail: hasEmail && hasPhone ? "Email and phone detected." : "Add a parseable email and phone number in plain text."
  });

  const headingCount = ["skills", "experience", "education", "projects"].filter((h) =>
    new RegExp(`^${h}\\b`, "im").test(text)
  ).length;
  checks.push({
    name: "Standard headings",
    passed: headingCount >= 3,
    weight: 15,
    detail: headingCount >= 3 ? "Core ATS headings are present." : "Use Skills, Experience, Education, and Projects as plain headings."
  });

  // A single "Company | Role | Dates"-style line (2 pipes, 3 columns) is a
  // common, legitimate one-line work-history format — including this app's
  // own placeholder text — not a pasted table. Only flag genuinely
  // table-like content: a line with 3+ pipes (4+ columns), or tab-delimited
  // runs (the shape a real Word/Excel table paste produces).
  const hasTables = text.split("\n").some((line) => (line.match(/\|/g) || []).length >= 3) || /\t.+\t/.test(text);
  checks.push({
    name: "No complex tables",
    passed: !hasTables,
    weight: 10,
    detail: hasTables ? "Table-like formatting can scramble ATS parsing." : "Text is linear and parseable."
  });

  const words = text.split(/\s+/).filter(Boolean).length;
  checks.push({
    name: "Length band",
    passed: words >= 180 && words <= 900,
    weight: 10,
    detail: words < 180 ? "Resume is thin — add concrete project bullets." : words > 900 ? "Resume is long for ATS screens; tighten to 1–2 pages." : "Length is in a recruiter-friendly band."
  });

  const bulletCount = (text.match(/^[-•*]/gm) || []).length;
  checks.push({
    name: "Bullet evidence",
    passed: bulletCount >= 4,
    weight: 10,
    detail: bulletCount >= 4 ? "Achievement bullets are present." : "Convert paragraphs into evidence bullets."
  });

  const keywordHits: string[] = [];
  const keywordMisses: string[] = [];
  if (jd) {
    for (const req of allRequirements(jd)) {
      const aliases = expandSynonyms(req.name, req.synonyms);
      const hit = aliases.some((a) => lower.includes(a.toLowerCase()));
      if (hit) keywordHits.push(req.name);
      else keywordMisses.push(req.name);
    }
  }
  const coverage = jd ? keywordHits.length / Math.max(1, keywordHits.length + keywordMisses.length) : 0.5;
  checks.push({
    name: "JD keyword coverage",
    passed: coverage >= 0.45,
    weight: 25,
    detail: jd
      ? `Matched ${keywordHits.length} of ${keywordHits.length + keywordMisses.length} parsed requirements.`
      : "No JD attached — coverage estimated from structure only."
  });

  const stuffing = detectStuffing(lower, jd);
  checks.push({
    name: "No keyword stuffing",
    passed: !stuffing,
    weight: 15,
    detail: stuffing ? "Repeated JD keywords look stuffed rather than evidenced." : "Keyword density looks natural."
  });

  const earned = checks.reduce((sum, c) => sum + (c.passed ? c.weight : 0), 0);
  const score = Math.round(earned);
  const grade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : "D";
  const recommendations = checks.filter((c) => !c.passed).map((c) => c.detail);
  if (!recommendations.length) recommendations.push("ATS shape is solid. Next: strengthen evidence, not keywords.");

  return { score, grade, checks, keywordHits, keywordMisses, recommendations };
}

function detectStuffing(lower: string, jd?: JobDescription): boolean {
  if (!jd) return false;
  return allRequirements(jd).some((req) => {
    const term = req.name.toLowerCase();
    if (term.length < 4) return false;
    const count = lower.split(term).length - 1;
    return count >= 6;
  });
}
