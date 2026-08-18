import type { CandidateProfile, JobDescription } from "../models";
import { extractEvidence } from "./evidence-engine";
import type { CareerVault, TailorSuggestion, FitReport } from "../srs-models";
import { approvedEvidence } from "./career-vault";
import { emphasizeRequirement } from "./tailoring-helpers";
import { suggestSummaryLine } from "./summary-suggestion";

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

export function buildSummaryTailorSuggestion(
  profile: CandidateProfile,
  jd: JobDescription,
  fit: FitReport | null
): TailorSuggestion | null {
  const coreMatches = fit?.coreMatches || [];
  const summaryLine = fit?.optimizer?.summarySuggestion || suggestSummaryLine(profile, jd, coreMatches);
  if (!summaryLine) return null;

  const existing =
    profile.parsedSections.SUMMARY?.split("\n").find((l) => l.trim().length > 0)?.trim() ||
    "(no summary section)";

  return {
    id: "sug-summary",
    kind: "summary",
    original: existing,
    proposed: summaryLine,
    evidenceIds: [],
    confidence: 88,
    reason: "JD-aligned summary from evidenced core skills — review before accepting.",
    status: "pending",
    blocked: false
  };
}

export function applySummaryToResume(resumeText: string, summaryLine: string): string {
  const base = resumeText;
  if (/SUMMARY/i.test(base)) {
    return base.replace(/SUMMARY[\s\n]*[^\n]+/i, `SUMMARY\n${summaryLine}`);
  }
  return `SUMMARY\n${summaryLine}\n\n${base}`;
}

export function injectSummaryTailorSuggestion(
  profile: CandidateProfile,
  jd: JobDescription,
  fit: FitReport | null,
  suggestions: TailorSuggestion[]
): TailorSuggestion[] {
  const summary = buildSummaryTailorSuggestion(profile, jd, fit);
  if (!summary) return suggestions;
  if (suggestions.some((s) => s.kind === "summary")) return suggestions;
  return [summary, ...suggestions];
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
