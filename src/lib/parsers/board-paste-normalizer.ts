/** Normalize job-board paste formats (India-first) into plain JD text for parseJD. */
export function normalizeBoardPaste(raw: string): { text: string; source?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { text: raw };

  if (isNaukriPaste(trimmed)) return { text: normalizeNaukri(trimmed), source: "Naukri" };
  if (isInstahyrePaste(trimmed)) return { text: normalizeInstahyre(trimmed), source: "Instahyre" };

  return { text: raw };
}

function isNaukriPaste(text: string): boolean {
  return /\bnaukri\b/i.test(text) || /job description\s*\n/i.test(text) && /key skills/i.test(text);
}

function isInstahyrePaste(text: string): boolean {
  return /\binstahyre\b/i.test(text) || (/must have skills/i.test(text) && /good to have/i.test(text));
}

function normalizeNaukri(text: string): string {
  const lines = text
    .split("\n")
    .map((l) => l.replace(/\u00a0/g, " ").trim())
    .filter((l) => l && !/^naukri\.com/i.test(l) && !/^apply now$/i.test(l));

  const title = pickAfter(lines, /^(job title|designation|position)\s*:?\s*/i) || lines[0] || "Role";
  const company = pickAfter(lines, /^(company|employer|hiring for)\s*:?\s*/i) || "Hiring Organization";
  const location = pickAfter(lines, /^(location|job location)\s*:?\s*/i) || "";
  const experience = pickAfter(lines, /^(experience|exp)\s*:?\s*/i) || "";

  const keySkillsIdx = lines.findIndex((l) => /^key skills/i.test(l));
  const jobDescIdx = lines.findIndex((l) => /^job description/i.test(l));
  const roleIdx = lines.findIndex((l) => /^role\s*&?\s*responsibilit/i.test(l));

  const skills: string[] = [];
  if (keySkillsIdx >= 0) {
    for (let i = keySkillsIdx + 1; i < lines.length; i++) {
      if (/^(job description|role|education|industry)/i.test(lines[i])) break;
      skills.push(...splitSkillLine(lines[i]));
    }
  }

  const respStart = roleIdx >= 0 ? roleIdx : jobDescIdx >= 0 ? jobDescIdx + 1 : -1;
  const responsibilities: string[] = [];
  if (respStart >= 0) {
    for (let i = respStart + (roleIdx >= 0 ? 1 : 0); i < lines.length; i++) {
      if (/^(key skills|education|industry|functional area)/i.test(lines[i])) break;
      if (lines[i].length > 12) responsibilities.push(stripBullet(lines[i]));
    }
  }

  return [
    `POSITION: ${title}`,
    `COMPANY: ${company}`,
    location ? `LOCATION: ${location}` : "",
    experience ? `EXPERIENCE: ${experience}` : "",
    "",
    "MANDATORY REQUIREMENTS:",
    ...skills.map((s) => `- ${s}`),
    "",
    "RESPONSIBILITIES:",
    ...responsibilities.map((r) => `- ${r}`)
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeInstahyre(text: string): string {
  const lines = text
    .split("\n")
    .map((l) => l.replace(/\u00a0/g, " ").trim())
    .filter((l) => l && !/^instahyre\.com/i.test(l));

  const title = pickAfter(lines, /^(job title|role)\s*:?\s*/i) || lines[0] || "Role";
  const company = pickAfter(lines, /^company\s*:?\s*/i) || "Hiring Organization";
  const location = pickAfter(lines, /^location\s*:?\s*/i) || "";

  const mustIdx = lines.findIndex((l) => /^must have skills/i.test(l));
  const goodIdx = lines.findIndex((l) => /^good to have/i.test(l));
  const aboutIdx = lines.findIndex((l) => /^about (the )?role/i.test(l));

  const mandatory: string[] = [];
  if (mustIdx >= 0) {
    const end = goodIdx >= 0 ? goodIdx : aboutIdx >= 0 ? aboutIdx : lines.length;
    for (let i = mustIdx + 1; i < end; i++) {
      mandatory.push(...splitSkillLine(lines[i]));
    }
  }

  const preferred: string[] = [];
  if (goodIdx >= 0) {
    const end = aboutIdx >= 0 ? aboutIdx : lines.length;
    for (let i = goodIdx + 1; i < end; i++) {
      preferred.push(...splitSkillLine(lines[i]));
    }
  }

  const responsibilities: string[] = [];
  if (aboutIdx >= 0) {
    for (let i = aboutIdx + 1; i < lines.length; i++) {
      if (/^(must have|good to have|perks|salary)/i.test(lines[i])) break;
      if (lines[i].length > 12) responsibilities.push(stripBullet(lines[i]));
    }
  }

  return [
    `POSITION: ${title}`,
    `COMPANY: ${company}`,
    location ? `LOCATION: ${location}` : "",
    "",
    "MANDATORY REQUIREMENTS:",
    ...mandatory.map((s) => `- ${s}`),
    "",
    "PREFERRED REQUIREMENTS:",
    ...preferred.map((s) => `- ${s}`),
    "",
    "RESPONSIBILITIES:",
    ...responsibilities.map((r) => `- ${r}`)
  ]
    .filter(Boolean)
    .join("\n");
}

function pickAfter(lines: string[], header: RegExp): string {
  for (const line of lines) {
    const m = line.match(header);
    if (m) return line.replace(header, "").trim();
  }
  return "";
}

function splitSkillLine(line: string): string[] {
  return line
    .split(/[,;|•·]/)
    .map((s) => s.replace(/^[-•*]\s*/, "").trim())
    .filter((s) => s.length > 1 && s.length < 80);
}

function stripBullet(line: string): string {
  return line.replace(/^[-•*\d.)]+\s*/, "").trim();
}
