import type { CandidateProfile, JobDescription } from "../models";
import { scorableRequirements } from "../models";
import { findEvidenceForRequirement } from "./evidence-engine";
import { scoreAts } from "./ats-score-engine";
import { EVIDENCE_STRENGTH } from "../models";
import type { CareerVault, FitReport } from "../srs-models";
import { approvedEvidence } from "./career-vault";
import { cleanMarkdown } from "../parsers/jd-extractor";

export function computeFitReport(
  profile: CandidateProfile,
  jd: JobDescription,
  vault?: CareerVault
): FitReport {
  const scorable = scorableRequirements(jd);
  const evidence = scorable.map((req) => findEvidenceForRequirement(profile, req));
  const ats = scoreAts(profile.rawResumeText, jd);
  const explicit = scorable.map((r) => r.name);
  const inferred = inferRequirements(jd.rawText, explicit);

  const matches = evidence
    .filter((e) => e.strength === "STRONG" || e.strength === "PARTIAL")
    .map((e) => cleanLabel(e.requirementName));
  const transferable = evidence.filter((e) => e.strength === "UNCLEAR").map((e) => cleanLabel(e.requirementName));
  const gaps = evidence.filter((e) => e.strength === "NOT_FOUND").map((e) => cleanLabel(e.requirementName));
  const notPossessed = evidence.filter((e) => e.strength === "NEGATIVE").map((e) => cleanLabel(e.requirementName));

  const coreMatches = [...new Set(matches)];
  const coreGaps = [...new Set(gaps)];

  const evidenceAvg =
    evidence.length === 0
      ? 0
      : Math.round(
          (evidence.reduce((sum, e) => sum + Math.max(0, EVIDENCE_STRENGTH[e.strength].multiplier), 0) / evidence.length) *
            100
        );

  const vaultCoverage = vault
    ? Math.min(100, Math.round((approvedEvidence(vault).length / 12) * 100))
    : Math.min(100, Math.round((profile.extractedSkills.length / 8) * 100));

  const keywordCoverage = explicit.length
    ? Math.round((coreMatches.length / explicit.length) * 100)
    : ats.score;

  const subScores = {
    keywordCoverage,
    evidenceStrength: evidenceAvg,
    atsReadiness: ats.score,
    completeness: vaultCoverage
  };

  const score = Math.round(
    subScores.keywordCoverage * 0.4 +
      subScores.evidenceStrength * 0.25 +
      subScores.atsReadiness * 0.2 +
      subScores.completeness * 0.15
  );

  const label = score >= 80 ? "Strong fit" : score >= 60 ? "Promising fit" : score >= 40 ? "Partial fit" : "Early-stage fit";

  const responsibilityCount = jd.responsibilities?.length || 0;
  const parseNote =
    responsibilityCount > 0
      ? `Parsed ${explicit.length} core skills (not ${responsibilityCount} duty lines). Fit Score uses skills you can honestly claim — not every job bullet.`
      : `Parsed ${explicit.length} core skills from this job text.`;

  const applyReadiness = buildApplyReadiness({
    profile,
    jd,
    coreMatches,
    coreGaps,
    keywordCoverage,
    atsScore: ats.score,
    atsTips: ats.recommendations
  });

  const explanation = [
    `Core skill coverage ${keywordCoverage}% (${coreMatches.length} of ${explicit.length} skills have resume evidence).`,
    `Evidence strength ${evidenceAvg}% averages snippet quality.`,
    `ATS readiness ${ats.score} — contact, headings, length.`,
    parseNote
  ].join(" ");

  const nextActions: FitReport["nextActions"] = [];
  if (applyReadiness.level === "fix_basics") {
    nextActions.push({
      title: "Fix resume basics before applying",
      detail: applyReadiness.checklist[0] || "Add real email, phone, and standard headings.",
      step: "vault"
    });
  }
  if (applyReadiness.level === "stretch_role") {
    nextActions.push({
      title: "This may be a stretch on seniority",
      detail: "Apply if you have the years — but do not rewrite your title to match the JD.",
      step: "change"
    });
  }
  if (coreGaps.length) {
    nextActions.push({
      title: "Honest gaps only",
      detail: `Missing core skills: ${coreGaps.slice(0, 5).join(", ")}. Add a real project or skip stuffing.`,
      step: "change"
    });
  }
  if (coreMatches.length) {
    nextActions.push({
      title: "Lead your resume with proof",
      detail: `You already prove: ${coreMatches.slice(0, 5).join(", ")}. Tailor bullets to the top.`,
      step: "tailor"
    });
  }
  nextActions.push({
    title: applyReadiness.level === "apply_now" ? "Tailor and apply today" : "Generate tailoring, then verify",
    detail: applyReadiness.headline,
    step: "tailor"
  });

  const scoreMovers: FitReport["scoreMovers"] = [];
  if (ats.score < 70) {
    scoreMovers.push({
      title: "Biggest quick win: ATS shape",
      detail: "Add PHONE, standard SKILLS / EXPERIENCE / EDUCATION headings, and 3–6 word bullets — often +20 ATS readiness."
    });
  }
  if (coreGaps.length && coreGaps.length <= 6) {
    scoreMovers.push({
      title: "Close one real gap",
      detail: `A portfolio artifact for ${coreGaps[0]} beats adding the keyword with no proof.`
    });
  }
  if (keywordCoverage >= 50) {
    scoreMovers.push({
      title: "You can apply with tailoring",
      detail: "Reorder and emphasize existing Playwright/API/CI evidence — do not invent years or tools."
    });
  }

  return {
    score,
    label,
    disclaimer:
      "ResumeProof Fit Score is this product's estimate from your evidence and core skills in this job. Duty-line bullets are not scored individually. It is not a universal ATS score.",
    subScores,
    matches,
    transferable,
    gaps,
    notPossessed,
    inferredRequirements: inferred,
    explicitRequirements: explicit,
    parserPreview: buildParserPreview(profile),
    explanation,
    nextActions,
    scoreMovers,
    applyReadiness,
    jdInsight: {
      coreSkillCount: explicit.length,
      responsibilityCount,
      parseNote
    },
    coreMatches,
    coreGaps
  };
}

