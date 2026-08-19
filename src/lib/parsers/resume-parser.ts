import type { CandidateProfile, CareerPreferences } from "../models";
import { emptyPreferences } from "../models";
import { normalize, splitList } from "./text-normalizer";

const SECTION_ALIASES: Array<[RegExp, string]> = [
  [/^(technical\s+)?skills?\b|^core\s+competenc|^tech\s+stack\b/i, "SKILLS"],
  [/^(key\s+)?projects?\b|^selected\s+projects\b|^academic\s+projects\b/i, "PROJECTS"],
  [/^(work\s+)?experience\b|^employment\b|^professional\s+experience\b|^internships?\b/i, "WORK_EXPERIENCE"],
  [/^education\b|^academic\s+background\b|^qualifications?\b/i, "EDUCATION"],
  [/^certifications?\b|^licenses?\b|^courses?\b/i, "CERTIFICATIONS"],
  [/^summary\b|^profile\b|^objective\b|^about\b/i, "SUMMARY"]
];

export function parseResume(id: string, rawText: string): CandidateProfile {
  const text = normalize(rawText);
  const name = extractHeaderField(text, "NAME:", extractNameFallback(text, `Candidate ${id}`));
  const email = extractHeaderField(text, "EMAIL:", extractEmail(text) ?? `candidate${id}@example.com`);
  const phone = extractHeaderField(text, "PHONE:", extractPhone(text) ?? "Not specified");
  const sections = extractSections(text);
  const preferences = extractCareerPreferences(text);
  const skills = extractSkillList(sections.SKILLS ?? text);
  const projects = extractProjectList(sections.PROJECTS ?? "");

  return {
    id,
    name,
    email,
    phone,
    rawResumeText: text,
    parsedSections: sections,
    extractedSkills: skills,
    extractedProjects: projects,
    preferences,
    linkedinUrl: extractUrl(text, /linkedin\.com\/in\/[A-Za-z0-9_-]+/i),
    githubUrl: extractUrl(text, /github\.com\/[A-Za-z0-9_-]+/i)
  };
}

function extractHeaderField(text: string, prefix: string, fallback: string): string {
  for (const line of text.split("\n")) {
    if (line.toUpperCase().startsWith(prefix.toUpperCase())) {
      const val = line.slice(prefix.length).trim();
      if (val) return val;
    }
  }
  return fallback;
}

function extractNameFallback(text: string, fallback: string): string {
  const first = text.split("\n").map((l) => l.trim()).find((l) => l && !l.includes("@") && !/^(name|email|phone):/i.test(l));
  if (!first) return fallback;
  if (first.length <= 48 && /^[A-Za-z .'-]+$/.test(first)) return first;
  return fallback;
}

function extractEmail(text: string): string | null {
  const m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m ? m[0] : null;
}

function extractPhone(text: string): string | null {
  const m = text.match(/(\+?\d[\d\s().-]{8,}\d)/);
  return m ? m[1].trim() : null;
}

function extractUrl(text: string, pattern: RegExp): string | undefined {
  const m = text.match(pattern);
  return m ? `https://${m[0].replace(/^https?:\/\//i, "")}` : undefined;
}

function extractSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = text.split("\n");
  let current = "SUMMARY";
  let buf: string[] = [];

  const flush = () => {
    const body = buf.join("\n").trim();
    if (body) sections[current] = sections[current] ? `${sections[current]}\n${body}` : body;
    buf = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const header = trimmed.replace(/[:\s]+$/, "");
    const matched = matchSection(header);
    if (matched) {
      flush();
      current = matched;
    } else {
      buf.push(line);
    }
  }
  flush();
  return sections;
}

function matchSection(line: string): string | null {
  const upper = line.trim().toUpperCase();
  if (upper.startsWith("TECHNICAL SKILLS") || upper === "SKILLS") return "SKILLS";
  if (upper.startsWith("PROJECTS") || upper === "KEY PROJECTS") return "PROJECTS";
  if (upper.startsWith("WORK EXPERIENCE") || upper.startsWith("EXPERIENCE")) return "WORK_EXPERIENCE";
  if (upper.startsWith("EDUCATION")) return "EDUCATION";
  if (upper.startsWith("CERTIFICATIONS")) return "CERTIFICATIONS";

  for (const [re, key] of SECTION_ALIASES) {
    if (re.test(line.trim()) && line.trim().length < 48) return key;
  }
  return null;
}

function extractCareerPreferences(text: string): CareerPreferences {
  const prefs = emptyPreferences();
  for (const line of text.split("\n")) {
    const upper = line.toUpperCase().trim();
    const value = line.includes(":") ? line.slice(line.indexOf(":") + 1) : "";
    if (upper.startsWith("DREAM COMPANIES:")) prefs.dreamCompanies = splitList(value);
    else if (upper.startsWith("PREFERRED ROLE:") || upper.startsWith("PREFERRED ROLES:")) prefs.preferredRoles = splitList(value);
    else if (upper.startsWith("PREFERRED DOMAIN:") || upper.startsWith("PREFERRED DOMAINS:")) prefs.preferredDomains = splitList(value);
  }
  return prefs;
}

/** Split on comma/bullet, but not inside parentheses — "Adobe Creative Suite
 *  (Photoshop, Illustrator)" is one skill with a parenthetical example list,
 *  not two skills split mid-parenthesis. */
function splitOutsideParens(line: string): string[] {
  const tokens: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of line) {
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if ((ch === "," || ch === "•") && depth === 0) {
      tokens.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  tokens.push(current);
  return tokens;
}

function extractSkillList(skillsText: string): string[] {
  if (!skillsText) return [];
  const skills: string[] = [];
  for (let line of skillsText.split("\n")) {
    if (line.includes(":")) line = line.slice(line.indexOf(":") + 1);
    // Strip a leading bullet marker (each line is already its own item from the
    // \n split above) before splitting on comma/bullet — splitting on every
    // bare "-" instead shattered hyphenated skill terms like "e-discovery" or
    // "co-pilot" into meaningless fragments ("e", "discovery").
    line = line.replace(/^\s*[-•]\s*/, "");
    for (const token of splitOutsideParens(line)) {
      const cleaned = token.trim();
      if (cleaned && cleaned.length < 30) skills.push(cleaned);
    }
  }
  return skills;
}

function extractProjectList(projectsText: string): string[] {
  if (!projectsText) return [];
  const projects: string[] = [];
  for (const line of projectsText.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("-") || trimmed.startsWith("•") || /^project\b/i.test(trimmed)) {
      projects.push(trimmed.replace(/^[-•]\s*/, ""));
    }
  }
  return projects;
}
