/** Experience Bullet Improvement — section 10 of the AI Job Application
 *  Optimizer spec (Action + Technology + Scope + Result formula).
 *
 *  Deliberately separate from evidence-rewrite.ts: that engine REORDERS
 *  an existing bullet's own words to lead with a JD-matched term (and
 *  needs a target job to do it). This engine is JD-independent — it
 *  scores each bullet's own structure against the four-part formula and
 *  coaches what's missing. It never invents a number, verb, or fact; it
 *  only tells the candidate which real detail to go add themselves. */

import type { CandidateProfile } from "../models";

export type BulletFormulaPart = "Action" | "Technology" | "Scope" | "Result";

export interface BulletFormulaResult {
  bullet: string;
  hasAction: boolean;
  hasTechnology: boolean;
  hasScope: boolean;
  hasResult: boolean;
  missing: BulletFormulaPart[];
  tip: string;
}

const WEAK_START_RE =
  /^(responsible for|worked on|worked with|helped(?:\s+with)?|assisted(?:\s+with)?|involved in|duties included|in charge of|was part of|part of a team|tasked with)\b/i;

const RESULT_RE =
  /\b\d+\+?\s*%|\b(?:reduc|increas|improv|boost|cut|grew|grow|sav|accelerat|shorten|speed(?:ed)? up|doubl|tripl)\w*\s+(?:it\s+)?(?:by\s+)?\d+/i;

const SCOPE_RE =
  /\b(\d+[,.]?\d*\+?\s*(?:users?|customers?|clients?|stores?|countries?|platforms?|team\s+members?|engineers?|requests?|records?|stakeholders?))\b|\b(?:across|serving|supporting|used by)\b/i;

/** Scans a candidate's own extracted skills for a mention in the bullet —
 *  never guesses a technology that isn't already something they listed. */
function hasKnownTechnology(bullet: string, skills: string[]): boolean {
  const lower = bullet.toLowerCase();
  return skills.some((s) => s.trim().length > 1 && lower.includes(s.trim().toLowerCase()));
}

function buildTip(missing: BulletFormulaPart[]): string {
  if (missing.length === 0) return "Covers action, technology, scope, and result.";
  if (missing.includes("Result")) return "Add a measurable result — how much did this improve, for how many people, or by how much time/cost?";
  if (missing.includes("Action")) return "Start with a strong action verb (Built, Led, Reduced, Launched) instead of a passive phrase.";
  if (missing.includes("Technology")) return "Name the specific tool or technology you used, if one applies.";
  return "Add scope — team size, user count, or the breadth of what this touched.";
}

/** Checks each WORK EXPERIENCE bullet against the Action+Technology+Scope+
 *  Result formula. Only flags bullets missing Action or Result (the two
 *  parts most likely to matter to a recruiter) to avoid over-flagging. */
export function checkBulletFormulas(profile: CandidateProfile): BulletFormulaResult[] {
  const work = profile.parsedSections.WORK_EXPERIENCE || "";
  const skills = profile.extractedSkills;
  const results: BulletFormulaResult[] = [];

  for (const rawLine of work.split("\n")) {
    const line = rawLine.trim();
    if (!/^[-•*]\s+/.test(line)) continue;
    const bullet = line.replace(/^[-•*]\s+/, "").trim();
    if (bullet.length < 20) continue;

    const hasAction = !WEAK_START_RE.test(bullet);
    const hasTechnology = hasKnownTechnology(bullet, skills);
    const hasScope = SCOPE_RE.test(bullet);
    const hasResult = RESULT_RE.test(bullet);

    const missing: BulletFormulaPart[] = [];
    if (!hasAction) missing.push("Action");
    if (!hasTechnology) missing.push("Technology");
    if (!hasScope) missing.push("Scope");
    if (!hasResult) missing.push("Result");

    if (!missing.includes("Action") && !missing.includes("Result")) continue;

    results.push({ bullet, hasAction, hasTechnology, hasScope, hasResult, missing, tip: buildTip(missing) });
  }

  return results.slice(0, 10);
}
