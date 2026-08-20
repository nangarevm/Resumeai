import type { CandidateProfile, JobDescription } from "../models";

export function suggestSummaryLine(profile: CandidateProfile, jd: JobDescription, coreMatches: string[]): string {
  const skills = coreMatches.slice(0, 4);
  if (!skills.length) {
    return profile.parsedSections.SUMMARY?.split("\n")[0]?.trim() || `${profile.name} — add a summary from vault evidence.`;
  }
  const years = profile.rawResumeText.match(/(\d+)\+?\s*years?/i)?.[1];
  const hasWorkExperience = Boolean(profile.parsedSections.WORK_EXPERIENCE?.trim());
  // Defaulting to "Experienced" whenever no explicit year count was found used
  // to claim experience for candidates with none — e.g. a fresher whose resume
  // is only Projects + Education. Only claim "Experienced" when there's real
  // work-experience content to back it; otherwise use an honest entry-level lead.
  const lead = years
    ? `${years}+ years ${jd.title} professional`
    : hasWorkExperience
      ? `Experienced ${jd.title} professional`
      : `Aspiring ${jd.title}`;
  return `${lead} with evidenced strengths in ${skills.join(", ")} — all claims traceable to Career Vault.`;
}
