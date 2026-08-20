import type { CandidateProfile, JobDescription } from "../models";
import type { CareerVault, FitReport, CareerOptimizerReport, SkillGapItem, JdMatchBreakdown } from "../srs-models";
import { scoreAts } from "./ats-score-engine";
import { scorableRequirements } from "../models";
import { findEvidenceForRequirement } from "./evidence-engine";
import { approvedEvidence } from "./career-vault";
import { marketIntelligenceForCandidate, getMarketSignals, resolveRoleFamily } from "./market-intelligence";
import { detectOpportunities } from "./opportunity-detector";
import { buildSkillGapPlan } from "./skill-gap-plan";
import { scoreResponsibilityMatch } from "./responsibility-matcher";
import { scoreSoftSkillDimensions } from "./soft-skill-scorer";
import { suggestSummaryLine } from "./summary-suggestion";
import { getCachedLiveOverlay, mergeLiveWithStatic } from "./live-market-feed";
import { computeAchievementMatch } from "./achievement-score";

const SENIORITY_TIERS: Record<string, number> = {
  intern: 0,
  trainee: 0,
  junior: 1,
  associate: 1,
  entry: 1,
  "entry-level": 1,
  mid: 2,
  "mid-level": 2,
  senior: 3,
  lead: 4,
  principal: 5,
  staff: 5,
  architect: 5,
  director: 6,
  "head of": 6,
  vp: 7,
  cto: 7,
  ceo: 7
};

function detectSeniorityTier(text: string): number | null {
  const lower = text.toLowerCase();
  let best: number | null = null;
  for (const [word, tier] of Object.entries(SENIORITY_TIERS)) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) best = best === null ? tier : Math.max(best, tier);
  }
  return best;
}

/** How well the JD's stated (or title-implied) seniority lines up with the
 *  candidate's own recent title — never penalizes when either side doesn't
 *  say, since silence isn't evidence of a mismatch. */
function computeSeniorityMatch(jd: JobDescription, profile: CandidateProfile): { score: number; note: string } {
  const jdTier = detectSeniorityTier(`${jd.seniority || ""} ${jd.title || ""}`);
  const resumeTier = detectSeniorityTier(profile.rawResumeText.split("\n").slice(0, 15).join(" "));
  if (jdTier === null) return { score: 65, note: "JD does not state a seniority level — neutral baseline." };
  if (resumeTier === null) return { score: 55, note: "Could not detect a seniority level from your resume's recent titles." };
  const diff = Math.abs(jdTier - resumeTier);
  if (diff === 0) return { score: 95, note: "Your most recent title matches the JD's seniority level." };
  if (diff === 1) return { score: 75, note: "Your seniority is one level away from what the JD states." };
  if (diff === 2) return { score: 50, note: "Your seniority is a couple of levels away from what the JD states." };
  return { score: 30, note: "Your seniority is far from what the JD states." };
}

/** Whether the JD's stated domain shows up in the candidate's own approved
 *  vault content (real evidence) versus only in their stated preferences
 *  (aspirational, still honestly labeled as such). */
function computeDomainMatch(jd: JobDescription, vaultBlob: string, profile: CandidateProfile): { score: number; note: string } {
  const domain = (jd.domain || "").trim().toLowerCase();
  if (!domain) return { score: 65, note: "JD does not state a domain — neutral baseline." };
  const domainWords = domain.split(/[\s,/&-]+/).filter((w) => w.length > 2);
  const hits = domainWords.filter((w) => vaultBlob.includes(w));
  if (hits.length === 0) {
    const preferred = profile.preferences.preferredDomains.some((d) => d.toLowerCase().includes(domain) || domain.includes(d.toLowerCase()));
    return preferred
      ? { score: 55, note: `"${jd.domain}" is a domain you've said you're targeting, but not yet backed by vault evidence.` }
      : { score: 35, note: `No vault evidence found for the "${jd.domain}" domain.` };
  }
  const score = Math.min(100, 60 + Math.round((hits.length / domainWords.length) * 40));
  return { score, note: `Vault evidence references the "${jd.domain}" domain.` };
}

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

  const respResult = scoreResponsibilityMatch(profile, jd, vault);
  const softSkills = scoreSoftSkillDimensions(profile, jd, vault);
  const respOverlap = respResult.totalCount > 0 ? respResult.score : fit.subScores.keywordCoverage;

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

  const approved = approvedEvidence(vault);
  const vaultBlob = approved.map((e) => e.content).join(" ").toLowerCase();
  const domainMatch = computeDomainMatch(jd, vaultBlob, profile);
  const seniorityMatch = computeSeniorityMatch(jd, profile);
  const achievementMatch = computeAchievementMatch(vault);

  const jdMatch: JdMatchBreakdown = {
    overall: fit.score,
    skillsMatch: fit.subScores.keywordCoverage,
    experienceMatch: expScore,
    technologyMatch: techTotal ? Math.round((techHits / techTotal) * 100) : fit.subScores.keywordCoverage,
    responsibilityMatch: respOverlap,
    responsibilityMatchedCount: respResult.matchedCount,
    responsibilityTotalCount: respResult.totalCount,
    atsKeywordMatch: ats.score,
    educationCertMatch: eduCertMatch,
    domainMatch: domainMatch.score,
    seniorityMatch: seniorityMatch.score,
    achievementMatch: achievementMatch.score,
    leadershipMatch: softSkills.leadershipMatch,
    communicationMatch: softSkills.communicationMatch,
    aiRelevanceMatch: softSkills.aiRelevanceMatch,
    dimensionNotes: {
      leadership: softSkills.leadershipNote,
      communication: softSkills.communicationNote,
      aiRelevance: softSkills.aiRelevanceNote,
      domain: domainMatch.note,
      seniority: seniorityMatch.note,
      achievement: achievementMatch.note
    }
  };
  const signals = mergeLiveWithStatic(getMarketSignals(jd.title, jd.domain), getCachedLiveOverlay(resolveRoleFamily(jd.title, jd.domain)));
  const market = marketIntelligenceForCandidate(jd.title, vaultBlob, jd.domain);

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
      aiOpportunities: market.aiOpportunities,
      liveSource: signals.liveSource,
      liveFetchedAt: signals.liveFetchedAt
    },
    opportunities,
    skillGapPlan,
    recommendedCvChanges,
    whyMoreCompetitive,
    nextBestActions: fit.nextActions,
    summarySuggestion,
    responsibilityHighlights: respResult.highlights,
    responsibilityGaps: respResult.gaps,
    requirementEvidence: evidence
  };
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
  lines.push(`Targeted to ${jd.title} at ${jd.companyName} using keywords from your verified experience only.`);
  lines.push("No fabricated employers, metrics, or tools — verification gate before export.");
  return lines;
}
