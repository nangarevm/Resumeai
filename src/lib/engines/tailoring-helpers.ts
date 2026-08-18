import { expandSynonyms } from "./synonym-lexicon";

export function emphasizeRequirement(snippet: string, requirement: string): string {
  const clean = normalizeSnippet(snippet);
  const lower = clean.toLowerCase();
  const reqLower = requirement.toLowerCase().trim();

  if (reqLower && lower.includes(reqLower)) return clean;

  const synonyms = expandSynonyms(requirement);
  const hasRelated = synonyms.some((s) => s.length >= 3 && lower.includes(s));
  if (hasRelated) return clean;

  return clean;
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
