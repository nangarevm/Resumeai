import type { CandidateProfile } from "../models";

export function searchCandidates(candidates: CandidateProfile[], query: string | null | undefined): CandidateProfile[] {
  if (!query || !query.trim()) return candidates;
  const terms = query
    .toLowerCase()
    .split(/[,+&]|\band\b/)
    .map((t) => t.trim())
    .filter(Boolean);

  return candidates.filter((c) => {
    const fullText = c.rawResumeText.toLowerCase();
    return terms.every((term) => fullText.includes(term));
  });
}
