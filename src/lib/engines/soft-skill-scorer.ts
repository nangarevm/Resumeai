import type { CandidateProfile, JobDescription } from "../models";
import type { CareerVault } from "../srs-models";
import { approvedEvidence } from "./career-vault";
import { expandSynonyms } from "./synonym-lexicon";

export interface SoftSkillDimensions {
  leadershipMatch: number;
  communicationMatch: number;
  aiRelevanceMatch: number;
  leadershipNote: string;
  communicationNote: string;
  aiRelevanceNote: string;
}

const LEADERSHIP_HINTS = ["leadership", "led", "lead", "mentor", "managed", "people management", "team lead", "head of"];
const COMMUNICATION_HINTS = ["communication", "stakeholder", "presentation", "client", "collaborat", "cross-functional"];
const AI_HINTS = [
  "machine learning",
  "artificial intelligence",
  "llm",
  "generative ai",
  "deep learning",
  "nlp",
  "computer vision",
  "mlops",
  "pytorch",
  "tensorflow"
];

export function scoreSoftSkillDimensions(
  profile: CandidateProfile,
  jd: JobDescription,
  vault?: CareerVault
): SoftSkillDimensions {
  const vaultText = vault ? approvedEvidence(vault).map((e) => e.content).join(" ") : "";
  const resumeBlob = `${profile.rawResumeText} ${vaultText}`.toLowerCase();
  const jdBlob = `${jd.rawText} ${(jd.responsibilities || []).join(" ")}`.toLowerCase();

  const leadership = dimensionScore(jdBlob, resumeBlob, LEADERSHIP_HINTS, "leadership");
  const communication = dimensionScore(jdBlob, resumeBlob, COMMUNICATION_HINTS, "communication");
  const aiRelevance = dimensionScore(jdBlob, resumeBlob, AI_HINTS, "AI/ML");

  return {
    leadershipMatch: leadership.score,
    communicationMatch: communication.score,
    aiRelevanceMatch: aiRelevance.score,
    leadershipNote: leadership.note,
    communicationNote: communication.note,
    aiRelevanceNote: aiRelevance.note
  };
}

function dimensionScore(
  jdBlob: string,
  resumeBlob: string,
  hints: string[],
  label: string
): { score: number; note: string } {
  const jdHits = hints.filter((h) => jdBlob.includes(h));
  if (!jdHits.length) {
    return {
      score: 72,
      note: `${label} not emphasized in this JD — neutral baseline.`
    };
  }

  const expanded = new Set<string>();
  for (const hit of jdHits) {
    expandSynonyms(hit).forEach((a) => expanded.add(a));
  }

  const resumeHits = [...expanded].filter((a) => a.length >= 3 && resumeBlob.includes(a));
  const ratio = resumeHits.length / Math.max(jdHits.length, 1);
  const score = Math.min(100, Math.round(40 + ratio * 60));

  if (resumeHits.length === 0) {
    return {
      score: Math.max(15, Math.round(score * 0.4)),
      note: `JD asks for ${label} — no clear vault/resume proof yet.`
    };
  }

  return {
    score,
    note: `Evidenced via: ${resumeHits.slice(0, 4).join(", ")}.`
  };
}
