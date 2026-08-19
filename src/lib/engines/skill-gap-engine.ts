import type { EvaluationResult } from "../models";

export function populateSkillGaps(result: EvaluationResult): void {
  const strong: string[] = [];
  const partial: string[] = [];
  const missing: string[] = [];
  const verify: string[] = [];

  for (const ev of result.evidenceList) {
    if (ev.strength === "STRONG") strong.push(ev.requirementName);
    else if (ev.strength === "PARTIAL") partial.push(ev.requirementName);
    else if (ev.strength === "UNCLEAR") verify.push(`${ev.requirementName} (Vague/Passive context)`);
    else if (ev.strength === "NEGATIVE") missing.push(`${ev.requirementName} (Not Demonstrated)`);
    else missing.push(ev.requirementName);
  }

  result.strongAreas = strong;
  result.partialAreas = partial;
  result.missingRequirements = missing;
  result.verificationFlags = verify;
}
