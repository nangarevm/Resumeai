import type { CandidateProfile, JobDescription } from "../models";
import { extractEvidence } from "./evidence-engine";
import type { CareerVault, TailorSuggestion } from "../srs-models";
import { approvedEvidence } from "./career-vault";
import { emphasizeRequirement } from "./tailoring-helpers";

export function generateTailoringSuggestions(
  profile: CandidateProfile,
  jd: JobDescription,
  vault: CareerVault
): TailorSuggestion[] {
  const evidenceList = extractEvidence(profile, jd);
  const approved = approvedEvidence(vault);
  const suggestions: TailorSuggestion[] = [];
  let n = 1;

  for (const ev of evidenceList) {
    if (ev.strength === "STRONG" || ev.strength === "PARTIAL") {
      const vaultHits = approved.filter((item) =>
        ev.snippet.toLowerCase().includes(item.content.toLowerCase().slice(0, 24)) ||
        item.tags.some((t) => ev.requirementName.toLowerCase().includes(t))
      );
      suggestions.push({
        id: `sug-${n++}`,
        original: ev.snippet,
        proposed: emphasizeRequirement(ev.snippet, ev.requirementName),
        evidenceIds: vaultHits.map((v) => v.id),
        confidence: Math.round(ev.confidence * 100),
        reason: `Keep this bullet near the top. '${ev.requirementName}' is already evidenced in ${ev.sourceSection}.`,
        status: "pending",
        blocked: false
      });
    } else if (ev.strength === "NOT_FOUND" || ev.strength === "NEGATIVE") {
      suggestions.push({
        id: `sug-${n++}`,
        original: "",
        proposed: `Do not add a '${ev.requirementName}' bullet unless you confirm a real project in Career Vault.`,
        evidenceIds: [],
        confidence: 95,
        reason: "No supporting Career Vault evidence. Inserting this keyword would be fabrication.",
        status: "pending",
        blocked: true
      });
    }
  }

  return suggestions.slice(0, 14);
}

export function applyAcceptedSuggestions(
  resumeText: string,
  suggestions: TailorSuggestion[]
): string {
  let next = resumeText;
  for (const s of suggestions) {
    if (s.blocked || s.status === "rejected") continue;
    if ((s.status === "accepted" || s.status === "edited") && s.original && s.proposed && s.original !== s.proposed) {
      next = next.replace(s.original, s.proposed);
    }
  }
  return next;
}
