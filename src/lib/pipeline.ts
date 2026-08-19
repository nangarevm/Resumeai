import type { CandidateProfile, EvaluationModeName, EvaluationResult, JobDescription } from "./models";
import { EVALUATION_MODES } from "./models";
import { extractEvidence } from "./engines/evidence-engine";
import { verifyClaims } from "./engines/claim-verification";
import { evaluateCandidate } from "./engines/mode-evaluator";
import { populateSkillGaps } from "./engines/skill-gap-engine";
import { generateQuestions } from "./engines/interview-engine";
import { calculateAlignment } from "./engines/preference-engine";
import { rankCandidates } from "./engines/ranking-engine";

export function analyzePool(
  candidates: CandidateProfile[],
  jd: JobDescription,
  mode: EvaluationModeName = "BALANCED"
): EvaluationResult[] {
  const results = candidates.map((candidate) => analyzeOne(candidate, jd, mode));
  return rankCandidates(results);
}

export function analyzeOne(
  candidate: CandidateProfile,
  jd: JobDescription,
  mode: EvaluationModeName = "BALANCED"
): EvaluationResult {
  const evidenceList = extractEvidence(candidate, jd);
  const claims = verifyClaims(candidate);
  const result = evaluateCandidate(candidate, jd, mode, evidenceList);
  result.modeTitle = EVALUATION_MODES[mode].title;
  result.claims = claims;
  populateSkillGaps(result);
  result.interviewQuestions = generateQuestions(result, jd);
  result.preferenceAlignment = calculateAlignment(candidate, jd);
  return result;
}
