/**
 * Guided profile wizard — collects a resume field-by-field instead of asking
 * the user to paste a finished document, then serializes the answers into the
 * same plain-text format resume-parser.ts already understands (NAME:/EMAIL:/
 * SKILLS/WORK EXPERIENCE/etc). That keeps this a UI-only addition: the output
 * flows through the existing vault → evidence → fit-score pipeline unchanged.
 *
 * Bullet writing is deterministic (no LLM call) so the wizard works with zero
 * configuration. Impact clauses are only added when the user explicitly picks
 * one from a chip list — never guessed — matching the product's "never invent
 * achievements" rule.
 */

export type ExperienceLevel = "fresher" | "1-3" | "3-5" | "5-8" | "8+";

export interface WizardExperience {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  rawDescription: string;
  tools: string[];
  impact: string;
  isInternship?: boolean;
}

export interface WizardEducation {
  id: string;
  degree: string;
  school: string;
  location: string;
  year: string;
  grade: string;
}

export interface WizardProject {
  id: string;
  name: string;
  problem: string;
  role: string;
  tech: string;
  impact: string;
}

export interface WizardCertification {
  id: string;
  name: string;
  issuer: string;
  year: string;
  url: string;
}

export interface GuidedProfileData {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio: string;
  github: string;
  targetTitle: string;
  targetIndustry: string;
  experienceLevel: ExperienceLevel | "";
  preferredLocation: string;
  experiences: WizardExperience[];
  educations: WizardEducation[];
  skillsRaw: string;
  projects: WizardProject[];
  certifications: WizardCertification[];
  achievements: string;
}

export function emptyGuidedProfile(): GuidedProfileData {
  return {
    name: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    portfolio: "",
    github: "",
    targetTitle: "",
    targetIndustry: "",
    experienceLevel: "",
    preferredLocation: "",
    experiences: [],
    educations: [],
    skillsRaw: "",
    projects: [],
    certifications: [],
    achievements: ""
  };
}

export const IMPACT_OPTIONS: Array<{ id: string; label: string; clause: string }> = [
  { id: "reduced_time", label: "Reduced time/effort", clause: "reducing turnaround time" },
  { id: "increased_coverage", label: "Increased coverage/scope", clause: "increasing coverage" },
  { id: "reduced_errors", label: "Reduced errors/defects", clause: "reducing defects" },
  { id: "improved_speed", label: "Improved speed/delivery", clause: "improving delivery speed" },
  { id: "not_sure", label: "Not sure / skip", clause: "" }
];

const FILLER_PREFIXES = [
  /^i\s+/i,
  /^i'?m\s+/i,
  /^i've\s+/i,
  /^my\s+(job|role|work)\s+was\s+to\s+/i,
  /^my\s+responsibilit(y|ies)\s+(was|were)\s+to\s+/i,
  /^responsible\s+for\s+/i,
  /^worked\s+on\s+/i
];

/** Turn "I tested web applications and wrote scripts" into a resume-style
 *  bullet, without inventing anything the user didn't say. Tools/impact are
 *  appended only if the user explicitly selected them and they aren't
 *  already present in the sentence. */
export function sentenceToBullet(raw: string, tools: string[] = [], impactId = ""): string {
  let text = raw.trim().replace(/\.$/, "");
  if (!text) return "";

  for (const re of FILLER_PREFIXES) {
    if (re.test(text)) {
      text = text.replace(re, "");
      break;
    }
  }
  text = text.charAt(0).toUpperCase() + text.slice(1);

  const lower = text.toLowerCase();
  const missingTools = tools.filter((t) => t && !lower.includes(t.toLowerCase()));
  if (missingTools.length) {
    text += ` using ${missingTools.join(", ")}`;
  }

  const impact = IMPACT_OPTIONS.find((i) => i.id === impactId);
  if (impact?.clause && !lower.includes(impact.clause.split(" ").slice(-1)[0])) {
    text += `, ${impact.clause}`;
  }

  return text;
}

