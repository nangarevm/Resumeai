import type {
  CandidateProfile,
  EvaluationModeName,
  EvaluationResult,
  Evidence,
  JobDescription,
  Requirement
} from "../models";
import { EVIDENCE_STRENGTH, EVALUATION_MODES, IMPORTANCE, REQUIREMENT_CATEGORIES } from "../models";

export function evaluateCandidate(
  candidate: CandidateProfile,
  jd: JobDescription,
  mode: EvaluationModeName,
  evidenceList: Evidence[]
): EvaluationResult {
  const result: EvaluationResult = {
    candidateId: candidate.id,
    candidateName: candidate.name,
    mode,
    modeTitle: EVALUATION_MODES[mode].title,
    qualificationScore: 0,
    isShortlisted: true,
    rejectionReason: "",
    evidenceList,
    claims: [],
    strongAreas: [],
    partialAreas: [],
    missingRequirements: [],
    verificationFlags: [],
    interviewQuestions: [],
    preferenceAlignment: "MEDIUM",
    explanationText: ""
  };

  if (mode === "STRICT") evaluateStrict(result, jd, evidenceList);
  else if (mode === "BALANCED") evaluateBalanced(result, jd, evidenceList);
  else evaluateBestMatch(result, jd, evidenceList);

  return result;
}

function evaluateStrict(result: EvaluationResult, jd: JobDescription, evidenceList: Evidence[]) {
  const failed: string[] = [];
  for (const req of jd.mandatoryRequirements) {
    const ev = findEvidence(req.name, evidenceList);
    if (!ev || ev.strength === "NOT_FOUND" || ev.strength === "NEGATIVE" || ev.strength === "UNCLEAR") {
      failed.push(req.name);
    }
  }
  if (failed.length) {
    result.isShortlisted = false;
    result.qualificationScore = 0;
    result.rejectionReason = `Missing mandatory requirement: ${failed.join(", ")}`;
  } else {
    result.isShortlisted = true;
    result.rejectionReason = "";
    result.qualificationScore = calculateWeightedScore(evidenceList, jd.mandatoryRequirements, jd.preferredRequirements);
  }
}

function evaluateBalanced(result: EvaluationResult, jd: JobDescription, evidenceList: Evidence[]) {
  let mandWeightedSum = 0;
  let mandTotalWeight = 0;
  const failed: string[] = [];

  for (const req of jd.mandatoryRequirements) {
    const ev = findEvidence(req.name, evidenceList);
    const w = IMPORTANCE[req.importance].weight;
    mandTotalWeight += w;
    if (ev) {
      mandWeightedSum += w * Math.max(0, EVIDENCE_STRENGTH[ev.strength].multiplier);
      if (ev.strength === "NOT_FOUND" || ev.strength === "NEGATIVE") failed.push(req.name);
    }
  }
  const mandRatio = mandTotalWeight > 0 ? mandWeightedSum / mandTotalWeight : 1;

  let prefWeightedSum = 0;
  let prefTotalWeight = 0;
  for (const req of jd.preferredRequirements) {
    const ev = findEvidence(req.name, evidenceList);
    const w = IMPORTANCE[req.importance].weight;
    prefTotalWeight += w;
    if (ev) prefWeightedSum += w * Math.max(0, EVIDENCE_STRENGTH[ev.strength].multiplier);
  }
  const prefRatio = prefTotalWeight > 0 ? prefWeightedSum / prefTotalWeight : 1;
  result.qualificationScore = Math.round((0.65 * mandRatio + 0.35 * prefRatio) * 100);

  if (failed.length) {
    result.isShortlisted = false;
    result.rejectionReason = `Did not satisfy mandatory requirements: ${failed.join(", ")}`;
  } else {
    result.isShortlisted = true;
    result.rejectionReason = "";
  }
}

function evaluateBestMatch(result: EvaluationResult, jd: JobDescription, evidenceList: Evidence[]) {
  result.isShortlisted = true;
  result.rejectionReason = "";
  const all = [...jd.mandatoryRequirements, ...jd.preferredRequirements];
  let totalWeightedScore = 0;
  let totalMaxWeight = 0;
  for (const req of all) {
    const ev = findEvidence(req.name, evidenceList);
    const combinedWeight = IMPORTANCE[req.importance].weight * REQUIREMENT_CATEGORIES[req.category].categoryWeight;
    totalMaxWeight += combinedWeight;
    if (ev) totalWeightedScore += combinedWeight * Math.max(0, EVIDENCE_STRENGTH[ev.strength].multiplier);
  }
  result.qualificationScore = totalMaxWeight > 0 ? Math.round((totalWeightedScore / totalMaxWeight) * 100) : 0;
}

function calculateWeightedScore(evidenceList: Evidence[], mandatory: Requirement[], preferred: Requirement[]): number {
  const all = [...mandatory, ...preferred];
  let earned = 0;
  let possible = 0;
  for (const req of all) {
    const ev = findEvidence(req.name, evidenceList);
    const w = IMPORTANCE[req.importance].weight;
    possible += w;
    if (ev) earned += w * Math.max(0, EVIDENCE_STRENGTH[ev.strength].multiplier);
  }
  return possible > 0 ? Math.round((earned / possible) * 100) : 0;
}

function findEvidence(reqName: string, evidenceList: Evidence[]): Evidence | undefined {
  return evidenceList.find((ev) => ev.requirementName.toLowerCase() === reqName.toLowerCase());
}
