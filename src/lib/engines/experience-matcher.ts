import type { CandidateProfile } from "../models";
import type { JobDescription } from "../models";

export interface ExperienceMatch {
  jdMinYears: number | null;
  jdMaxYears: number | null;
  resumeYears: number;
  status: "meets" | "under" | "over" | "unknown";
  summary: string;
  workRanges: Array<{ start: number; end: number; label: string }>;
}

const DATE_RANGE =
  /(\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(20\d{2}|19\d{2})\s*[-–—to]+\s*(present|current|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(20\d{2}|19\d{2})?/gi;

export function parseJdYears(jd: JobDescription): { min: number | null; max: number | null } {
  const blob = `${jd.title} ${jd.rawText}`;
  const range = blob.match(/(\d+)\s*[–-]\s*(\d+)\+?\s*years?/i);
  if (range) return { min: Number(range[1]), max: Number(range[2]) };
  const plus = blob.match(/(\d+)\+\s*years?/i);
  if (plus) return { min: Number(plus[1]), max: null };
  const plain = blob.match(/\b(\d+)\s*years?\s+(?:of\s+)?(?:qa|testing|experience)/i);
  if (plain) return { min: Number(plain[1]), max: null };
  for (const r of jd.mandatoryRequirements) {
    const m = r.name.match(/(\d+)\s*[–-]\s*(\d+)/);
    if (m) return { min: Number(m[1]), max: Number(m[2]) };
    const p = r.name.match(/(\d+)\+/);
    if (p) return { min: Number(p[1]), max: null };
  }
  return { min: null, max: null };
}

export function estimateResumeYears(profile: CandidateProfile): ExperienceMatch["workRanges"] {
  const text = `${profile.parsedSections.WORK_EXPERIENCE || ""}\n${profile.rawResumeText}`;
  const ranges: ExperienceMatch["workRanges"] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(DATE_RANGE);
  while ((match = re.exec(text))) {
    const start = Number(match[2]);
    const end = /present|current/i.test(match[0]) ? new Date().getFullYear() : Number(match[4] || match[2]);
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      ranges.push({ start, end, label: match[0].trim() });
    }
  }
  return ranges;
}

/** Conservative total: span from earliest start to latest end (not sum of overlaps). */
export function totalYearsFromRanges(ranges: ExperienceMatch["workRanges"]): number {
  if (!ranges.length) return 0;
  const start = Math.min(...ranges.map((r) => r.start));
  const end = Math.max(...ranges.map((r) => r.end));
  return Math.max(0, end - start);
}

export function matchExperience(profile: CandidateProfile, jd: JobDescription): ExperienceMatch {
  const { min: jdMinYears, max: jdMaxYears } = parseJdYears(jd);
  const workRanges = estimateResumeYears(profile);
  let resumeYears = totalYearsFromRanges(workRanges);

  const claimed = [...profile.rawResumeText.matchAll(/(\d+(?:\.\d+)?)\+?\s+years?/gi)].map((m) => Number(m[1]));
  if (claimed.length && resumeYears === 0) {
    resumeYears = Math.min(...claimed);
  }

  if (jdMinYears == null) {
    return {
      jdMinYears,
      jdMaxYears,
      resumeYears,
      status: resumeYears > 0 ? "meets" : "unknown",
      summary:
        resumeYears > 0
          ? `Resume dates span ~${resumeYears} years. JD did not specify a clear years requirement.`
          : "Add dated work history so we can compare years of experience.",
      workRanges
    };
  }

  if (resumeYears === 0) {
    return {
      jdMinYears,
      jdMaxYears,
      resumeYears,
      status: "unknown",
      summary: `JD asks for ${formatJdRange(jdMinYears, jdMaxYears)}. No dated work history found — add MM/YYYY ranges.`,
      workRanges
    };
  }

  if (resumeYears < jdMinYears) {
    return {
      jdMinYears,
      jdMaxYears,
      resumeYears,
      status: "under",
      summary: `JD asks for ${formatJdRange(jdMinYears, jdMaxYears)}; your dated history spans ~${resumeYears} years. Apply only if concurrent roles explain the gap — do not invent years.`,
      workRanges
    };
  }

  if (jdMaxYears != null && resumeYears > jdMaxYears + 2) {
    return {
      jdMinYears,
      jdMaxYears,
      resumeYears,
      status: "over",
      summary: `You exceed the JD range (${formatJdRange(jdMinYears, jdMaxYears)}) with ~${resumeYears} years — still apply; lead with relevant tools, not inflated titles.`,
      workRanges
    };
  }

  return {
    jdMinYears,
    jdMaxYears,
    resumeYears,
    status: "meets",
    summary: `Experience aligns: JD ${formatJdRange(jdMinYears, jdMaxYears)}, resume ~${resumeYears} years from dated roles.`,
    workRanges
  };
}

function formatJdRange(min: number, max: number | null): string {
  if (max != null) return `${min}–${max} years`;
  return `${min}+ years`;
}
