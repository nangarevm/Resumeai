import type { CandidateProfile, JobDescription } from "../models";
import type { CareerVault } from "../srs-models";
import { approvedEvidence } from "./career-vault";
import { expandSynonyms } from "./synonym-lexicon";
import { cleanToken } from "../parsers/text-normalizer";

export interface ResponsibilityMatchResult {
  score: number;
  matchedCount: number;
  totalCount: number;
  highlights: Array<{ responsibility: string; evidenceSnippet: string; coverage: number }>;
  gaps: string[];
}

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "your",
  "our",
  "will",
  "must",
  "have",
  "able",
  "work",
  "using",
  "including",
  "across",
  "within",
  "other",
  "such",
  "from",
  "this",
  "that",
  "their",
  "they",
  "you",
  "are",
  "was",
  "been",
  "being"
]);

export function scoreResponsibilityMatch(
  profile: CandidateProfile,
  jd: JobDescription,
  vault?: CareerVault
): ResponsibilityMatchResult {
  const responsibilities = jd.responsibilities || [];
  if (!responsibilities.length) {
    return { score: 0, matchedCount: 0, totalCount: 0, highlights: [], gaps: [] };
  }

  const vaultText = vault ? approvedEvidence(vault).map((e) => e.content).join(" ") : "";
  const blob = `${profile.rawResumeText} ${vaultText}`.toLowerCase();
  const sentences = blob.split(/\n|(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

  const highlights: ResponsibilityMatchResult["highlights"] = [];
  const gaps: string[] = [];

  for (const resp of responsibilities) {
    const match = matchResponsibilityLine(resp, blob, sentences);
    if (match.coverage >= 35) {
      highlights.push({
        responsibility: truncate(resp, 120),
        evidenceSnippet: truncate(match.snippet, 140),
        coverage: match.coverage
      });
    } else {
      gaps.push(truncate(resp, 100));
    }
  }

  const matchedCount = highlights.length;
  const score = Math.round((matchedCount / responsibilities.length) * 100);

  return {
    score,
    matchedCount,
    totalCount: responsibilities.length,
    highlights: highlights.slice(0, 8),
    gaps: gaps.slice(0, 6)
  };
}

function matchResponsibilityLine(
  responsibility: string,
  blob: string,
  sentences: string[]
): { coverage: number; snippet: string } {
  const tokens = significantTokens(responsibility);
  if (!tokens.length) return { coverage: 0, snippet: "" };

  const synonymHits = new Set<string>();
  for (const token of tokens.slice(0, 6)) {
    for (const alias of expandSynonyms(token)) {
      if (alias.length >= 3 && blob.includes(alias)) synonymHits.add(alias);
    }
  }

  const directHits = tokens.filter((t) => blob.includes(t));
  const hitCount = new Set([...directHits, ...synonymHits]).size;
  const coverage = Math.round((hitCount / tokens.length) * 100);

  let bestSnippet = "";
  let bestHits = 0;
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    const hits = tokens.filter((t) => lower.includes(t) || expandSynonyms(t).some((a) => lower.includes(a))).length;
    if (hits > bestHits) {
      bestHits = hits;
      bestSnippet = sentence;
    }
  }

  return { coverage, snippet: bestSnippet || "(keyword overlap only — no single bullet covers this duty)" };
}

function significantTokens(text: string): string[] {
  return [...new Set(text.toLowerCase().split(/[^a-z0-9+#]+/).map(cleanToken).filter((t) => t.length >= 4 && !STOP.has(t)))];
}

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}
