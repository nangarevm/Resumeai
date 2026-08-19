import type { ImportanceName, JobDescription, Requirement, RequirementCategoryName } from "../models";
import { expandSynonyms } from "../engines/synonym-lexicon";
import { normalize, splitList } from "./text-normalizer";

/** Skills we scan for inside long JD prose (responsibilities, qualifications blocks). */
const SKILL_CATALOG: Array<{ label: string; patterns: RegExp[] }> = [
  { label: "playwright", patterns: [/\bplaywright\b/i] },
  { label: "JBehave", patterns: [/\bjbehave\b/i] },
  { label: "Selenium", patterns: [/\bselenium\b/i] },
  { label: "Cypress", patterns: [/\bcypress\b/i] },
  { label: "API testing", patterns: [/\bapi testing\b/i, /\brest api\b/i, /\brestful api\b/i] },
  { label: "Postman", patterns: [/\bpostman\b/i] },
  { label: "Jenkins", patterns: [/\bjenkins\b/i] },
  { label: "GitHub Actions", patterns: [/\bgithub actions\b/i] },
  { label: "GitLab CI/CD", patterns: [/\bgitlab ci\/?cd\b/i] },
  { label: "Azure DevOps", patterns: [/\bazure devops\b/i] },
  { label: "CI/CD", patterns: [/\bci\/?cd\b/i] },
  { label: "Git", patterns: [/\bgit\b/i, /\bversion control\b/i] },
  { label: "TypeScript", patterns: [/\btypescript\b/i, /\bts\b/] },
  { label: "JavaScript", patterns: [/\bjavascript\b/i] },
  { label: "Java", patterns: [/\bjava\b/i] },
  { label: "Python", patterns: [/\bpython\b/i] },
  { label: "SQL", patterns: [/\bsql\b/i, /\bdatabase testing\b/i] },
  { label: "Manual testing", patterns: [/\bmanual testing\b/i] },
  { label: "Automation testing", patterns: [/\bautomation testing\b/i, /\btest automation\b/i] },
  { label: "Microservices testing", patterns: [/\bmicroservices?\b/i] },
  { label: "Agile/Scrum", patterns: [/\bagile\b/i, /\bscrum\b/i] },
  { label: "STLC", patterns: [/\bstlc\b/i, /\bsoftware testing life cycle\b/i] },
  { label: "SDLC", patterns: [/\bsdlc\b/i, /\bsoftware development life cycle\b/i] },
  { label: "Jira", patterns: [/\bjira\b/i] },
  { label: "JMeter", patterns: [/\bjmeter\b/i, /\bgatling\b/i] },
  { label: "Docker", patterns: [/\bdocker\b/i] },
  { label: "AWS", patterns: [/\baws\b/i, /\bamazon web services\b/i] },
  { label: "Azure", patterns: [/\bazure\b/i] },
  { label: "GCP", patterns: [/\bgcp\b/i, /\bgoogle cloud\b/i] },
  { label: "Machine Learning", patterns: [/\bmachine learning\b/i] },
  { label: "Kubernetes", patterns: [/\bkubernetes\b/i, /\bk8s\b/i] },
  { label: "Terraform", patterns: [/\bterraform\b/i, /\binfrastructure as code\b/i] },
  { label: "GraphQL", patterns: [/\bgraphql\b/i] },
  { label: "Go", patterns: [/\bgolang\b/i, /\bgo lang\b/i] },
  { label: "Rust", patterns: [/\brust\b/i] },
  { label: "LLM", patterns: [/\bllm\b/i, /\blarge language models?\b/i, /\bgenerative ai\b/i] },
  { label: "AI Agents", patterns: [/\bai agents?\b/i, /\bagentic\b/i, /\btool[- ]calling\b/i, /\bmcp\b/i, /\bmodel context protocol\b/i] },
  { label: "RAG", patterns: [/\brag\b/i, /\bretrieval augmented generation\b/i, /\bvector (database|db)\b/i, /\bembeddings\b/i] },
  { label: "Prompt Engineering", patterns: [/\bprompt engineering\b/i] },
  { label: "LangChain", patterns: [/\blangchain\b/i, /\blanggraph\b/i, /\bllamaindex\b/i] },
  // Non-tech fields — so a JD in any industry gets real requirements detected,
  // not just software/QA. Kept as specific phrases/certifications to avoid
  // false positives on generic words.
  { label: "Patient Care", patterns: [/\bpatient care\b/i, /\bvital signs\b/i, /\bphlebotomy\b/i] },
  { label: "EHR/EMR Systems", patterns: [/\behr\b/i, /\bemr\b/i, /\belectronic health records\b/i, /\bepic\b/i, /\bcerner\b/i] },
  { label: "Nursing Certification", patterns: [/\bbls certification\b/i, /\bacls certification\b/i, /\brn license\b/i, /\bcna\b/i] },
  { label: "Curriculum Development", patterns: [/\bcurriculum development\b/i, /\blesson planning\b/i] },
  { label: "Classroom Management", patterns: [/\bclassroom management\b/i, /\bstudent assessment\b/i] },
  { label: "Legal Research", patterns: [/\blegal research\b/i, /\blitigation support\b/i] },
  { label: "Contract Review", patterns: [/\bcontract review\b/i, /\blegal drafting\b/i] },
  { label: "Paralegal", patterns: [/\bparalegal\b/i] },
  { label: "Guest Service", patterns: [/\bguest service\b/i, /\bfront desk\b/i, /\bhotel operations\b/i] },
  { label: "Food Safety", patterns: [/\bfood safety\b/i, /\bservsafe\b/i] },
  { label: "POS Systems", patterns: [/\bpos system\b/i, /\bpoint of sale\b/i] },
  { label: "CRM / Salesforce", patterns: [/\bcrm\b/i, /\bsalesforce\b/i, /\bhubspot\b/i] },
  { label: "Lead Generation", patterns: [/\blead generation\b/i, /\bcold calling\b/i] },
  { label: "Account Management", patterns: [/\baccount management\b/i, /\bquota attainment\b/i] },
  { label: "Electrical/Plumbing/HVAC", patterns: [/\belectrical wiring\b/i, /\bplumbing\b/i, /\bhvac\b/i, /\bwelding\b/i] },
  { label: "OSHA Safety Certification", patterns: [/\bosha\b/i, /\bblueprint reading\b/i] },
  { label: "Supply Chain", patterns: [/\bsupply chain\b/i, /\blogistics coordination\b/i] },
  { label: "Warehouse Operations", patterns: [/\bwarehouse operations\b/i, /\bforklift certification\b/i, /\bwms\b/i] },
  { label: "Quality Control", patterns: [/\bquality control\b/i, /\bquality assurance \(manufacturing\)\b/i] },
  { label: "Lean/Six Sigma", patterns: [/\blean manufacturing\b/i, /\bsix sigma\b/i] },
  { label: "Production Line Operations", patterns: [/\bproduction line\b/i, /\bassembly line\b/i, /\bcnc machining\b/i] },
  { label: "Graphic Design", patterns: [/\bgraphic design\b/i, /\badobe creative suite\b/i, /\bphotoshop\b/i, /\billustrator\b/i] },
  { label: "Video Editing", patterns: [/\bvideo editing\b/i, /\bpremiere pro\b/i] },
  { label: "Microsoft Office", patterns: [/\bmicrosoft office\b/i, /\bgoogle workspace\b/i] },
  { label: "Data Entry", patterns: [/\bdata entry\b/i] },
  { label: "Call Center / Help Desk", patterns: [/\bcall center\b/i, /\bhelp desk\b/i, /\bticketing system\b/i, /\bzendesk\b/i] },
  { label: "Customer Satisfaction", patterns: [/\bcustomer satisfaction\b/i, /\bcsat\b/i, /\bconflict resolution\b/i] },
  { label: "Recruiting / Talent Acquisition", patterns: [/\brecruiting\b/i, /\btalent acquisition\b/i, /\bonboarding\b/i] },
  { label: "HRIS", patterns: [/\bhris\b/i, /\bworkday\b/i, /\bbamboohr\b/i, /\bpayroll\b/i] }
];

