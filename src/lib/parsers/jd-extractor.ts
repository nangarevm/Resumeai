import type { ImportanceName, JobDescription, Requirement, RequirementCategoryName } from "../models";
import { expandSynonyms } from "../engines/synonym-lexicon";
import { normalize, splitList } from "./text-normalizer";

export function parseJD(id: string, rawText: string): JobDescription {
  const text = normalize(rawText);
  const title = extractField(text, "POSITION:", extractField(text, "TITLE:", inferTitle(text)));
  const company = extractField(text, "COMPANY:", inferCompany(text));
  const domain = extractField(text, "DOMAIN:", inferDomain(text, title));

  const jd: JobDescription = {
    id,
    title,
    companyName: company,
    domain,
    rawText: text,
    mandatoryRequirements: [],
    preferredRequirements: []
  };

  const { mandatory, preferred } = extractRequirementLists(text);
  if (mandatory.length === 0 && preferred.length === 0) {
    jd.mandatoryRequirements = [
      createRequirement("Core Industry Competency", true),
      createRequirement("Relevant Domain Experience", true)
    ];
    jd.preferredRequirements = [createRequirement("Advanced Industry Certification", false)];
  } else {
    jd.mandatoryRequirements = mandatory;
    jd.preferredRequirements = preferred;
  }
  return jd;
}

export function createRequirement(name: string, isMandatory: boolean): Requirement {
  const cleanName = name.trim();
  const lower = cleanName.toLowerCase();
  let category: RequirementCategoryName = "SKILL_TECH";
  const importance: ImportanceName = isMandatory ? "HIGH" : "MEDIUM";
  const synonyms: string[] = [];

  if (/(project|system|campaign|portfolio)/i.test(lower)) {
    category = "PROJECT";
    synonyms.push(cleanName.replace(/Project/gi, "System"));
  } else if (/(degree|b\.tech|b\.e|b\.com|bba|education|bachelor|master)/i.test(lower)) {
    category = "EDUCATION";
  } else if (/(experience|years|internship)/i.test(lower)) {
    category = "EXPERIENCE";
  } else if (/(certified|certification|license)/i.test(lower)) {
    category = "CERTIFICATION";
  } else if (/(communication|leadership|teamwork|strategy)/i.test(lower)) {
    category = "SKILL_SOFT";
  }

  return {
    name: cleanName,
    category,
    importance,
    mandatory: isMandatory,
    synonyms: expandSynonyms(cleanName, synonyms)
  };
}

function extractRequirementLists(text: string): { mandatory: Requirement[]; preferred: Requirement[] } {
  const mandatory: Requirement[] = [];
  const preferred: Requirement[] = [];
  let inMandatory = false;
  let inPreferred = false;

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const upper = trimmed.toUpperCase();

    if (/^(MANDATORY|REQUIRED|MUST[- ]HAVE|REQUIREMENTS?)\b/.test(upper) && !/PREFERRED|NICE/.test(upper)) {
      inMandatory = true;
      inPreferred = false;
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx !== -1 && colonIdx < trimmed.length - 1) {
        parseCommaSeparated(trimmed.slice(colonIdx + 1), true, mandatory);
      }
      continue;
    }
    if (/^(PREFERRED|DESIRABLE|NICE[- ]TO[- ]HAVE|GOOD[- ]TO[- ]HAVE|PLUS)\b/.test(upper)) {
      inMandatory = false;
      inPreferred = true;
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx !== -1 && colonIdx < trimmed.length - 1) {
        parseCommaSeparated(trimmed.slice(colonIdx + 1), false, preferred);
      }
      continue;
    }
    if (/^(POSITION|TITLE|COMPANY|DOMAIN|DESCRIPTION|EXPERIENCE|EDUCATION):/i.test(trimmed)) {
      inMandatory = false;
      inPreferred = false;
      continue;
    }

    if (/^[-•*]/.test(trimmed)) {
      const reqName = trimmed.replace(/^[-•*]\s*/, "").trim();
      if (reqName) {
        const req = createRequirement(reqName, inMandatory || !inPreferred);
        if (inPreferred) preferred.push(req);
        else mandatory.push(req);
      }
    } else if (inMandatory || inPreferred) {
      parseCommaSeparated(trimmed, inMandatory, inMandatory ? mandatory : preferred);
    }
  }

  return { mandatory, preferred };
}

function parseCommaSeparated(text: string, isMandatory: boolean, target: Requirement[]) {
  for (const part of splitList(text.replace(/^[-•*]\s*/, ""))) {
    if (part.length > 1) target.push(createRequirement(part, isMandatory));
  }
}

function extractField(text: string, prefix: string, fallback: string): string {
  for (const line of text.split("\n")) {
    if (line.toUpperCase().startsWith(prefix.toUpperCase())) {
      const val = line.slice(prefix.length).trim();
      if (val) return val;
    }
  }
  return fallback;
}

function inferTitle(text: string): string {
  const m = text.match(/\b(hiring|seeking|looking for)\s+(an?\s+)?([A-Z][A-Za-z/ &-]{3,60})/i);
  if (m) return m[3].trim();
  return "Specialist Position";
}

function inferCompany(text: string): string {
  const m = text.match(/\bat\s+([A-Z][A-Za-z0-9 .&-]{2,40})\b/);
  return m ? m[1].trim() : "Hiring Organization";
}

function inferDomain(text: string, title: string): string {
  const blob = `${title} ${text}`.toLowerCase();
  if (/(ai|ml|machine learning|data)/.test(blob)) return "Artificial Intelligence";
  if (/(finance|analyst|accounting)/.test(blob)) return "Finance";
  if (/(market|seo|brand)/.test(blob)) return "Marketing";
  if (/(solar|renewable|energy)/.test(blob)) return "Renewable Energy";
  if (/(mechanical|cad|solidworks)/.test(blob)) return "Mechanical Engineering";
  if (/(java|software|developer|engineer)/.test(blob)) return "Software Development";
  return "General Industry";
}
