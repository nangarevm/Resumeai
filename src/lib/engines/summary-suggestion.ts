import type { CandidateProfile, JobDescription } from "../models";

export function suggestSummaryLine(profile: CandidateProfile, jd: JobDescription, coreMatches: string[]): string {
  const skills = coreMatches.slice(0, 4);
  if (!skills.length) {
    return profile.parsedSections.SUMMARY?.split("\n")[0]?.trim() || `${profile.name} — add a summary from vault evidence.`;
  }
  const years = profile.rawResumeText.match(/(\d+)\+?\s*years?/i)?.[1];
  const yearPhrase = years ? `${years}+ years` : "Experienced";
  return `${yearPhrase} ${jd.title} professional with evidenced strengths in ${skills.join(", ")} — all claims traceable to Career Vault.`;
}