const RESPONSIBILITY_HEADERS =
  /^(responsibilities|what you will do|what you'll do|key responsibilities|role overview|about the role|job description)\b/i;
const REQUIREMENT_HEADERS =
  /^(mandatory|required|must[- ]have|requirements?|qualifications?|skills required|key requirements|minimum qualifications|what we're looking for|what we need)\b/i;
const PREFERRED_HEADERS = /^(preferred|desirable|nice[- ]to[- ]have|good[- ]to[- ]have|bonus|plus)\b/i;
const META_HEADERS = /^(position|title|company|domain|location|experience level|education|description):/i;

export function parseJD(id: string, rawText: string): JobDescription {
  const text = normalize(rawText);
  const title = extractField(text, "POSITION:", extractField(text, "TITLE:", inferTitle(text)));
  const company = extractField(text, "COMPANY:", inferCompany(text));
  const domain = extractField(text, "DOMAIN:", inferDomain(text, title));

  const jd: JobDescription = {
    id,
    title: cleanMarkdown(title).slice(0, 80),
    companyName: company,
    domain,
    rawText: text,
    mandatoryRequirements: [],
    preferredRequirements: [],
    responsibilities: [],
    seniority: inferSeniority(text, title),
    location: extractField(text, "LOCATION:", inferLocation(text))
  };

  const structured = extractStructuredLists(text);
  const mined = extractSkillsFromText(text);

  if (structured.mandatory.length || structured.preferred.length) {
    jd.mandatoryRequirements = dedupeRequirements(structured.mandatory);
    jd.preferredRequirements = dedupeRequirements(structured.preferred);
    jd.responsibilities = structured.responsibilities;
  } else {
    jd.mandatoryRequirements = dedupeRequirements(mined.mandatory);
    jd.preferredRequirements = dedupeRequirements(mined.preferred);
    jd.responsibilities = structured.responsibilities;
  }

  const years = inferYearsRequirement(text);
  if (years) jd.mandatoryRequirements.unshift(createRequirement(years, true, "EXPERIENCE"));

  if (jd.mandatoryRequirements.length === 0 && jd.preferredRequirements.length === 0) {
    jd.mandatoryRequirements = [
      createRequirement("Core Industry Competency", true),
      createRequirement("Relevant Domain Experience", true)
    ];
    jd.preferredRequirements = [createRequirement("Advanced Industry Certification", false)];
  }

  return jd;
}

export function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/^#+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isSkillLikeLine(line: string): boolean {
  const clean = cleanMarkdown(line);
  if (clean.length < 3) return false;
  if (clean.length <= 72 && !/^perform |^validate |^participate |^collaborate |^identify |^design and maintain/i.test(clean)) {
    return true;
  }
  if (SKILL_CATALOG.some(({ patterns }) => patterns.some((p) => p.test(clean)))) return true;
  if (/^\d+\+?\s*years?/i.test(clean)) return true;
  if (/^(strong|good|hands-on|experience with|knowledge of)\b/i.test(clean) && clean.length < 100) return true;
  return clean.length <= 48;
}

export function createRequirement(
  name: string,
  isMandatory: boolean,
  forceCategory?: RequirementCategoryName
): Requirement {
  const cleanName = cleanMarkdown(name);
  const lower = cleanName.toLowerCase();
  let category: RequirementCategoryName = forceCategory || "SKILL_TECH";
  const importance: ImportanceName = isMandatory ? "HIGH" : "MEDIUM";
  const synonyms: string[] = [];

  if (!forceCategory) {
    if (/(project|system|campaign|portfolio)/i.test(lower)) category = "PROJECT";
    else if (/(degree|b\.tech|b\.e|education|bachelor|master)/i.test(lower)) category = "EDUCATION";
    else if (/(\d+\+?\s*years?|internship)/i.test(lower)) category = "EXPERIENCE";
    else if (/(certified|certification|license)/i.test(lower)) category = "CERTIFICATION";
    else if (/(communication|leadership|teamwork|stakeholder|collaborat)/i.test(lower)) category = "SKILL_SOFT";
  }

  return {
    name: cleanName,
    category,
    importance,
    mandatory: isMandatory,
    synonyms: expandSynonyms(cleanName, synonyms)
  };
}

function extractStructuredLists(text: string): {
  mandatory: Requirement[];
  preferred: Requirement[];
  responsibilities: string[];
} {
  const mandatory: Requirement[] = [];
  const preferred: Requirement[] = [];
  const responsibilities: string[] = [];
  let mode: "none" | "mandatory" | "preferred" | "responsibility" = "none";

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const upper = trimmed.toUpperCase();
    const header = trimmed.replace(/[:\s]+$/, "");

    if (RESPONSIBILITY_HEADERS.test(header)) {
      mode = "responsibility";
      continue;
    }
    if (REQUIREMENT_HEADERS.test(upper) && !/PREFERRED|NICE/.test(upper)) {
      mode = "mandatory";
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx !== -1 && colonIdx < trimmed.length - 1) {
        parseCommaSeparated(trimmed.slice(colonIdx + 1), true, mandatory);
      }
      continue;
    }
    if (PREFERRED_HEADERS.test(upper)) {
      mode = "preferred";
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx !== -1 && colonIdx < trimmed.length - 1) {
        parseCommaSeparated(trimmed.slice(colonIdx + 1), false, preferred);
      }
      continue;
    }
    if (META_HEADERS.test(trimmed)) {
      mode = "none";
      continue;
    }

    if (/^[-•*]/.test(trimmed)) {
      const body = cleanMarkdown(trimmed.replace(/^[-•*]\s*/, ""));
      if (!body) continue;

      if (mode === "preferred") {
        pushRequirement(body, true, preferred);
        continue;
      }
      if (mode === "mandatory") {
        pushRequirement(body, true, mandatory);
        continue;
      }
      if (mode === "responsibility" || (!isSkillLikeLine(body) && body.length > 40)) {
        responsibilities.push(body);
        continue;
      }
      if (isSkillLikeLine(body)) pushRequirement(body, false, mandatory);
      else if (body.length > 40) responsibilities.push(body);
    } else if (mode === "mandatory" || mode === "preferred") {
      parseCommaSeparated(trimmed, mode === "mandatory", mode === "mandatory" ? mandatory : preferred);
    }
  }

  return { mandatory, preferred, responsibilities };
}

