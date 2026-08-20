/** Resume Health Dashboard — section 13 of the AI Job Application Optimizer
 *  spec. Deliberately distinct from career-vault.ts's vaultCompleteness():
 *  that measures how much the candidate has told us (fill rate); this
 *  measures how GOOD what they told us is as a resume — structure, ATS
 *  parseability, and evidence of impact. Available right after the resume
 *  is parsed, before any target job is added — the two categories that
 *  need a JD (Alignment, Keyword Coverage) show as unavailable until then,
 *  rather than faked with a placeholder number. */

import type { CandidateProfile } from "../models";
import type { CareerVault, FitReport } from "../srs-models";
import { scoreAts } from "./ats-score-engine";
import { approvedEvidence } from "./career-vault";
import { computeAchievementMatch } from "./achievement-score";

export interface ResumeHealthCategory {
  key: string;
  label: string;
  score: number | null;
  note: string;
}

export interface ResumeHealthReport {
  overall: number;
  categoriesScored: number;
  categoriesTotal: number;
  categories: ResumeHealthCategory[];
  topImprovements: string[];
}

function readabilityScore(resumeText: string): { score: number; note: string } {
  const bullets = resumeText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^[-•*]\s+/.test(l));
  if (bullets.length === 0) return { score: 55, note: "No bullet points detected — bullets scan faster than paragraphs." };
  const lengths = bullets.map((b) => b.replace(/^[-•*]\s+/, "").length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const tooLong = lengths.filter((l) => l > 180).length;
  if (avg > 160 || tooLong > lengths.length / 3) return { score: 60, note: "Several bullets run long — aim for one clear idea per line." };
  if (avg < 25) return { score: 70, note: "Bullets are quite short — a little more context would help a reader." };
  return { score: 92, note: "Bullet length is easy to scan." };
}

function skillsRelevanceScore(vault: CareerVault): { score: number; note: string } {
  const skillCount = approvedEvidence(vault).filter((e) => e.type === "skill").length;
  if (skillCount === 0) return { score: 25, note: "No approved skills in your Career Vault yet." };
  const score = Math.min(95, 40 + skillCount * 6);
  return { score, note: `${skillCount} approved skill${skillCount === 1 ? "" : "s"} in your vault.` };
}

export function computeResumeHealth(
  profile: CandidateProfile,
  vault: CareerVault,
  fit: FitReport | null
): ResumeHealthReport {
  const ats = scoreAts(profile.rawResumeText);
  const readability = readabilityScore(profile.rawResumeText);
  const skillsRelevance = fit ? { score: fit.subScores.keywordCoverage, note: "How many of the target job's must-have skills you can prove." } : skillsRelevanceScore(vault);
  const achievement = computeAchievementMatch(vault);

  const categories: ResumeHealthCategory[] = [
    { key: "ats", label: "ATS Compatibility", score: ats.score, note: "Standard headings, parseable contact info, no risky formatting." },
    {
      key: "alignment",
      label: "JD Alignment",
      score: fit ? fit.score : null,
      note: fit ? "How well this resume matches your target job overall." : "Add a target job to see this score."
    },
    {
      key: "keywords",
      label: "Keyword Coverage",
      score: fit ? fit.optimizer?.jdMatch.atsKeywordMatch ?? ats.score : null,
      note: fit ? "ATS keyword overlap with your target job." : "Add a target job to see this score."
    },
    { key: "impact", label: "Experience Impact", score: achievement.score, note: achievement.note },
    { key: "skills", label: "Skills Relevance", score: skillsRelevance.score, note: skillsRelevance.note },
    { key: "readability", label: "Readability", score: readability.score, note: readability.note },
    { key: "achievement", label: "Achievement Strength", score: achievement.score, note: achievement.note }
  ];

  const scored = categories.filter((c) => c.score !== null) as Array<ResumeHealthCategory & { score: number }>;
  const overall = scored.length ? Math.round(scored.reduce((a, c) => a + c.score, 0) / scored.length) : 0;

  const topImprovements: string[] = [];
  const sorted = [...scored].sort((a, b) => a.score - b.score);
  for (const c of sorted) {
    if (c.score >= 70) continue;
    if (c.key === "impact" || c.key === "achievement") topImprovements.push("Add 1-2 verified, measurable achievements to your vault.");
    else if (c.key === "readability") topImprovements.push("Tighten a few long bullets to one clear idea each.");
    else if (c.key === "skills") topImprovements.push("Add more approved skills to your Career Vault.");
    else if (c.key === "ats") topImprovements.push("Fix the failing ATS checks below — headings, contact format, or structure.");
    else if (c.key === "alignment") topImprovements.push("Review your gaps against this job and tailor your top bullets.");
    else if (c.key === "keywords") topImprovements.push("Work through the missing keywords list and confirm what's genuinely true.");
  }
  const deduped = Array.from(new Set(topImprovements)).slice(0, 5);

  return {
    overall,
    categoriesScored: scored.length,
    categoriesTotal: categories.length,
    categories,
    topImprovements: deduped
  };
}
