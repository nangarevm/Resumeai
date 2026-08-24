/** Interview Prep categorization — section 19 of the AI Job Application
 *  Optimizer spec (Technical / Resume / Gap / HR buckets).
 *
 *  interview-engine.ts already generates evidence-bound questions with a
 *  free-form `category` string ("Domain Expertise Deep-Dive", "Claim
 *  Verification", "Skill Gap Assessment", ...). This module only groups
 *  those into the four buckets the spec asks for, and adds a fixed set
 *  of standard HR/behavioral questions — prompts TO the candidate, not
 *  claims about them, so there's no fabrication risk in including them
 *  for every job. */

import type { InterviewQuestion, JobDescription } from "../models";

export type InterviewBucket = "Technical" | "Resume" | "Gap" | "HR";

export const BUCKET_ORDER: InterviewBucket[] = ["Technical", "Resume", "Gap", "HR"];

const CATEGORY_TO_BUCKET: Record<string, InterviewBucket> = {
  "Domain Expertise Deep-Dive": "Technical",
  "Mastery & Optimization": "Technical",
  "Claim Verification": "Resume",
  "Skill Gap Assessment": "Gap"
};

export function bucketForCategory(category: string): InterviewBucket {
  return CATEGORY_TO_BUCKET[category] || "Technical";
}

export function standardHrQuestions(jd: JobDescription): InterviewQuestion[] {
  return [
    {
      target: "intro",
      question: `Tell me about yourself and why you're interested in the ${jd.title} role at ${jd.companyName}.`,
      category: "HR",
      priority: 1,
      starGuide: "Lead with your current focus, one proof point from your resume, then why this role specifically."
    },
    {
      target: "motivation",
      question: `Why are you looking to leave your current role, and why ${jd.companyName}?`,
      category: "HR",
      priority: 1,
      starGuide: "Stay forward-looking — what you're moving toward, not just what you're leaving."
    },
    {
      target: "conflict",
      question: "Describe a time you disagreed with a teammate or manager. How did you handle it?",
      category: "HR",
      priority: 2,
      starGuide: "Use a real situation from your own work — Situation, your specific action, the resolution."
    },
    {
      target: "growth",
      question: "What's a strength you rely on, and a growth area you're actively working on?",
      category: "HR",
      priority: 2,
      starGuide: "Pick a growth area you have a concrete plan for — not a disguised strength."
    },
    {
      target: "expectations",
      question: "What are your salary expectations for this role?",
      category: "HR",
      priority: 3,
      starGuide: "Research the range beforehand; give a range, not a single number, and confirm it's negotiable."
    },
    {
      target: "trajectory",
      question: "Where do you see yourself in 3-5 years?",
      category: "HR",
      priority: 3,
      starGuide: "Connect it to the growth this specific role could realistically offer."
    }
  ];
}

/** Groups evidence-bound questions into Technical/Resume/Gap buckets by
 *  their existing category, and appends the standard HR set. Buckets
 *  with no questions are omitted entirely. */
export function categorizeInterviewQuestions(
  questions: InterviewQuestion[],
  jd: JobDescription
): Partial<Record<InterviewBucket, InterviewQuestion[]>> {
  const grouped: Partial<Record<InterviewBucket, InterviewQuestion[]>> = {};
  for (const q of questions) {
    const bucket = bucketForCategory(q.category);
    (grouped[bucket] ||= []).push(q);
  }
  grouped.HR = standardHrQuestions(jd);
  return grouped;
}
