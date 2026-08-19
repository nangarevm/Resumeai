import type { CandidateProfile, JobDescription } from "../models";
import { extractEvidence } from "./evidence-engine";
import { generateQuestions } from "./interview-engine";
import { evaluateCandidate } from "./mode-evaluator";
import { populateSkillGaps } from "./skill-gap-engine";
import { verifyClaims } from "./claim-verification";
import type { CareerVault } from "../srs-models";
import { approvedEvidence } from "./career-vault";

export function buildInterviewPrep(profile: CandidateProfile, jd: JobDescription, vault: CareerVault) {
  const evidence = extractEvidence(profile, jd);
  const result = evaluateCandidate(profile, jd, "BALANCED", evidence);
  result.claims = verifyClaims(profile);
  populateSkillGaps(result);
  const questions = generateQuestions(result, jd);

  const stories = approvedEvidence(vault)
    .filter((e) => e.type === "project" || e.type === "work" || e.type === "achievement")
    .slice(0, 5)
    .map((e) => ({
      evidenceId: e.id,
      situation: `From ${e.source}: ${e.content.slice(0, 120)}`,
      task: "Explain the problem you owned — not the team's entire outcome.",
      action: "Name tools and decisions that appear in the vault item.",
      result: "Only quote a metric if this vault item already contains it."
    }));

  const thankYouNote = `Hi, thank you for discussing ${jd.title} at ${jd.companyName}. I can walk through ${stories[0]?.situation || "a project already on my resume"} using STAR — I will not add metrics that are not in my Career Vault.`;

  return { questions, stories, missingPrep: result.missingRequirements, thankYouNote };
}
