/** Weekly re-engagement email — computed content only, no email transport
 *  here (see lib/auth/email.ts's existing sendEmail(), reused as-is by the
 *  cron route). Reuses vaultCompleteness and computeResumeHealth exactly
 *  as the candidate dashboard does, so the digest never says anything the
 *  in-app UI wouldn't also say. */

import type { SeekerWorkspace } from "../srs-models";
import { vaultCompleteness } from "./career-vault";
import { computeResumeHealth } from "./resume-health";

export interface DigestContent {
  subject: string;
  text: string;
  healthPercent: number;
}

/** Returns null when there's nothing worth emailing — no resume saved yet
 *  is the only hard stop; everything else (no change since last week, no
 *  outstanding improvements) still gets a short "you're on track" note
 *  rather than going silent, since this is meant to be a habitual touch. */
export function computeDigestContent(seeker: SeekerWorkspace, previousHealthPercent: number | null): DigestContent | null {
  if (!seeker.profile.rawResumeText?.trim()) return null;

  const health = vaultCompleteness(seeker.vault);
  const resumeHealth = computeResumeHealth(seeker.profile, seeker.vault, seeker.fit);
  const delta = previousHealthPercent === null ? null : health.percent - previousHealthPercent;
  const deltaLine =
    delta === null
      ? ""
      : delta > 0
        ? `That's up ${delta} point${delta === 1 ? "" : "s"} since your last digest.`
        : delta < 0
          ? `That's down ${Math.abs(delta)} point${Math.abs(delta) === 1 ? "" : "s"} since your last digest.`
          : "No change since your last digest.";

  const text = [
    `Your Career Vault is ${health.percent}% complete (${health.approvedCount}/${health.total} evidence items approved).`,
    deltaLine,
    "",
    resumeHealth.topImprovements.length ? "Top things to improve this week:" : "Nothing urgent flagged — your resume looks solid.",
    ...resumeHealth.topImprovements.slice(0, 3).map((t) => `- ${t}`),
    "",
    "Open ResumeProof to keep building your evidence-backed resume."
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `Your weekly ResumeProof digest — ${health.percent}% complete`,
    text,
    healthPercent: health.percent
  };
}