function buildApplyReadiness(input: {
  profile: CandidateProfile;
  jd: JobDescription;
  coreMatches: string[];
  coreGaps: string[];
  keywordCoverage: number;
  atsScore: number;
  atsTips: string[];
}): FitReport["applyReadiness"] {
  const checklist: string[] = [];
  const placeholderEmail = /example\.com|candidate\d@/i.test(input.profile.email);
  const badPhone = !input.profile.phone || /not specified/i.test(input.profile.phone);

  if (placeholderEmail) checklist.push("Replace placeholder email with your real address in Career Vault.");
  if (badPhone) checklist.push("Add a real phone number in plain text (ATS parsers miss icons-only contact blocks).");
  if (input.atsScore < 55) checklist.push(input.atsTips[0] || "Add SKILLS, WORK EXPERIENCE, and EDUCATION section headings.");

  const seniorJd = input.jd.seniority === "Senior" || input.jd.seniority === "Lead";
  const resumeBlob = input.profile.rawResumeText.toLowerCase();
  const hasYears = /\d+\+?\s*years?|\d+\s*[-–]\s*\d+\s*years?/i.test(resumeBlob);
  const stretch = seniorJd && !hasYears && /intern|student|fresher|graduate/i.test(resumeBlob);

  if (stretch) {
    checklist.push("JD asks for senior experience — only apply if your years match; never inflate titles.");
    return {
      level: "stretch_role",
      headline: "Stretch role: seniority on the JD may not match your vault yet. Tailor honestly or target mid-level roles.",
      checklist
    };
  }

  if (checklist.length >= 2 || input.atsScore < 45) {
    return {
      level: "fix_basics",
      headline: "Fix contact + resume shape first — recruiters and ATS both skip incomplete headers.",
      checklist
    };
  }

  if (input.keywordCoverage >= 55 && input.coreMatches.length >= 4 && input.atsScore >= 50) {
    checklist.push("Accept tailoring suggestions for your top matched skills.");
    checklist.push("Export tailored resume + recruiter email from Application kit.");
    checklist.push("Log the application in Tracker and set a 3-day follow-up.");
    return {
      level: "apply_now",
      headline: "Good enough to tailor and apply today — lead with skills you already prove in the vault.",
      checklist
    };
  }

  checklist.push("Run tailoring and move matched skills into your summary and top bullets.");
  checklist.push("Do not add missing tools as fake experience.");
  return {
    level: "tailor_first",
    headline: "Tailor first: you have partial overlap — reorder proof before submitting.",
    checklist
  };
}

function cleanLabel(name: string): string {
  const c = cleanMarkdown(name);
  return c.length > 56 ? `${c.slice(0, 53)}…` : c;
}

function inferRequirements(raw: string, explicit: string[]): string[] {
  const hints = ["agile", "stakeholder", "ownership", "on-call", "communication", "documentation"];
  const lower = raw.toLowerCase();
  return hints.filter((h) => lower.includes(h) && !explicit.some((e) => e.toLowerCase().includes(h)));
}

function buildParserPreview(profile: CandidateProfile): string {
  return [
    `NAME: ${profile.name}`,
    `EMAIL: ${profile.email}`,
    `PHONE: ${profile.phone}`,
    `SKILLS: ${profile.extractedSkills.slice(0, 12).join(", ")}`,
    `PROJECTS: ${profile.extractedProjects.slice(0, 4).join(" | ") || "(add 1–2 project bullets in vault)"}`
  ].join("\n");
}
