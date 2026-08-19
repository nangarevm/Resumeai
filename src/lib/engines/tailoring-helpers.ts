import { expandSynonyms } from "./synonym-lexicon";

/** Lead a multi-word bullet with the matched requirement/synonym term so the proof
 *  reads first. Bare skill tokens (e.g. a single "SQL" pulled from a skills list)
 *  are already maximally prominent and are returned unchanged. No words are added
 *  or removed — only which term leads the line changes. */
export function emphasizeRequirement(snippet: string, requirement: string): string {
  const clean = normalizeSnippet(snippet);
  if (!clean) return clean;

  const wordCount = clean.split(/\s+/).filter(Boolean).length;
  if (wordCount <= 3) return clean;

  const lower = clean.toLowerCase();
  const reqLower = requirement.toLowerCase().trim();

  let lead: string | null = null;
  if (reqLower && lower.includes(reqLower)) {
    lead = requirement.trim();
  } else {
    const synonyms = expandSynonyms(requirement);
    const hit = synonyms.find((s) => s.length >= 3 && lower.includes(s));
    if (hit) lead = hit.replace(/^\w/, (c) => c.toUpperCase());
  }

  if (!lead || lower.startsWith(lead.toLowerCase())) return clean;

  return `${lead} — ${clean}`;
}

/** Fix truncated snippets and broken parentheses from sentence splitting. */
export function normalizeSnippet(snippet: string): string {
  let clean = snippet.replace(/^[-•*]\s*/, "").trim();
  if (!clean) return clean;

  const open = (clean.match(/\(/g) || []).length;
  const close = (clean.match(/\)/g) || []).length;
  if (open > close) {
    clean = clean.replace(/\([^)]*$/, "").replace(/[,;]\s*$/, "").trim();
  }

  return clean.replace(/\s{2,}/g, " ").trim();
}
