import Anthropic from "@anthropic-ai/sdk";
import type { CandidateProfile, JobDescription } from "../models";

// Cover letters / summaries / bullet rewrites are well-scoped writing tasks,
// not open-ended reasoning — Sonnet matches Opus quality here at roughly
// 40% of the per-token cost (both input and output), so it's the better
// default for a cost-sensitive, high-volume feature like this one.
const MODEL = "claude-sonnet-5";

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

/** Job postings routinely carry 300-600+ tokens of boilerplate (benefits,
 *  EEO statements, application instructions) that add cost without adding
 *  signal for writing a cover letter. Requirements/responsibilities are
 *  already parsed out elsewhere in the app — reuse that structured data
 *  instead of paying to re-read the raw posting on every call. */
export function buildJobContext(job: JobDescription): string {
  const mandatory = job.mandatoryRequirements.slice(0, 8).map((r) => r.name);
  const preferred = job.preferredRequirements.slice(0, 5).map((r) => r.name);
  const responsibilities = (job.responsibilities || []).slice(0, 5);
  return [
    `Title: ${job.title}`,
    `Company: ${job.companyName}`,
    job.seniority ? `Seniority: ${job.seniority}` : "",
    mandatory.length ? `Must-have requirements: ${mandatory.join(", ")}` : "",
    preferred.length ? `Preferred requirements: ${preferred.join(", ")}` : "",
    responsibilities.length ? `Key responsibilities:\n${responsibilities.map((r) => `- ${r}`).join("\n")}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

/** The candidate/job context is identical across every generation in a
 *  session (cover letter, summary, or a regenerate with a tweaked
 *  instruction) — split it into its own cacheable block so repeat calls
 *  in the same session re-read it at a fraction of the input price
 *  instead of paying full price for the resume text every time. */
export function buildContextBlock(req: AiGenerateRequest): string {
  const { profile, job } = req;
  return [`CANDIDATE NAME: ${profile.name}`, `RESUME:\n${profile.rawResumeText}`, job ? `\nTARGET JOB:\n${buildJobContext(job)}` : ""]
    .filter(Boolean)
    .join("\n");
}

function buildTaskBlock(req: AiGenerateRequest): string {
  return req.userPrompt ? `INSTRUCTION FROM CANDIDATE: ${req.userPrompt}` : "Write the requested content based on the context above.";
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
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: buildContextBlock(req), cache_control: { type: "ephemeral" } },
          { type: "text", text: buildTaskBlock(req) }
        ]
      }
    ]
  });

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  if (!textBlock) {
    throw new Error("AI generation returned no text output.");
  }
  return { text: textBlock.text.trim() };
}
