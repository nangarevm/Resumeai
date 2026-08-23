/** Guided "fix these first" onboarding signal — the 3 most concrete, most
 *  actionable problems with a resume right now, ranked by impact. Reuses
 *  the same scoring already computed elsewhere (scoreAts, resume-health's
 *  category rollup) rather than inventing new heuristics; the difference
 *  from resume-health.ts's topImprovements is specificity — each failing
 *  ATS check already carries a precise, actionable detail string
 *  (ats-score-engine.ts), so this surfaces those directly instead of
 *  resume-health's rolled-up per-category text. Works immediately after a
 *  resume is saved, before any target job exists — scoreAts() is called
 *  without a JD, same choice resume-health.ts already makes for its own
 *  pre-job categories. */

import type { CandidateProfile } from "../models";
import type { CareerVault, FitReport } from "../srs-models";
import { scoreAts } from "./ats-score-engine";
import { computeResumeHealth } from "./resume-health";

export interface TopFix {
  id: string;
  title: string;
  detail: string;
}

const MAX_FIXES = 3;

export function computeTopFixes(profile: CandidateProfile, vault: CareerVault, fit: FitReport | null): TopFix[] {
  const ats = scoreAts(profile.rawResumeText);
  const fixes: TopFix[] = [...ats.checks]
    .filter((c) => !c.passed)
    .sort((a, b) => b.weight - a.weight)
    .map((c) => ({ id: `ats-${c.name}`, title: c.name, detail: c.detail }));

  if (fixes.length < MAX_FIXES) {
    const health = computeResumeHealth(profile, vault, fit);
    for (const improvement of health.topImprovements) {
      if (fixes.length >= MAX_FIXES) break;
      // Skip anything that's really the same advice as an ATS check already listed.
      if (fixes.some((f) => improvement.toLowerCase().includes(f.title.toLowerCase()))) continue;
      fixes.push({ id: `health-${fixes.length}`, title: "Strengthen your resume", detail: improvement });
    }
  }

  return fixes.slice(0, MAX_FIXES);
}
