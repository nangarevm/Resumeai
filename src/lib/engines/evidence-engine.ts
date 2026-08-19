import type { CandidateProfile, Evidence, EvidenceStrengthName, JobDescription, Requirement } from "../models";
import { allRequirements, EVIDENCE_STRENGTH } from "../models";
import { classifyContext } from "./context-engine";
import { expandSynonyms } from "./synonym-lexicon";
import { splitSentences } from "../parsers/text-normalizer";

const SECTION_KEYS = ["PROJECTS", "WORK_EXPERIENCE", "SKILLS", "SUMMARY", "EDUCATION", "CERTIFICATIONS"];

export function extractEvidence(candidate: CandidateProfile, jd: JobDescription): Evidence[] {
  return allRequirements(jd).map((req) => findEvidenceForRequirement(candidate, req));
}

export function findEvidenceForRequirement(candidate: CandidateProfile, req: Requirement): Evidence {
  const keywords = expandSynonyms(req.name, req.synonyms);
  const sections = candidate.parsedSections;

  let bestStrength: EvidenceStrengthName = "NOT_FOUND";
  let bestSnippet = "No relevant evidence found in candidate profile.";
  let bestSection = "None";
  let bestNote = "Requirement missing from resume text.";
  let confidence = 0;

  for (const secKey of SECTION_KEYS) {
    const content = sections[secKey];
    if (!content) continue;

    for (const sentence of splitSentences(content)) {
      const lower = sentence.toLowerCase();
      for (const kw of keywords) {
        if (!kw || !keywordPresent(lower, kw)) continue;
        const strength = classifyContext(sentence, secKey, kw);
        if (isStronger(strength, bestStrength)) {
          bestStrength = strength;
          bestSnippet = sentence;
          bestSection = formatSectionName(secKey);
          bestNote = generateContextNote(req.name, strength, secKey);
          confidence = calculateConfidence(strength, secKey);
        }
      }
    }
  }

  return {
    requirementName: req.name,
    strength: bestStrength,
    snippet: bestSnippet,
    sourceSection: bestSection,
    contextNote: bestNote,
    confidence
  };
}

function keywordPresent(haystack: string, keyword: string): boolean {
  const kw = keyword.toLowerCase().trim();
  if (!kw) return false;
  if (kw.length <= 3) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[^a-z0-9+#])${escaped}(?:$|[^a-z0-9+#])`, "i").test(haystack);
  }
  return haystack.includes(kw);
}

function isStronger(next: EvidenceStrengthName, current: EvidenceStrengthName): boolean {
  if (EVIDENCE_STRENGTH[next].multiplier > EVIDENCE_STRENGTH[current].multiplier) return true;
  if (current === "NOT_FOUND" && next === "NEGATIVE") return true;
  return false;
}

function formatSectionName(key: string): string {
  switch (key) {
    case "PROJECTS":
      return "Project Experience";
    case "WORK_EXPERIENCE":
      return "Work Experience";
    case "SKILLS":
      return "Technical Skills";
    case "EDUCATION":
      return "Education History";
    case "CERTIFICATIONS":
      return "Certifications";
    default:
      return "Profile Summary";
  }
}

function generateContextNote(reqName: string, strength: EvidenceStrengthName, section: string): string {
  switch (strength) {
    case "STRONG":
      return `Explicit contextual proof found in ${formatSectionName(section)} with action verb.`;
    case "PARTIAL":
      return `Academic, skills-list, or competency phrasing identified in ${formatSectionName(section)}.`;
    case "UNCLEAR":
      return `Passive or vague mention found in ${formatSectionName(section)}. Verification recommended.`;
    case "NEGATIVE":
      return `Explicit negation phrase detected regarding ${reqName}.`;
    default:
      return "No evidence found.";
  }
}

function calculateConfidence(strength: EvidenceStrengthName, section: string): number {
  let base = 0.5;
  if (strength === "STRONG") base = 0.95;
  else if (strength === "PARTIAL") base = 0.75;
  else if (strength === "UNCLEAR") base = 0.55;
  else if (strength === "NEGATIVE") base = 0.9;
  if (section === "PROJECTS" || section === "WORK_EXPERIENCE") base = Math.min(1, base + 0.05);
  return base;
}
