import type { EvaluationResult } from "../models";

export function rankCandidates(results: EvaluationResult[]): EvaluationResult[] {
  results.sort((r1, r2) => {
    if (r1.isShortlisted !== r2.isShortlisted) return r1.isShortlisted ? -1 : 1;
    const scoreComp = r2.qualificationScore - r1.qualificationScore;
    if (scoreComp !== 0) return scoreComp;
    return countStrongEvidence(r2) - countStrongEvidence(r1);
  });
  for (const res of results) res.explanationText = generateExplanation(res);
  return results;
}

function countStrongEvidence(result: EvaluationResult): number {
  return result.evidenceList.filter((ev) => ev.strength === "STRONG").length;
}

function generateExplanation(result: EvaluationResult): string {
  if (!result.isShortlisted) {
    return `Not shortlisted under ${result.modeTitle}. Reason: ${result.rejectionReason}.`;
  }
  const lines = [
    `Candidate achieved a ${Math.round(result.qualificationScore)}% qualification score under ${result.modeTitle}.`,
    `- Demonstrates strong evidence for ${countStrongEvidence(result)} requirement(s).`
  ];
  if (result.strongAreas.length) lines.push(`- Key Strengths: ${result.strongAreas.join(", ")}.`);
  if (result.missingRequirements.length) lines.push(`- Missing Requirements: ${result.missingRequirements.join(", ")}.`);
  if (result.verificationFlags.length) lines.push(`- Clarification Flags: ${result.verificationFlags.join(", ")}.`);
  return lines.join("\n");
}
