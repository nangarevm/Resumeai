import { normalize } from "../parsers/text-normalizer";

const HEADER_KEYS = [
  "NAME",
  "EMAIL",
  "PHONE",
  "LINKEDIN",
  "GITHUB",
  "PREFERRED ROLE",
  "PREFERRED DOMAIN",
  "DREAM COMPANIES"
] as const;

const SECTION_HEADERS: Record<string, string> = {
  SUMMARY: "SUMMARY",
  SKILLS: "SKILLS",
  TECHNICAL_SKILLS: "TECHNICAL SKILLS",
  PROJECTS: "PROJECTS",
  WORK_EXPERIENCE: "WORK EXPERIENCE",
  EDUCATION: "EDUCATION",
  CERTIFICATIONS: "CERTIFICATIONS"
};

const SECTION_ORDER = ["SUMMARY", "SKILLS", "TECHNICAL_SKILLS", "PROJECTS", "WORK_EXPERIENCE", "EDUCATION", "CERTIFICATIONS"];

interface ParsedDraft {
  headers: Record<string, string>;
  sections: Record<string, string>;
}

function matchSectionKey(line: string): string | null {
  const trimmed = line.trim();
  const upper = trimmed.toUpperCase().replace(/:$/, "");

  if (/^CONTACT$/i.test(upper)) return "__CONTACT__";
  if (/^(PROFILE\s+)?SUMMARY$/i.test(upper) || /^PROFILE$/i.test(upper) || /^OBJECTIVE$/i.test(upper) || /^ABOUT$/i.test(upper)) {
    return "SUMMARY";
  }
  if (/^TECHNICAL\s+SKILLS?$/i.test(upper) || /^CORE\s+COMPETENC/i.test(upper) || /^KEY\s+SKILLS?$/i.test(upper)) {
    return "TECHNICAL_SKILLS";
  }
  if (/^SKILLS?$/i.test(upper)) return "SKILLS";
  if (/^PROJECTS?$/i.test(upper) || /^KEY\s+PROJECTS?$/i.test(upper)) return "PROJECTS";
  if (/^WORK\s+EXPERIENCE$/i.test(upper) || /^EXPERIENCE$/i.test(upper) || /^EMPLOYMENT$/i.test(upper)) {
    return "WORK_EXPERIENCE";
  }
  if (/^EDUCATION$/i.test(upper) || /^QUALIFICATIONS?$/i.test(upper)) return "EDUCATION";
  if (/^CERTIFICATIONS?$/i.test(upper) || /^LICENSES?$/i.test(upper)) return "CERTIFICATIONS";

  return null;
}

function parseHeaderLine(line: string): { key: string; value: string } | null {
  const m = line.match(/^([A-Za-z][A-Za-z\s/&]+):\s*(.+)$/);
  if (!m) return null;
  const key = m[1].trim().toUpperCase();
  const normalized = HEADER_KEYS.find((h) => key === h || key.replace(/\s+/g, " ") === h);
  if (!normalized) return null;
  return { key: normalized, value: m[2].trim() };
}

function extractEmail(text: string): string | undefined {
  const m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m?.[0];
}

function extractPhone(text: string): string | undefined {
  const m = text.match(/(\+?\d[\d\s().-]{8,}\d)/);
  return m?.[1]?.trim();
}

function mergeContactIntoHeaders(headers: Record<string, string>, contactBody: string): void {
  if (!contactBody.trim()) return;
  if (!headers.EMAIL) {
    const email = extractEmail(contactBody);
    if (email) headers.EMAIL = email;
  }
  if (!headers.PHONE) {
    const phone = extractPhone(contactBody);
    if (phone) headers.PHONE = phone;
  }
}

