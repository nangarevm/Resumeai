/**
 * Shared plain-text-resume → structured-data parser, used to render the
 * resume draft into visual templates (ResumeTemplatePreview). Recognizes the
 * same section headers as resume-parser.ts / ResumeSectionEditor.tsx so all
 * three stay in sync on what counts as a header vs. a bullet vs. plain text.
 */

const META_RE = /^(NAME|EMAIL|PHONE|LOCATION|LINKEDIN|GITHUB|PORTFOLIO):\s*(.*)$/i;
const HEADER_RE =
  /^(SUMMARY|PROFILE SUMMARY|PROFILE|OBJECTIVE|CONTACT|SKILLS|TECHNICAL SKILLS|KEY SKILLS|WORK EXPERIENCE|EXPERIENCE|PROJECTS|EDUCATION|CERTIFICATIONS):?$/i;
const BULLET_RE = /^[-•*]\s+/;

export interface ResumeMeta {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
}

export interface ResumeSection {
  header: string;
  lines: Array<{ text: string; bullet: boolean }>;
}

export interface ParsedResume {
  meta: ResumeMeta;
  summary: string;
  sections: ResumeSection[];
}

export function parseResumeForRender(text: string): ParsedResume {
  const meta: ResumeMeta = { name: "", email: "", phone: "", location: "", linkedin: "", github: "", portfolio: "" };
  const sections: ResumeSection[] = [];
  let summaryLines: string[] = [];
  let current: ResumeSection | null = null;
  let inSummary = false;

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    const metaMatch = line.match(META_RE);
    if (metaMatch) {
      const key = metaMatch[1].toLowerCase() as keyof ResumeMeta;
      if (key in meta) meta[key] = metaMatch[2].trim();
      continue;
    }

    if (HEADER_RE.test(line)) {
      const label = line.replace(/:$/, "").trim();
      if (/^(SUMMARY|PROFILE SUMMARY|PROFILE|OBJECTIVE|CONTACT)$/i.test(label)) {
        inSummary = true;
        current = null;
        continue;
      }
      inSummary = false;
      current = { header: label.toUpperCase(), lines: [] };
      sections.push(current);
      continue;
    }

    if (inSummary) {
      summaryLines.push(line);
      continue;
    }

    if (!current) {
      // Text before any recognized header that isn't a meta line — treat as summary.
      summaryLines.push(line);
      continue;
    }

    const bullet = BULLET_RE.test(line);
    current.lines.push({ text: bullet ? line.replace(BULLET_RE, "") : line, bullet });
  }

  return { meta, summary: summaryLines.join(" "), sections };
}

export interface ResumeTemplateInfo {
  id: string;
  name: string;
  description: string;
  atsRecommended: boolean;
}

export const RESUME_TEMPLATES: ResumeTemplateInfo[] = [
  { id: "ats", name: "ATS Professional", description: "Plain single column, no color, maximum parser compatibility.", atsRecommended: true },
  { id: "minimal", name: "Minimal", description: "Generous whitespace, understated headers.", atsRecommended: true },
  { id: "graduate", name: "Graduate / Fresher", description: "Friendly accent, education leads.", atsRecommended: true },
  { id: "modern", name: "Modern Professional", description: "Color header band, confident sans-serif.", atsRecommended: false },
  { id: "executive", name: "Executive", description: "Serif type, formal centered header.", atsRecommended: false },
  { id: "technical", name: "Technical", description: "Monospace skill tags, dense and code-flavored.", atsRecommended: false }
];
