/** Achievement Builder — section 11 of the AI Job Application Optimizer
 *  spec (guided quantification questions, never fabricate).
 *
 *  This engine never generates a number, metric, or outcome itself —
 *  every field here is something the candidate types in about their own
 *  work. All it does is (a) point at bullets that could use a number,
 *  reusing bullet-formula-check's own Result detection so the two
 *  features never disagree about what counts as "quantified", and
 *  (b) format the candidate's own answers into one clean bullet
 *  addition. Pure string composition — no LLM, no invention. */

import { RESULT_RE } from "./bullet-formula-check";
import type { BulletFormulaResult } from "./bullet-formula-check";

export interface AchievementAnswer {
  metric: string; // what improved — the candidate's own words, e.g. "load time"
  direction: "Reduced" | "Increased" | "Saved" | "Improved" | "Grew" | "Automated";
  amount: string; // the candidate's own number, e.g. "40%", "2 hours/week", "$10K"
  scope: string; // optional context, e.g. "for 5,000 users"
}

/** Bullets worth prompting the candidate to quantify — reuses
 *  bullet-formula-check's own Result detection, so this list is
 *  always a subset of what that panel already flagged. */
export function unquantifiedBullets(formulaResults: BulletFormulaResult[]): string[] {
  return formulaResults.filter((r) => !r.hasResult).map((r) => r.bullet);
}

export function isQuantifiedAnswer(answer: Partial<AchievementAnswer>): answer is AchievementAnswer {
  return Boolean(answer.metric?.trim() && answer.amount?.trim() && answer.direction);
}

/** Composes the candidate's own answers into a quantified addition to an
 *  existing bullet. Purely formats what the candidate typed — invents
 *  nothing. Guards with RESULT_RE so a caller can confirm the composed
 *  text actually reads as quantified before offering to apply it. */
export function buildQuantifiedBullet(bullet: string, answer: AchievementAnswer): string {
  const scope = answer.scope.trim();
  const tail = `${answer.direction} ${answer.metric.trim()} by ${answer.amount.trim()}${scope ? ` ${scope}` : ""}`;
  return `${bullet} — ${tail}`;
}

export function readsAsQuantified(text: string): boolean {
  return RESULT_RE.test(text);
}

/** Replaces the original bullet line in the resume text with the
 *  quantified version — same line, same section, just the candidate's
 *  own added detail. No-op if the original bullet text isn't found. */
export function applyQuantifiedBulletToResume(resumeText: string, originalBullet: string, quantifiedBullet: string): string {
  return resumeText
    .split("\n")
    .map((line) => (line.replace(/^[-•*]\s*/, "").trim() === originalBullet ? line.replace(originalBullet, quantifiedBullet) : line))
    .join("\n");
}
