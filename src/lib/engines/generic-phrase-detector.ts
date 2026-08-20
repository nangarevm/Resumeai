/** Generic Phrase Detector — section 8 of the AI Job Application Optimizer
 *  spec ("Professional Summary Generator", banned generic phrases).
 *
 *  Deliberately separate from integrity-check.ts: that engine flags
 *  claims worth RE-CONFIRMING (numbers, named tools — things that could
 *  be true or false). This engine flags claims that carry no checkable
 *  content at all — resume clichés that say nothing a recruiter can
 *  verify or act on — and nudges toward replacing them with real,
 *  evidence-backed wording instead. Deterministic phrase matching, not
 *  an LLM call. */

export interface GenericPhraseFinding {
  phrase: string;
  line: string;
  note: string;
}

interface PhraseRule {
  pattern: RegExp;
  display: string;
  note: string;
}

const DEFAULT_NOTE = "Says nothing a recruiter can verify — swap it for a specific, evidenced result.";

const PHRASE_RULES: PhraseRule[] = [
  { pattern: /\bresults[\s-]driven\b/i, display: "results-driven", note: DEFAULT_NOTE },
  { pattern: /\bresults[\s-]oriented\b/i, display: "results-oriented", note: DEFAULT_NOTE },
  { pattern: /\bteam\s+player\b/i, display: "team player", note: "Vague on its own — show it with a specific collaboration outcome instead." },
  { pattern: /\bhard[\s-]?working\b/i, display: "hardworking", note: DEFAULT_NOTE },
  { pattern: /\bself[\s-]?starter\b/i, display: "self-starter", note: DEFAULT_NOTE },
  { pattern: /\bgo[\s-]getter\b/i, display: "go-getter", note: DEFAULT_NOTE },
  { pattern: /\bthink(?:ing)?\s+outside\s+the\s+box\b/i, display: "think outside the box", note: DEFAULT_NOTE },
  { pattern: /\bproven\s+track\s+record\b/i, display: "proven track record", note: "Name the actual result instead of asserting there is one." },
  { pattern: /\bexcellent\s+communicat(?:ion|or)\b/i, display: "excellent communication skills", note: DEFAULT_NOTE },
  { pattern: /\bpassionate\s+about\b/i, display: "passionate about", note: DEFAULT_NOTE },
  { pattern: /\bdynamic\s+professional\b/i, display: "dynamic professional", note: DEFAULT_NOTE },
  { pattern: /\bhighly\s+motivated\b/i, display: "highly motivated", note: DEFAULT_NOTE },
  { pattern: /\bstrong\s+work\s+ethic\b/i, display: "strong work ethic", note: DEFAULT_NOTE },
  { pattern: /\bwear(?:s|ing)?\s+many\s+hats\b/i, display: "wears many hats", note: DEFAULT_NOTE },
  { pattern: /\bgo(?:es|ing)?\s+above\s+and\s+beyond\b/i, display: "go above and beyond", note: DEFAULT_NOTE },
  { pattern: /\bpeople\s+person\b/i, display: "people person", note: DEFAULT_NOTE },
  { pattern: /\bdetail[\s-]?oriented\b/i, display: "detail-oriented", note: DEFAULT_NOTE }
];

/** Scans plain resume text for generic/cliché phrasing — one finding per
 *  matching line per phrase, order preserved, deduplicated by line+phrase. */
export function detectGenericPhrases(resumeText: string): GenericPhraseFinding[] {
  const findings: GenericPhraseFinding[] = [];
  const seen = new Set<string>();

  for (const rawLine of resumeText.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    for (const rule of PHRASE_RULES) {
      if (!rule.pattern.test(line)) continue;
      const key = `${rule.display}::${line.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({ phrase: rule.display, line, note: rule.note });
    }
  }
  return findings;
}

/** Strips just the matched cliché text out of a line (not the whole line),
 *  leaving the rest of the sentence intact for the candidate to tidy up. */
export function stripGenericPhrase(line: string, phrase: string): string {
  const rule = PHRASE_RULES.find((r) => r.display === phrase);
  if (!rule) return line;
  return line.replace(rule.pattern, "").replace(/\s{2,}/g, " ").replace(/^[\s,.-]+|[\s,.-]+$/g, "");
}