function pushRequirement(body: string, isPreferred: boolean, target: Requirement[]) {
  const req = createRequirement(body, !isPreferred);
  target.push(req);
}

function parseCommaSeparated(text: string, isMandatory: boolean, target: Requirement[]) {
  for (const part of splitList(cleanMarkdown(text.replace(/^[-•*]\s*/, "")))) {
    if (part.length > 1 && isSkillLikeLine(part)) target.push(createRequirement(part, isMandatory));
  }
}

function extractSkillsFromText(text: string): { mandatory: Requirement[]; preferred: Requirement[] } {
  const blob = cleanMarkdown(text);
  const mandatory: Requirement[] = [];
  const preferred: Requirement[] = [];

  for (const { label, patterns } of SKILL_CATALOG) {
    if (patterns.some((p) => p.test(blob))) {
      mandatory.push(createRequirement(label, true));
    }
  }

  const nice = ["performance testing", "security testing", "mobile testing", "docker", "kubernetes"];
  for (const n of nice) {
    if (blob.toLowerCase().includes(n) && !mandatory.some((m) => m.name.toLowerCase() === n)) {
      preferred.push(createRequirement(n.replace(/\b\w/g, (c) => c.toUpperCase()), false));
    }
  }

  return { mandatory, preferred };
}

function dedupeRequirements(list: Requirement[]): Requirement[] {
  const seen = new Set<string>();
  const out: Requirement[] = [];
  for (const r of list) {
    const key = r.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out.slice(0, 32);
}

function inferYearsRequirement(text: string): string | null {
  const m = text.match(/(\d+\s*[–-]\s*\d+|\d+\+)\s*years?(?:\s+of)?(?:\s+\w+){0,4}\s+(?:qa|testing|experience)/i);
  if (m) {
    const cleaned = cleanMarkdown(m[0]);
    return /experience$/i.test(cleaned) ? cleaned : `${cleaned} experience`;
  }
  const m2 = text.match(/\b(\d+\+)\s*years?\b/i);
  if (m2) return `${m2[1]}+ years experience`;
  return null;
}

function extractField(text: string, prefix: string, fallback: string): string {
  for (const line of text.split("\n")) {
    if (line.toUpperCase().startsWith(prefix.toUpperCase())) {
      const val = line.slice(prefix.length).trim();
      if (val) return cleanMarkdown(val);
    }
  }
  return fallback;
}

function inferTitle(text: string): string {
  const roleLine = text.match(/^(?:position|title|role)\s*:\s*(.+)$/im);
  if (roleLine) return cleanMarkdown(roleLine[1]).slice(0, 60);

  const hiring = text.match(
    /\b(?:hiring|seeking|looking for)\s+(?:an?\s+)?([A-Za-z0-9/ &-]{3,48}?)(?:\s+(?:to|who|with|for|responsible)|[,.\n]|$)/i
  );
  if (hiring) return cleanMarkdown(hiring[1].trim());

  for (const line of text.split("\n")) {
    const t = line.trim();
    if (t.length < 8 || t.length > 72) continue;
    if (/^(senior|lead|staff|principal|junior|qa|test|software|automation|engineer|developer|analyst|manager|intern)\b/i.test(t)) {
      return cleanMarkdown(t).slice(0, 60);
    }
  }
  return "Specialist Position";
}

function inferCompany(text: string): string {
  const m = text.match(/\bat\s+([A-Z][A-Za-z0-9 .&-]{2,40})\b/);
  return m ? m[1].trim() : "Hiring Organization";
}

function inferDomain(text: string, title: string): string {
  const blob = `${title} ${text}`.toLowerCase();
  if (/(qa|quality assurance|test engineer|playwright|selenium)/.test(blob)) return "Quality Assurance";
  if (/(ai|ml|machine learning|data)/.test(blob)) return "Artificial Intelligence";
  if (/(finance|analyst|accounting)/.test(blob)) return "Finance";
  if (/(market|seo|brand)/.test(blob)) return "Marketing";
  if (/(java|software|developer|engineer)/.test(blob)) return "Software Development";
  return "General Industry";
}

function inferSeniority(text: string, title: string): string {
  const blob = `${title} ${text}`.toLowerCase();
  if (/(intern|internship|campus)/.test(blob)) return "Intern";
  if (/(junior|associate|0 to 2|0-2|entry)/.test(blob)) return "Junior";
  if (/(senior|staff|principal|5\+|5–8|5-8|8\+)/.test(blob)) return "Senior";
  if (/(lead|manager|head)/.test(blob)) return "Lead";
  return "Mid";
}

function inferLocation(text: string): string {
  const m = text.match(/\b(remote|hybrid|bengaluru|bangalore|pune|hyderabad|mumbai|delhi|noida|gurgaon|london|new york)\b/i);
  return m ? m[1] : "Not specified";
}