function parseResumeDraft(text: string): ParsedDraft {
  const normalized = normalize(text);
  const lines = normalized.split("\n");
  const headers: Record<string, string> = {};
  const sections: Record<string, string> = {};
  let current: string | null = null;
  let buf: string[] = [];
  let preamble: string[] = [];

  const flush = () => {
    if (!current) {
      preamble.push(...buf);
      buf = [];
      return;
    }
    const body = buf.join("\n").trim();
    if (current === "__CONTACT__") {
      mergeContactIntoHeaders(headers, body);
    } else if (body) {
      sections[current] = sections[current] ? `${sections[current]}\n${body}` : body;
    }
    buf = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const header = parseHeaderLine(trimmed);
    if (header) {
      flush();
      current = null;
      headers[header.key] = header.value;
      continue;
    }

    const sectionKey = matchSectionKey(trimmed);
    if (sectionKey) {
      flush();
      current = sectionKey;
      continue;
    }

    buf.push(line);
  }
  flush();

  if (!headers.NAME && preamble.length) {
    const nameLine = preamble.find((l) => l.trim() && !l.includes("@") && l.length < 48);
    if (nameLine && /^[A-Za-z .'-]+$/.test(nameLine.trim())) {
      headers.NAME = nameLine.trim();
    }
  }

  return { headers, sections };
}

function normalizeBullets(body: string): string {
  const lines = body.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      out.push("");
      continue;
    }
    if (/^[-•*]\s+/.test(t)) {
      out.push(t.replace(/^[-•*]\s+/, "- "));
    } else if (/^[A-Za-z].+:\s*.+/.test(t) && t.length < 80 && !t.startsWith("-")) {
      out.push(t);
    } else if (/\S\s*\|\s*\S/.test(t) && t.length < 100) {
      // "Company | Role | Dates" style sub-header — a role/company line, not
      // a bullet point. Without this, it fell through to the bullet branch
      // below and got a "- " prefix, which visually mislabeled it as a duty
      // bullet in every downstream export and template.
      out.push(t);
    } else if (t.length > 0) {
      out.push(t.startsWith("- ") ? t : `- ${t}`);
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function formatSummaryBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "";
  if (trimmed.includes("\n")) return normalizeBullets(trimmed);
  return trimmed;
}

export function formatResumeDraft(
  text: string,
  options?: { summaryLine?: string; name?: string; email?: string; phone?: string }
): string {
  if (!text?.trim()) return text;

  const { headers, sections } = parseResumeDraft(text);

  if (options?.name) headers.NAME = options.name;
  if (options?.email) headers.EMAIL = options.email;
  if (options?.phone) headers.PHONE = options.phone;

  if (options?.summaryLine) {
    sections.SUMMARY = options.summaryLine.trim();
  }

  const out: string[] = [];

  if (headers.NAME) out.push(`NAME: ${headers.NAME}`);
  if (headers.EMAIL) out.push(`EMAIL: ${headers.EMAIL}`);
  if (headers.PHONE) out.push(`PHONE: ${headers.PHONE}`);
  if (headers.LINKEDIN) out.push(`LINKEDIN: ${headers.LINKEDIN}`);
  if (headers.GITHUB) out.push(`GITHUB: ${headers.GITHUB}`);
  if (headers["PREFERRED ROLE"]) out.push(`PREFERRED ROLE: ${headers["PREFERRED ROLE"]}`);
  if (headers["PREFERRED DOMAIN"]) out.push(`PREFERRED DOMAIN: ${headers["PREFERRED DOMAIN"]}`);
  if (headers["DREAM COMPANIES"]) out.push(`DREAM COMPANIES: ${headers["DREAM COMPANIES"]}`);

  if (out.length) out.push("");

  for (const key of SECTION_ORDER) {
    const body = sections[key];
    if (!body?.trim()) continue;
    const label = SECTION_HEADERS[key];
    out.push(label);

    const formatted =
      key === "SUMMARY" ? formatSummaryBody(body) : key === "SKILLS" || key === "TECHNICAL_SKILLS" ? formatSkillsBody(body) : normalizeBullets(body);

    out.push(formatted);
    out.push("");
  }

  return out.join("\n").trimEnd() + "\n";
}

function formatSkillsBody(body: string): string {
  const lines = body.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (/^[-•*]/.test(t)) {
      out.push(t.replace(/^[-•*]\s+/, "- "));
    } else if (t.includes(":")) {
      out.push(t);
    } else if (t.includes(",")) {
      for (const part of t.split(",")) {
        const p = part.trim();
        if (p) out.push(`- ${p}`);
      }
    } else {
      out.push(`- ${t}`);
    }
  }
  return out.join("\n");
}

export function applySummaryToResume(resumeText: string, summaryLine: string): string {
  return formatResumeDraft(resumeText, { summaryLine });
}

export function polishResumeDraft(text: string): string {
  return formatResumeDraft(text);
}
