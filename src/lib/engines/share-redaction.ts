import { parseResume } from "../parsers/resume-parser";

/** A shared review link is technically public (unguessable token, but
 *  still reachable by anyone who has it) — redact direct contact info by
 *  default rather than exposing a candidate's personal email/phone to
 *  whoever ends up with the link. Reuses the same parser the rest of the
 *  app uses for extraction, so it stays correct as that parser evolves. */
export function redactContactInfo(resumeText: string): string {
  const profile = parseResume("share-preview", resumeText);
  let redacted = resumeText;
  if (profile.email) {
    redacted = redacted.split(profile.email).join("(hidden for this shared link)");
  }
  if (profile.phone) {
    redacted = redacted.split(profile.phone).join("(hidden for this shared link)");
  }
  return redacted;
}
