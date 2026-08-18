import type { CandidateProfile, JobDescription } from "../models";
import type { CareerVault, FitReport, CareerOptimizerReport } from "../srs-models";
import { scoreAts } from "./ats-score-engine";
import { scorableRequirements } from "../models";
import { findEvidenceForRequirement } from "./evidence-engine";
import { approvedEvidence } from "./career-vault";
import { marketIntelligenceForCandidate } from "./market-intelligence";
import { detectOpportunities } from "./opportunity-detector";
import { buildSkillGapPlan } from "./skill-gap-plan";

export function buildCareerOptimizerReport(
  profile: CandidateProfile,
  jd: JobDescription,
  vault: CareerVault,
  fit: FitReport
): CareerOptimizerReport {
  const ats = scoreAts(profile.rawResumeText, jd);
  const scorable = scorableRequirements(jd);
  const evidence = scorable.map((req) => findEvidenceForRequirement(profile, req));

  const techHits = evidence.filter((e) =>
    ["SKILL_TECH", "PROJECT"].includes(
      scorable.find((r) => r.name === e.requirementName)?.category || "SKILL_TECH"
    ) && (e.strength === "STRONG" || e.strength === "PARTIAL")
  ).length;
  const techTotal = scorable.filter((r) => r.category === "SKILL_TECH" || r.category === "PROJECT").length || scorable.length;

  const respCount = jd.responsibilities?.length || 0;
  const respOverlap =
    respCount > 0
      ? Math.min(
          100,
          Math.round(
            (evidence.filter((e) => e.strength === "STRONG" || e.strength === "PARTIAL").length /
              Math.max(scorable.length, 1)) *
              100
          )
        )
      : fit.subScores.keywordCoverage;

  const eduEvidence = approvedEvidence(vault).filter((e) => e.type === "education" || e.type === "certification");
  const eduCertMatch = Math.min(100, eduEvidence.length >= 1 ? 70 + eduEvidence.length * 10 : 40);

  const expScore =
    fit.experienceMatch.status === "meets"
      ? 90
      : fit.experienceMatch.status === "over"
        ? 85
        : fit.experienceMatch.status === "under"
          ? 45
          : 65;

  const jdMatch: JdMatchBreakdown = {
    overall: fit.score,
    skillsMatch: fit.subScores.keywordCoverage,
    experienceMatch: expScore,
    technologyMatch: techTotal ? Math.round((techHits / techTotal) * 100) : fit.subScores.keywordCoverage,
    responsibilityMatch: respOverlap,
    atsKeywordMatch: ats.score,
    educationCertMatch: eduCertMatch
  };

  const approved = approvedEvidence(vault);
  const vaultBlob = approved.map((e) => e.content).join(" ").toLowerCase();
  const market = marketIntelligenceForCandidate(jd.title, jd.domain, vaultBlob);

  const skillGapPlan = buildSkillGapPlan(profile, jd);
  const opportunities = detectOpportunities(profile, jd, vault, fit.score);

  const gapPenalty = Math.min(30, fit.coreGaps.length * 5);
  const marketBoost = Math.min(15, market.relevantEmerging.length * 3);
  const transferableBoost = Math.min(10, fit.transferable.length * 2);
  const careerOpportunityScore = Math.max(
    0,
    Math.min(100, Math.round(fit.score * 0.55 + jdMatch.experienceMatch * 0.15 + marketBoost + transferableBoost - gapPenalty * 0.3))
  );
  const careerOpportunityLabel =
    careerOpportunityScore >= 75
      ? "Strong market positioning"
      : careerOpportunityScore >= 55
        ? "Solid with room to grow"
        : "Build proof before stretching";

  const recommendedCvChanges = buildCvChanges(profile, jd, fit, skillGapPlan);
  const whyMoreCompetitive = buildWhyCompetitive(fit, jd, skillGapPlan);
  const summarySuggestion = suggestSummaryLine(profile, jd, fit.coreMatches);

  return {
    jdMatch,
    careerOpportunityScore,
    careerOpportunityLabel,
    topStrengths: fit.coreMatches.slice(0, 8),
    missingWeakSkills: [...fit.coreGaps, ...fit.transferable.filter((t) => !fit.coreMatches.includes(t))].slice(0, 10),
    marketTrends: {
      fastGrowing: market.fastGrowing,
      emerging: market.emerging,
      increasingDemand: market.increasingDemand,
      declining: market.declining,
      aiOpportunities: market.aiOpportunities
    },
    opportunities,
    skillGapPlan,
    recommendedCvChanges,
    whyMoreCompetitive,
    nextBestActions: fit.nextActions,
    summarySuggestion
  };
}

export function suggestSummaryLine(profile: CandidateProfile, jd: JobDescription, coreMatches: string[]): string {
  const skills = coreMatches.slice(0, 4);
  if (!skills.length) {
    return profile.parsedSections.SUMMARY?.split("\n")[0]?.trim() || `${profile.name} — add a summary from vault evidence.`;
  }
  const years = profile.rawResumeText.match(/(\d+)\+?\s*years?/i)?.[1];
  const yearPhrase = years ? `${years}+ years` : "Experienced";
  return `${yearPhrase} ${jd.title} professional with evidenced strengths in ${skills.join(", ")} — all claims traceable to Career Vault.`;
}

function buildCvChanges(
  profile: CandidateProfile,
  jd: JobDescription,
  fit: FitReport,
  gapPlan: SkillGapItem[]
): CareerOptimizerReport["recommendedCvChanges"] {
  const changes: CareerOptimizerReport["recommendedCvChanges"] = [];

  if (fit.subScores.atsReadiness < 70) {
    changes.push({
      area: "ATS structure",
      change: "Add plain-text SKILLS, WORK EXPERIENCE, EDUCATION headings and a parseable phone line.",
      truthful: true
    });
  }

  const strong = gapPlan.filter((g) => g.level === "strong").map((g) => g.skill);
  if (strong.length) {
    changes.push({
      area: "Professional summary",
      change: `Lead summary with: ${strong.slice(0, 3).join(", ")} — aligned to ${jd.title}.`,
      truthful: true
    });
  }

  const missing = gapPlan.filter((g) => g.level === "missing").slice(0, 3);
  for (const m of missing) {
    changes.push({
      area: `Skill: ${m.skill}`,
      change: "Potential improvement — verify with candidate. Do not add to experience without vault proof.",
      truthful: false
    });
  }

  changes.push({
    area: "Bullet ordering",
    change: "Move strongest evidenced bullets (accepted tailor suggestions) directly under each role.",
    truthful: true
  });

  if (!profile.parsedSections.CERTIFICATIONS?.trim()) {
    changes.push({
      area: "Certifications",
      change: "Add only certifications you hold — paste into vault first.",
      truthful: true
    });
  }

  return changes.slice(0, 12);
}

function buildWhyCompetitive(fit: FitReport, jd: JobDescription, gapPlan: SkillGapItem[]): string[] {
  const lines: string[] = [];
  const strongCount = gapPlan.filter((g) => g.level === "strong").length;
  if (strongCount) lines.push(`Leads with ${strongCount} core JD skills already proved in your vault.`);
  if (fit.subScores.atsReadiness >= 60) lines.push("Resume structure is ATS-parseable — contact and headings pass checks.");
  if (fit.coreGaps.length <= 3) lines.push("Gap count is manageable — tailor and apply without inventing experience.");
  lines.push(`Targeted to ${jd.title} at ${jd.companyName} using evidence-bound keywords only.`);
  lines.push("No fabricated employers, metrics, or tools — verification gate before export.");
  return lines;
}
