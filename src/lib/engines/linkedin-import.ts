import { normalize } from "../parsers/text-normalizer";

/**
 * LinkedIn does not permit crawling profiles, so ResumeProof only accepts text the
 * user pasted from their own profile. This converts that paste into resume sections
 * without adding a single fact the paste did not contain.
 */

const UI_NOISE = [
  /^show all/i,
  /^see more/i,
  /^see less/i,
  /^\d+ (connections?|followers?)$/i,
  /^(1st|2nd|3rd)\+?$/i,
  /^endorsed by/i,
  /^skill assessments?$/i,
  /^message$/i,
  /^connect$/i,
  /^follow$/i,
  /^more$/i,
  /^open to work$/i,
  /^premium$/i,
  /^·$/,
  /^helped \d+/i,
  /^\d+ (mutual )?connections?/i
];

const SECTION_MAP: Array<[RegExp, string]> = [
  [/^about$/i, "SUMMARY"],
  [/^summary$/i, "SUMMARY"],
  [/^experience$/i, "WORK EXPERIENCE"],
  [/^(work )?experiences$/i, "WORK EXPERIENCE"],
  [/^education$/i, "EDUCATION"],
  [/^licenses? (and|&) certifications?$/i, "CERTIFICATIONS"],
  [/^certifications?$/i, "CERTIFICATIONS"],
  [/^(top )?skills$/i, "TECHNICAL SKILLS"],
  [/^projects$/i, "PROJECTS"],
  [/^honors? (and|&) awards?$/i, "PROJECTS"]
];

export interface LinkedInImportResult {
  resumeText: string;
  sections: string[];
  droppedLines: number;
  warnings: string[];
}

export function convertLinkedInProfile(pasted: string, existingResume = ""): LinkedInImportResult {
  const text = normalize(pasted);
  const warnings: string[] = [];
  const buckets: Record<string, string[]> = {};
  const order: string[] = [];
  let current = "SUMMARY";
  let dropped = 0;

  const pushLine = (section: string, line: string) => {
    if (!buckets[section]) {
      buckets[section] = [];
      order.push(section);
    }
    if (!buckets[section].includes(line)) buckets[section].push(line);
  };

  let name = "";
  let headline = "";

  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line) continue;

    if (UI_NOISE.some((re) => re.test(line))) {
      dropped++;
      continue;
    }

    const mapped = SECTION_MAP.find(([re]) => re.test(line));
    if (mapped) {
      current = mapped[1];
      continue;
    }

    if (!name && /^[A-Za-z][A-Za-z .'-]{2,48}$/.test(line) && !line.includes("@")) {
      name = line;
      continue;
    }
    if (name && !headline && current === "SUMMARY" && line.length <= 120) {
      headline = line;
      continue;
    }

    if (current === "TECHNICAL SKILLS") {
      for (const part of line.split(/[,•|]/)) {
        const skill = part.trim();
        if (skill && skill.length < 40) pushLine(current, `- ${skill}`);
      }
      continue;
    }

    pushLine(current, `- ${line.replace(/^[-•*]\s*/, "")}`);
  }

  if (!buckets["WORK EXPERIENCE"]) {
    warnings.push("No Experience section found in the paste. Copy the Experience block too, or ResumeProof has nothing to tailor from.");
  }
  if (!buckets["TECHNICAL SKILLS"]) {
    warnings.push("No Skills section found. Paste your Skills list so requirements can be matched to real evidence.");
  }

  const lines: string[] = [];
  if (name) lines.push(`NAME: ${name}`);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (email) lines.push(`EMAIL: ${email[0]}`);
  const profileUrl = text.match(/linkedin\.com\/in\/[A-Za-z0-9_-]+/i);
  if (profileUrl) lines.push(`LINKEDIN: https://${profileUrl[0]}`);
  if (headline) {
    lines.push("", "SUMMARY:", `- ${headline}`);
  }

  for (const section of order) {
    const body = buckets[section];
    if (!body?.length) continue;
    if (section === "SUMMARY" && headline) {
      lines.push(...body);
      continue;
    }
    lines.push("", `${section}:`, ...body);
  }

  const converted = lines.join("\n").trim();
  const resumeText = existingResume.trim()
    ? `${existingResume.trim()}\n\n# Imported from LinkedIn paste\n${converted}`
    : converted;

  return {
    resumeText,
    sections: order,
    droppedLines: dropped,
    warnings
  };
}
