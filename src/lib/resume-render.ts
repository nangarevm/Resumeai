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

/**
 * Template engine: a small set of structurally distinct "skeletons" (layout,
 * typography, section treatment) combined with a color palette. The CSS for
 * each skeleton reads its accent color from a CSS custom property, so a
 * skeleton is written ONCE and produces one genuinely unique template per
 * color — this is how real resume builders offer "150+ templates" without
 * 150 hand-written stylesheets. Neutral (ATS-recommended) skeletons only get
 * a few grayscale "ink" shades instead of the full color palette, since a
 * colored block or divider is exactly what ATS-safety is trading away.
 */

export type TemplateCategory = "ATS-Safe" | "Modern" | "Executive" | "Creative" | "Technical" | "Editorial";

export interface TemplateSkeleton {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  /** Best fit called out in the picker — helps someone browsing 150 options land fast. */
  bestFor: string;
  neutral: boolean;
}

export interface TemplateColor {
  id: string;
  name: string;
  hex: string;
  soft: string;
}

export const TEMPLATE_SKELETONS: TemplateSkeleton[] = [
  { id: "ats-classic", name: "ATS Classic", category: "ATS-Safe", description: "Plain single column, thin rule headers.", bestFor: "Any field — maximum parser compatibility", neutral: true },
  { id: "minimal", name: "Minimal", category: "ATS-Safe", description: "Generous whitespace, understated headers.", bestFor: "Any experience level that wants a quiet, confident look", neutral: true },
  { id: "compact-ats", name: "Compact ATS", category: "ATS-Safe", description: "Small type, tight spacing, fits more on one page.", bestFor: "Senior professionals (8+ yrs) with a long history", neutral: true },
  { id: "serif-ats", name: "Serif Classic", category: "ATS-Safe", description: "Plain serif type, no color, single column.", bestFor: "Academic, legal, or traditional-industry roles", neutral: true },
  { id: "modern-band", name: "Modern Band", category: "Modern", description: "Color header band, confident sans-serif.", bestFor: "Mid-level professionals in tech, marketing, ops", neutral: false },
  { id: "sidebar-accent", name: "Sidebar Accent", category: "Modern", description: "Thin color bar down the left edge.", bestFor: "Business, sales, and account-management roles", neutral: false },
  { id: "two-tone-header", name: "Two-Tone Header", category: "Modern", description: "Colored name block over a white contact strip.", bestFor: "Product, project, and program management", neutral: false },
  { id: "pill-contact", name: "Pill Contact", category: "Modern", description: "Contact details as rounded pill tags.", bestFor: "Digital-first roles: marketing, growth, social", neutral: false },
  { id: "boxed-sections", name: "Boxed Sections", category: "Modern", description: "Colored tag behind every section title.", bestFor: "Customer-facing roles: support, HR, recruiting", neutral: false },
  { id: "executive-serif", name: "Executive Serif", category: "Executive", description: "Centered serif header, formal spacing.", bestFor: "Directors, VPs, and leadership roles", neutral: false },
  { id: "corporate-letterspaced", name: "Corporate", category: "Executive", description: "Letter-spaced caps, thin accent rule.", bestFor: "Finance, consulting, and corporate strategy", neutral: false },
  { id: "underline-bold", name: "Underline Bold", category: "Executive", description: "Double-rule headers, dense and formal.", bestFor: "Law, banking, and other formal industries", neutral: false },
  { id: "technical-dark", name: "Technical Dark", category: "Technical", description: "Dark header bar, monospace skill tags.", bestFor: "Engineers, SDETs, and technical ICs", neutral: false },
  { id: "timeline", name: "Timeline", category: "Creative", description: "A connecting line and dot marks each role.", bestFor: "Career-changers showing a clear progression", neutral: false },
  { id: "tab-accent", name: "Tab Accent", category: "Creative", description: "A colored flag marks each section title.", bestFor: "Designers, PMs, and portfolio-driven roles", neutral: false },
  { id: "rounded-cards", name: "Rounded Cards", category: "Creative", description: "Each section sits in its own soft card.", bestFor: "Creative, hospitality, and people-facing roles", neutral: false },
  { id: "editorial-spacious", name: "Editorial", category: "Editorial", description: "Light type, wide margins, quiet accent rule.", bestFor: "Graduates and early-career portfolios", neutral: false },
  { id: "graduate-banner", name: "Graduate Banner", category: "Editorial", description: "Soft color banner, friendly and approachable.", bestFor: "Fresh graduates and first-time job seekers", neutral: false }
];

export const TEMPLATE_COLORS: TemplateColor[] = [
  { id: "blue", name: "Blue", hex: "#1f6feb", soft: "#eaf2ff" },
  { id: "navy", name: "Navy", hex: "#1b3a63", soft: "#eaeef4" },
  { id: "teal", name: "Teal", hex: "#0f766e", soft: "#e6f5f3" },
  { id: "emerald", name: "Emerald", hex: "#157347", soft: "#e8f6ec" },
  { id: "purple", name: "Purple", hex: "#7c3aed", soft: "#f1eafe" },
  { id: "berry", name: "Berry", hex: "#a3195b", soft: "#fbe8f0" },
  { id: "red", name: "Red", hex: "#b91c1c", soft: "#fbeaea" },
  { id: "orange", name: "Orange", hex: "#c2410c", soft: "#fdece0" },
  { id: "amber", name: "Amber", hex: "#a16207", soft: "#faf1de" },
  { id: "slate", name: "Slate", hex: "#334155", soft: "#eef1f4" },
  { id: "bronze", name: "Bronze", hex: "#7c4a1e", soft: "#f5ece0" }
];

const NEUTRAL_SHADES: TemplateColor[] = [
  { id: "black", name: "Classic Black", hex: "#000000", soft: "#f4f4f4" },
  { id: "charcoal", name: "Charcoal", hex: "#33393f", soft: "#f2f3f4" },
  { id: "navy-ink", name: "Navy Ink", hex: "#22344a", soft: "#eef1f5" }
];

export interface ResumeTemplateInfo {
  id: string;
  skeletonId: string;
  colorId: string;
  name: string;
  description: string;
  bestFor: string;
  category: TemplateCategory;
  atsRecommended: boolean;
  accent: string;
  accentSoft: string;
}

function buildTemplateCatalog(): ResumeTemplateInfo[] {
  const out: ResumeTemplateInfo[] = [];
  for (const skeleton of TEMPLATE_SKELETONS) {
    const palette = skeleton.neutral ? NEUTRAL_SHADES : TEMPLATE_COLORS;
    for (const color of palette) {
      out.push({
        colorId: color.id,
        id: `${skeleton.id}-${color.id}`,
        skeletonId: skeleton.id,
        name: `${skeleton.name} — ${color.name}`,
        description: skeleton.description,
        bestFor: skeleton.bestFor,
        category: skeleton.category,
        atsRecommended: skeleton.neutral,
        accent: color.hex,
        accentSoft: color.soft
      });
    }
  }
  return out;
}

/** ~165 unique skeleton×color combinations — see buildTemplateCatalog. */
export const RESUME_TEMPLATES: ResumeTemplateInfo[] = buildTemplateCatalog();

export function findTemplate(id: string): ResumeTemplateInfo {
  return RESUME_TEMPLATES.find((t) => t.id === id) || RESUME_TEMPLATES[0];
}
