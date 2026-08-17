import type { EvaluationResult, InterviewQuestion, JobDescription, Requirement } from "../models";
import { allRequirements } from "../models";

export function generateQuestions(result: EvaluationResult, jd: JobDescription): InterviewQuestion[] {
  const questions: InterviewQuestion[] = [];

  for (const ev of result.evidenceList) {
    const req = findRequirement(ev.requirementName, jd);
    if (!req || req.importance !== "HIGH") continue;
    if (ev.strength === "UNCLEAR" || ev.strength === "PARTIAL") {
      questions.push({
        target: ev.requirementName,
        question: `You noted experience with '${ev.requirementName}'. Could you describe a practical project or workflow where you applied '${ev.requirementName}' and explain your key decisions?`,
        category: "Domain Expertise Deep-Dive",
        priority: 1,
        starGuide: `Situation: the problem that required ${ev.requirementName}. Task: your ownership. Action: tools and decisions. Result: a measurable or observable outcome you can defend.`
      });
    } else if (ev.strength === "STRONG") {
      questions.push({
        target: ev.requirementName,
        question: `How did you measure, evaluate, and optimize your implementation of '${ev.requirementName}' in your recent project?`,
        category: "Mastery & Optimization",
        priority: 3,
        starGuide: "Ask for the metric, the baseline, what they changed, and what they would do differently."
      });
    }
  }

  for (const claim of result.claims) {
    if (claim.strength === "UNCLEAR" || claim.strength === "PARTIAL") {
      questions.push({
        target: claim.claimText,
        question: `Regarding your accomplishment claim: '${truncate(claim.claimText, 60)}', can you detail the underlying methodology, tools used, and your specific individual contribution?`,
        category: "Claim Verification",
        priority: 1,
        starGuide: "Separate personal contribution from team outcome. Reject unverifiable percentages."
      });
    }
  }

  for (const missingReq of result.missingRequirements) {
    const cleanName = missingReq.replace(/\s*\(.*\)/, "");
    questions.push({
      target: cleanName,
      question: `The ${jd.title} role emphasizes '${cleanName}', which was limited on your resume. What is your current practical exposure to '${cleanName}'?`,
      category: "Skill Gap Assessment",
      priority: 2,
      starGuide: "Probe coursework vs production use. Do not let keyword familiarity pass as delivery."
    });
  }

  return questions;
}

function findRequirement(name: string, jd: JobDescription): Requirement | undefined {
  return allRequirements(jd).find((r) => r.name.toLowerCase() === name.toLowerCase());
}

function truncate(str: string, maxLen: number): string {
  if (!str) return "";
  return str.length <= maxLen ? str : `${str.slice(0, maxLen)}...`;
}
