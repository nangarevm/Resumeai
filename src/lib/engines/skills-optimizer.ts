/** Skills Optimization — section 9 of the AI Job Application Optimizer
 *  spec. Groups the candidate's OWN extracted skills into scannable
 *  categories (Languages, Mobile, State Management, Backend & APIs,
 *  Database, Cloud & DevOps, Integrations, Tools & Testing) so the
 *  SKILLS section reads clearly to both ATS parsers and recruiters.
 *  Never adds, drops, or renames a skill — every skill the candidate
 *  already listed shows up in exactly one category, verbatim. */

import { isHeaderLine, segmentLines } from "../resume-line-editor";

export interface SkillCategoryGroup {
  key: string;
  label: string;
  skills: string[];
}

interface CategoryDef {
  key: string;
  label: string;
  pattern: RegExp;
}

// Order matters: a skill lands in the first category it matches, so
// more specific categories (e.g. Mobile, State Management) are checked
// before generic ones (Languages, Tools).
const CATEGORY_DEFS: CategoryDef[] = [
  {
    key: "mobile",
    label: "Mobile",
    pattern: /\b(flutter|android|ios|swiftui|react native|jetpack compose|ionic|xcode)\b/i
  },
  {
    key: "state-management",
    label: "State Management",
    pattern: /\b(getx|bloc|provider|redux|mobx|riverpod|vuex|zustand|recoil|cubit)\b/i
  },
  {
    key: "frontend",
    label: "Frontend",
    pattern: /\b(react(?:\.js)?|angular|vue(?:\.js)?|next\.js|html5?|css3?|tailwind|sass|scss|bootstrap|jquery)\b/i
  },
  {
    key: "backend-api",
    label: "Backend & APIs",
    pattern: /\b(node(?:\.js)?|express(?:\.js)?|rest\s*api|restful|graphql|django|flask|spring(?:\s*boot)?|laravel|fastapi|\.net|grpc|webhooks?)\b/i
  },
  {
    key: "database",
    label: "Database",
    pattern: /\b(mysql|postgres(?:ql)?|mongodb|sqlite|redis|dynamodb|oracle|cassandra|firestore|realm|mariadb)\b/i
  },
  {
    key: "cloud-devops",
    label: "Cloud & DevOps",
    pattern: /\b(aws|azure|gcp|google cloud|docker|kubernetes|k8s|ci\/cd|jenkins|terraform|github actions|cloudformation|heroku|vercel|netlify)\b/i
  },
  {
    key: "integrations",
    label: "Integrations",
    pattern: /\b(stripe|twilio|agora|firebase(?:\s*auth)?|oauth|payment gateway|push notifications?|websocket|socket\.io|razorpay|paypal|sendgrid|firebase cloud messaging|fcm)\b/i
  },
  {
    key: "tools-testing",
    label: "Tools & Testing",
    pattern: /\b(git(?:hub|lab)?|jira|postman|figma|jest|junit|selenium|android studio|vs\s*code|cypress|mocha|webpack|npm|yarn|confluence)\b/i
  },
  {
    key: "languages",
    label: "Languages",
    pattern: /\b(python|javascript|typescript|java|kotlin|swift|dart|c\+\+|c#|golang|go|rust|ruby|php|scala|objective-c|sql|r)\b/i
  }
];

/** Groups a flat skill list into categories, first-match wins, preserving
 *  each skill's original text. Unmatched skills fall into "Other". */
export function categorizeSkills(skills: string[]): SkillCategoryGroup[] {
  const groups = new Map<string, SkillCategoryGroup>();
  for (const def of CATEGORY_DEFS) groups.set(def.key, { key: def.key, label: def.label, skills: [] });
  const other: SkillCategoryGroup = { key: "other", label: "Other", skills: [] };

  for (const skill of skills) {
    const trimmed = skill.trim();
    if (!trimmed) continue;
    const match = CATEGORY_DEFS.find((def) => def.pattern.test(trimmed));
    if (match) groups.get(match.key)!.skills.push(trimmed);
    else other.skills.push(trimmed);
  }

  const ordered = CATEGORY_DEFS.map((def) => groups.get(def.key)!).filter((g) => g.skills.length > 0);
  if (other.skills.length > 0) ordered.push(other);
  return ordered;
}

/** Builds a "SKILLS" section block with one line per non-empty category. */
export function buildCategorizedSkillsBlock(skills: string[]): string {
  const groups = categorizeSkills(skills);
  const lines = ["SKILLS", ...groups.map((g) => `${g.label}: ${g.skills.join(", ")}`)];
  return lines.join("\n");
}

/** Replaces the resume's existing SKILLS section body with the categorized
 *  block, or inserts one before EDUCATION (or at the end) if no SKILLS
 *  section exists yet. Never touches any other section. */
export function applyCategorizedSkillsToResume(resumeText: string, skills: string[]): string {
  const lines = resumeText.split("\n");
  const segments = segmentLines(lines);
  const block = buildCategorizedSkillsBlock(skills);

  const skillsSeg = segments.find(
    (seg) => seg.headerIndex !== null && /^(SKILLS|TECHNICAL SKILLS|KEY SKILLS):?$/i.test(lines[seg.headerIndex].trim())
  );

  if (skillsSeg) {
    const allIdx = [skillsSeg.headerIndex!, ...skillsSeg.rowIndices].sort((a, b) => a - b);
    const start = allIdx[0];
    const end = allIdx[allIdx.length - 1];
    const next = [...lines.slice(0, start), block, ...lines.slice(end + 1)];
    return next.join("\n");
  }

  const eduIdx = lines.findIndex((l) => isHeaderLine(l) && /^EDUCATION:?$/i.test(l.trim()));
  if (eduIdx === -1) return `${resumeText.trimEnd()}\n\n${block}`;
  return [...lines.slice(0, eduIdx), block, "", ...lines.slice(eduIdx)].join("\n");
}
