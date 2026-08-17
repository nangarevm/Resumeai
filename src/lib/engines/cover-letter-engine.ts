import type { CandidateProfile, CoverLetterResult, JobDescription } from "../models";
import { extractEvidence } from "./evidence-engine";
import { verifyClaims } from "./claim-verification";

export function generateCoverLetter(candidate: CandidateProfile, jd: JobDescription): CoverLetterResult {
  const evidence = extractEvidence(candidate, jd);
  const claims = verifyClaims(candidate);
  const usedEvidence: string[] = [];
  const blockedClaims: string[] = [];

  const strong = evidence.filter((e) => e.strength === "STRONG" || e.strength === "PARTIAL");
  for (const ev of strong) usedEvidence.push(`${ev.requirementName}: ${ev.snippet}`);
  for (const claim of claims) {
    if (claim.strength === "UNCLEAR" || claim.verificationScore < 50) blockedClaims.push(claim.claimText);
  }
  for (const ev of evidence.filter((e) => e.strength === "NOT_FOUND" || e.strength === "NEGATIVE")) {
    blockedClaims.push(`Do not claim ${ev.requirementName} — no resume evidence.`);
  }

  const proofLines = strong.slice(0, 3).map((ev) => {
    return `- ${ev.requirementName}: ${ev.snippet}`;
  });

  const letter = [
    `Dear ${jd.companyName} hiring team,`,
    "",
    `I am applying for the ${jd.title} role. This note only references work already present on my resume — no extra metrics, titles, or tools.`,
    "",
    proofLines.length
      ? `Evidence I can discuss in interview:\n${proofLines.join("\n")}`
      : "I would like to walk through the projects on my resume and map them to your requirements without inflating scope.",
    "",
    candidate.preferences.preferredRoles.length
      ? `This direction matches my stated interest in ${candidate.preferences.preferredRoles.join(", ")}.`
      : "",
    "",
    "I would welcome a conversation about how the work above maps to your current problems.",
    "",
    `Sincerely,\n${candidate.name}`
  ]
    .filter((line) => line !== "")
    .join("\n");

  return { letter, usedEvidence, blockedClaims };
}
