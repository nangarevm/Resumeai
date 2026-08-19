import Anthropic from "@anthropic-ai/sdk";
import type { CandidateProfile, JobDescription } from "../models";

const MODEL = "claude-opus-5";

export type AiGenerateKind = "cover_letter" | "summary" | "bullet_rewrite" | "custom";

export interface AiGenerateRequest {
  kind: AiGenerateKind;
  profile: CandidateProfile;
  job: JobDescription | null;
  /** Free-form instruction from the user — "emphasize my leadership", "make it warmer", etc. */
  userPrompt?: string;
}

export interface AiGenerateResult {
  text: string;
}

function isConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function buildSystemPrompt(kind: AiGenerateKind): string {
  const base =
    "You are a career-writing assistant helping a job seeker draft application material. " +
    "Write in a natural, confident, human voice — not corporate filler. Keep formatting plain text, no markdown.";
  switch (kind) {
    case "cover_letter":
      return `${base} Write a complete cover letter (3-5 short paragraphs) tailored to the job description provided. You may phrase and frame the candidate's background persuasively, but ground it in the resume content given to you.`;
    case "summary":
      return `${base} Write a 2-3 sentence resume summary/headline tailored to the job description provided.`;
    case "bullet_rewrite":
      return `${base} Rewrite the given resume bullet(s) to be more impactful and tailored to the job description, keeping them to one line each.`;
    default:
      return `${base} Follow the user's instruction directly, using the resume and job context provided.`;
  }
}

function buildUserPrompt(req: AiGenerateRequest): string {
  const { profile, job, userPrompt } = req;
  const parts = [
    `CANDIDATE NAME: ${profile.name}`,
    `RESUME:\n${profile.rawResumeText}`,
    job ? `\nTARGET JOB:\nTitle: ${job.title}\nCompany: ${job.companyName}\n${job.rawText}` : "",
    userPrompt ? `\nINSTRUCTION FROM CANDIDATE: ${userPrompt}` : ""
  ];
  return parts.filter(Boolean).join("\n");
}

/**
 * Free-form AI generation — unlike the rest of ResumeProof, this path lets the
 * model write persuasive prose that isn't strictly limited to Career Vault
 * evidence. Callers must label output as an AI draft the user should review,
 * not an evidence-bound ResumeProof claim.
 */
export async function generateWithAI(req: AiGenerateRequest): Promise<AiGenerateResult> {
  if (!isConfigured()) {
    throw new Error(
      "AI generation isn't configured on this deployment yet. Set the ANTHROPIC_API_KEY environment variable to enable it."
    );
  }

  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt(req.kind),
    messages: [{ role: "user", content: buildUserPrompt(req) }]
  });

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  if (!textBlock) {
    throw new Error("AI generation returned no text output.");
  }
  return { text: textBlock.text.trim() };
}
