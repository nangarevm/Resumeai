import type { EvidenceStrengthName } from "../models";

const NEGATION_TRIGGERS = [
  "no experience",
  "never used",
  "not familiar",
  "lack of experience",
  "without experience",
  "have not worked",
  "no exposure",
  "didn't use",
  "don't know",
  "did not use",
  "not used"
];

const STRONG_ACTION_VERBS = [
  "developed",
  "built",
  "engineered",
  "implemented",
  "created",
  "designed",
  "deployed",
  "architected",
  "spearheaded",
  "trained",
  "analyzed",
  "processed",
  "achieved",
  "evaluated",
  "worked on",
  "delivered",
  "launched",
  "optimized"
];

const COURSEWORK_TRIGGERS = [
  "coursework",
  "academic course",
  "studied",
  "learned in class",
  "curriculum",
  "training",
  "online course",
  "tutorial"
];

const WEAK_TRIGGERS = [
  "interested in",
  "familiar with",
  "learning",
  "exposure to",
  "basic knowledge",
  "knowledge of",
  "aspiring"
];

/** Suggestion: treat competency phrasing as evidence, not as silence. */
const EXPERIENCE_TRIGGERS = [
  "experienced in",
  "experienced with",
  "proficient in",
  "skilled in",
  "hands-on experience",
  "practical experience",
  "working knowledge"
];

export function isNegated(sentence: string, keyword?: string): boolean {
  const lower = sentence.toLowerCase();
  if (NEGATION_TRIGGERS.some((t) => lower.includes(t))) return true;
  if (keyword) {
    const kw = keyword.toLowerCase();
    const idx = lower.indexOf(kw);
    if (idx >= 0) {
      const window = lower.slice(Math.max(0, idx - 40), idx + kw.length + 12);
      if (/\b(no|not|never|without)\b/.test(window) && /(experience|used|familiar|exposure|know)/.test(window)) {
        return true;
      }
    }
  }
  return false;
}

export function classifyContext(
  sentence: string | null | undefined,
  sectionName: string,
  keyword: string
): EvidenceStrengthName {
  if (!sentence || !sentence.trim()) return "NOT_FOUND";
  const lowerSentence = sentence.toLowerCase();

  if (isNegated(lowerSentence, keyword)) return "NEGATIVE";

  const hasStrongVerb = STRONG_ACTION_VERBS.some((verb) => lowerSentence.includes(verb));
  const hasExperiencePhrase = EXPERIENCE_TRIGGERS.some((t) => lowerSentence.includes(t));

  if (
    hasStrongVerb &&
    (sectionName === "PROJECTS" ||
      sectionName === "WORK_EXPERIENCE" ||
      lowerSentence.includes("project") ||
      lowerSentence.includes("system"))
  ) {
    return "STRONG";
  }

  if (COURSEWORK_TRIGGERS.some((cw) => lowerSentence.includes(cw))) return "PARTIAL";
  if (WEAK_TRIGGERS.some((weak) => lowerSentence.includes(weak))) return "UNCLEAR";

  if (hasExperiencePhrase) {
    if (sectionName === "PROJECTS" || sectionName === "WORK_EXPERIENCE") return "PARTIAL";
    if (sectionName === "SKILLS" || sectionName === "SUMMARY") return "PARTIAL";
    return "PARTIAL";
  }

  if (hasStrongVerb) return "STRONG";
  if (sectionName === "SKILLS") return "PARTIAL";
  return "UNCLEAR";
}