const SKILL_CATEGORY_MAP: Array<{ label: string; test: RegExp }> = [
  {
    label: "Automation & Testing",
    test: /selenium|playwright|cypress|appium|cucumber|junit|testng|manual testing|automation testing|jbehave|bdd|test automation/i
  },
  { label: "API & Backend", test: /\bapi\b|postman|rest|soap|graphql|node|django|flask|spring|express/i },
  { label: "Languages", test: /python|java\b|javascript|typescript|c\+\+|c#|golang|\bgo\b|rust|ruby|php|kotlin|swift/i },
  { label: "Cloud & DevOps", test: /aws|azure|\bgcp\b|docker|kubernetes|terraform|jenkins|ci\/cd|github actions/i },
  { label: "Data", test: /sql|excel|tableau|power bi|pandas|numpy|spreadsheet|pivot table/i },
  { label: "Design & Creative", test: /photoshop|illustrator|figma|indesign|premiere|adobe/i },
  { label: "Tools", test: /jira|git\b|github\b|confluence|slack|workday|salesforce|hubspot|zendesk/i }
];

export function categorizeSkills(raw: string): Array<{ category: string; skills: string[] }> {
  const items = raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const buckets = new Map<string, string[]>();
  for (const skill of items) {
    const match = SKILL_CATEGORY_MAP.find((c) => c.test.test(skill));
    const label = match?.label || "Other";
    if (!buckets.has(label)) buckets.set(label, []);
    buckets.get(label)!.push(skill);
  }
  return [...buckets.entries()].map(([category, skills]) => ({ category, skills }));
}

const CERT_SUGGESTIONS: Array<{ test: RegExp; certs: string[] }> = [
  { test: /qa|test|sdet|quality/i, certs: ["ISTQB Foundation Level", "Certified Selenium Tester"] },
  { test: /nurse|healthcare|clinical/i, certs: ["BLS Certification", "ACLS Certification"] },
  { test: /\bhr\b|human resources|recruit/i, certs: ["SHRM-CP", "PHR"] },
  { test: /sales|account executive|business development/i, certs: ["HubSpot Sales Certification"] },
  { test: /data|analyst/i, certs: ["Google Data Analytics Certificate"] },
  { test: /cloud|devops|aws|azure/i, certs: ["AWS Certified Cloud Practitioner"] },
  { test: /product|project manager|\bpm\b/i, certs: ["Certified Scrum Product Owner (CSPO)"] },
  { test: /teacher|education|instructor/i, certs: ["State Teaching License / Endorsement"] },
  { test: /electric|plumb|hvac|trade/i, certs: ["OSHA 10/30 Certification"] }
];

export function suggestedCertifications(targetTitle: string): string[] {
  const hit = CERT_SUGGESTIONS.find((c) => c.test.test(targetTitle));
  return hit?.certs || [];
}

function dateRange(start: string, end: string, current: boolean): string {
  const from = start.trim() || "?";
  const to = current ? "Present" : end.trim() || "?";
  return `${from} - ${to}`;
}

/** Serialize wizard answers into the canonical resume text format the rest of
 *  the app already parses. Sections with no content are omitted entirely
 *  rather than emitted empty. */
export function buildResumeText(data: GuidedProfileData): string {
  const lines: string[] = [];
  lines.push(`NAME: ${data.name.trim()}`);
  lines.push(`EMAIL: ${data.email.trim()}`);
  lines.push(`PHONE: ${data.phone.trim()}`);
  if (data.location.trim()) lines.push(`LOCATION: ${data.location.trim()}`);
  if (data.linkedin.trim()) lines.push(`LINKEDIN: ${data.linkedin.trim()}`);
  if (data.github.trim()) lines.push(`GITHUB: ${data.github.trim()}`);
  if (data.portfolio.trim()) lines.push(`PORTFOLIO: ${data.portfolio.trim()}`);

  const skillGroups = categorizeSkills(data.skillsRaw);
  const allSkills = skillGroups.flatMap((g) => g.skills);

  const hasExperience = data.experiences.some((e) => e.title.trim() || e.rawDescription.trim());
  const achievementLines = data.achievements
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (allSkills.length) {
    lines.push("", "SKILLS", allSkills.join(", "));
  }

  if (hasExperience) {
    lines.push("", "WORK EXPERIENCE");
    for (const exp of data.experiences) {
      if (!exp.title.trim() && !exp.rawDescription.trim()) continue;
      lines.push(`${exp.company.trim() || "Company"} | ${exp.title.trim() || "Role"}${exp.isInternship ? " (Internship)" : ""} | ${dateRange(exp.startDate, exp.endDate, exp.current)}`);
      const bullet = sentenceToBullet(exp.rawDescription, exp.tools, exp.impact);
      if (bullet) lines.push(`- ${bullet}`);
    }
    if (achievementLines.length) {
      for (const a of achievementLines) lines.push(`- ${a}`);
    }
  }

  const hasProjects = data.projects.some((p) => p.name.trim());
  if (hasProjects) {
    lines.push("", "PROJECTS");
    for (const p of data.projects) {
      if (!p.name.trim()) continue;
      const parts = [p.problem.trim(), p.role.trim() && `as ${p.role.trim()}`, p.tech.trim() && `using ${p.tech.trim()}`, p.impact.trim()].filter(
        Boolean
      );
      const desc = parts.length ? ` — ${parts.join(", ")}` : "";
      lines.push(`- ${p.name.trim()}${desc}`);
    }
    if (!hasExperience && achievementLines.length) {
      for (const a of achievementLines) lines.push(`- ${a}`);
    }
  }

  const hasEducation = data.educations.some((e) => e.degree.trim() || e.school.trim());
  if (hasEducation) {
    lines.push("", "EDUCATION");
    for (const e of data.educations) {
      if (!e.degree.trim() && !e.school.trim()) continue;
      const gradePart = e.grade.trim() ? `, ${e.grade.trim()}` : "";
      lines.push(`- ${e.degree.trim() || "Degree"}, ${e.school.trim() || "School"}${e.location.trim() ? `, ${e.location.trim()}` : ""} (${e.year.trim() || "Year"})${gradePart}`);
    }
  }

  const hasCerts = data.certifications.some((c) => c.name.trim());
  if (hasCerts) {
    lines.push("", "CERTIFICATIONS");
    for (const c of data.certifications) {
      if (!c.name.trim()) continue;
      lines.push(`- ${c.name.trim()}${c.issuer.trim() ? ` (${c.issuer.trim()}${c.year.trim() ? `, ${c.year.trim()}` : ""})` : c.year.trim() ? ` (${c.year.trim()})` : ""}`);
    }
  }

  return lines.join("\n").trim();
}

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  fresher: "Fresher / no professional experience yet",
  "1-3": "1–3 years",
  "3-5": "3–5 years",
  "5-8": "5–8 years",
  "8+": "8+ years"
};

/** Step order depends on experience level — spec sections 8–9: freshers lead
 *  with education/projects, experienced candidates lead with work history. */
export function wizardStepOrder(level: ExperienceLevel | ""): Array<
  "basics" | "goal" | "experience" | "education" | "skills" | "projects" | "certifications" | "achievements" | "review"
> {
  const isFresher = level === "fresher";
  const base = isFresher
    ? (["basics", "goal", "education", "projects", "experience", "certifications", "skills", "achievements", "review"] as const)
    : (["basics", "goal", "experience", "achievements", "skills", "projects", "certifications", "education", "review"] as const);
  return [...base];
}
