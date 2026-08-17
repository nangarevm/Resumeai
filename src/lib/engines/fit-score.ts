import type { CandidateProfile, JobDescription } from "../models";
import { allRequirements } from "../models";
import { extractEvidence } from "./evidence-engine";
import { scoreAts } from "./ats-score-engine";
import { EVIDENCE_STRENGTH } from "../models";
import type { CareerVault, FitReport } from "../srs-models";
import { approvedEvidence } from "./career-vault";

export function computeFitReport(
  profile: CandidateProfile,
  jd: JobDescription,
  vault?: CareerVault
): FitReport {
  const evidence = extractEvidence(profile, jd);
  const ats = scoreAts(profile.rawResumeText, jd);
  const explicit = allRequirements(jd).map((r) => r.name);
  const inferred = inferRequirements(jd.rawText, explicit);

  const matches = evidence.filter((e) => e.strength === "STRONG" || e.strength === "PARTIAL").map((e) => e.requirementName);
  const transferable = evidence.filter((e) => e.strength === "UNCLEAR").map((e) => e.requirementName);
  const gaps = evidence.filter((e) => e.strength === "NOT_FOUND").map((e) => e.requirementName);
  const notPossessed = evidence.filter((e) => e.strength === "NEGATIVE").map((e) => e.requirementName);

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
    ? Math.round((matches.length / explicit.length) * 100)
    : ats.score;

  const subScores = {
    keywordCoverage,
    evidenceStrength: evidenceAvg,
    atsReadiness: ats.score,
    completeness: vaultCoverage
  };

  const score = Math.round(
    subScores.keywordCoverage * 0.35 +
      subScores.evidenceStrength * 0.3 +
      subScores.atsReadiness * 0.2 +
      subScores.completeness * 0.15
  );

  const label = score >= 80 ? "Strong fit" : score >= 60 ? "Promising fit" : score >= 40 ? "Partial fit" : "Early-stage fit";

  const explanation = [
    `Keyword coverage ${keywordCoverage}% (${matches.length} of ${explicit.length} parsed requirements have resume evidence).`,
    `Evidence strength ${evidenceAvg}% averages snippet quality, not keyword stuffing.`,
    `ATS readiness ${ats.score} checks contact, headings, length and stuffing.`,
    `Career Vault completeness ${vaultCoverage}% reflects how much confirmed evidence is available to tailor from.`
  ].join(" ");

  return {
    score,
    label,
    disclaimer:
      "ResumeProof Fit Score is this product's estimate from your evidence and this job text. It is not a universal ATS score and does not predict a hiring decision.",
    subScores,
    matches,
    transferable,
    gaps,
    notPossessed,
    inferredRequirements: inferred,
    explicitRequirements: explicit,
    parserPreview: buildParserPreview(profile),
    explanation
  };
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
    `SKILLS: ${profile.extractedSkills.join(", ")}`,
    `PROJECTS: ${profile.extractedProjects.slice(0, 4).join(" | ")}`
  ].join("\n");
}
