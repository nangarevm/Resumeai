/** Recruiter 10-Second Test — section 14 of the AI Job Application
 *  Optimizer spec. Deliberately a deterministic heuristic, not an LLM
 *  call: it simulates what a skimming recruiter would actually notice
 *  from the TOP of the resume (name, first lines, headline skills) —
 *  consistent with the rest of the product's zero-hallucination
 *  architecture, where the one LLM-backed feature (AI cover letter
 *  generation) is explicitly, separately labeled as such. */

import type { CandidateProfile, JobDescription } from "../models";
import type { CareerVault } from "../srs-models";
import { computeAchievementMatch } from "./achievement-score";

export interface RecruiterViewReport {
  immediatelyClear: string[];
  missingOrUnclear: string[];
}

const SKIM_WINDOW = 320; // characters — roughly what a 10-second skim actually reads

export function computeRecruiterView(profile: CandidateProfile, vault: CareerVault, jd?: JobDescription): RecruiterViewReport {
  const clear: string[] = [];
  const unclear: string[] = [];
  const topText = profile.rawResumeText.slice(0, SKIM_WINDOW);
  const topLower = topText.toLowerCase();

  if (profile.name) clear.push(profile.name);

  const targetRole = jd?.title || profile.preferences.preferredRoles[0];
  if (targetRole) {
    if (topLower.includes(targetRole.toLowerCase())) clear.push(targetRole);
    else unclear.push("Target role not prominent enough — put it in your first line or summary, not buried lower down.");
  }

  const yearsMatch = topText.match(/(\d+)\+?\s*years?/i) || profile.rawResumeText.match(/(\d+)\+?\s*years?/i);
  const hasWorkExperience = Boolean(profile.parsedSections.WORK_EXPERIENCE?.trim());
  if (yearsMatch) {
    clear.push(`${yearsMatch[0]} experience`);
  } else if (hasWorkExperience) {
    unclear.push("Years of experience isn't stated clearly near the top.");
  }

  const topSkills = profile.extractedSkills.slice(0, 3);
  if (topSkills.length) clear.push(topSkills.join("/"));
  else unclear.push("No skills are visible near the top of the resume.");

  const achievement = computeAchievementMatch(vault);
  if (achievement.score >= 55) {
    clear.push("Measurable results are visible");
  } else {
    unclear.push("Limited measurable achievements — a 10-second skim finds no quick proof of impact.");
  }

  if (jd) {
    const mandatory = jd.mandatoryRequirements.slice(0, 5);
    for (const req of mandatory) {
      const name = req.name.toLowerCase();
      if (topLower.includes(name)) continue;
      const anywhereInResume = profile.rawResumeText.toLowerCase().includes(name);
      if (anywhereInResume) unclear.push(`${req.name} experience isn't visible in the first few lines — a recruiter may miss it.`);
    }
  }

  return { immediatelyClear: clear, missingOrUnclear: unclear.slice(0, 6) };
}
