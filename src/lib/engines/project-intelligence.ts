/** Project Intelligence — section 12 of the AI Job Application Optimizer
 *  spec. Ranks the candidate's OWN listed projects by relevance to a
 *  target job, so the most relevant ones can be moved up / highlighted
 *  and the least relevant ones don't crowd out stronger evidence.
 *  Deterministic keyword overlap against the JD's own text — no LLM,
 *  no invented project, no invented relevance beyond what the
 *  project's own words already say. */

import type { CandidateProfile, JobDescription } from "../models";

export interface ProjectRelevance {
  project: string;
  score: number; // 0-100
  matchedTerms: string[];
  tier: "highly_relevant" | "somewhat_relevant" | "less_relevant";
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "have", "using", "used", "into", "your",
  "app", "application", "platform", "system", "management", "based", "via"
]);

function keyTerms(text: string): string[] {
  return Array.from(
    new Set(
      (text.toLowerCase().match(/[a-z][a-z0-9+.#-]{2,}/g) || [])
        // Strip a trailing sentence-ending period (e.g. "Firebase." at the
        // end of a line) without losing periods used mid-token (Node.js).
        .map((w) => w.replace(/\.+$/, ""))
        .filter((w) => !STOPWORDS.has(w))
    )
  );
}

function tierFor(score: number): ProjectRelevance["tier"] {
  if (score >= 60) return "highly_relevant";
  if (score >= 25) return "somewhat_relevant";
  return "less_relevant";
}

/** Ranks extractedProjects by keyword overlap with the JD's title,
 *  mandatory/preferred requirement names, and responsibilities. Each
 *  project's own text is the only source of its matched terms — nothing
 *  is inferred beyond what the candidate already wrote. */
export function rankProjectsByRelevance(profile: CandidateProfile, jd: JobDescription): ProjectRelevance[] {
  const jdText = [
    jd.title,
    ...jd.mandatoryRequirements.map((r) => r.name),
    ...jd.preferredRequirements.map((r) => r.name),
    ...(jd.responsibilities || [])
  ].join(" ");
  const jdTerms = new Set(keyTerms(jdText));
  if (jdTerms.size === 0) return [];

  return profile.extractedProjects
    .map((project) => {
      const terms = keyTerms(project);
      const matched = terms.filter((t) => jdTerms.has(t));
      // Each distinct JD term the project's own text mentions is worth 20
      // points, capped at 100 — simple, explainable, no invented signal.
      const score = Math.min(100, matched.length * 20);
      return { project, score, matchedTerms: matched, tier: tierFor(score) };
    })
    .sort((a, b) => b.score - a.score);
}
