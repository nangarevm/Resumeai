import type { CandidateProfile } from "../models";

export interface TimelineFinding {
  severity: "info" | "warn" | "block";
  title: string;
  detail: string;
}

const DATE_RANGE = /(\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(20\d{2}|19\d{2})\s*[-–—to]+\s*(present|current|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(20\d{2}|19\d{2})?/gi;
const YEAR_CLAIM = /(\d+(?:\.\d+)?)\+?\s+years?/gi;

export function validateTimeline(candidate: CandidateProfile): TimelineFinding[] {
  const findings: TimelineFinding[] = [];
  const text = candidate.rawResumeText;
  const ranges: Array<{ start: number; end: number; raw: string }> = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(DATE_RANGE);
  while ((match = re.exec(text))) {
    const start = Number(match[2]);
    const end = /present|current/i.test(match[0]) ? new Date().getFullYear() : Number(match[4] || match[2]);
    if (Number.isFinite(start) && Number.isFinite(end)) ranges.push({ start, end, raw: match[0] });
  }

  for (const r of ranges) {
    if (r.end < r.start) {
      findings.push({
        severity: "block",
        title: "Impossible date range",
        detail: `"${r.raw}" ends before it starts. Confirm the original dates before publishing.`
      });
    }
  }

  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      const a = ranges[i];
      const b = ranges[j];
      if (a.start < b.end && b.start < a.end && Math.abs(a.start - b.start) >= 1) {
        findings.push({
          severity: "warn",
          title: "Overlapping tenure",
          detail: `"${a.raw}" overlaps "${b.raw}". Overlaps can be valid (concurrent roles) but should be explained.`
        });
      }
    }
  }

  const claimedYears = [...text.matchAll(YEAR_CLAIM)].map((m) => Number(m[1]));
  const span = ranges.length ? Math.max(...ranges.map((r) => r.end)) - Math.min(...ranges.map((r) => r.start)) : 0;
  for (const years of claimedYears) {
    if (span && years > span + 1) {
      findings.push({
        severity: "warn",
        title: "Tenure vs claimed years",
        detail: `Resume claims ${years} years of experience, but dated entries only span about ${span} years.`
      });
    }
  }

  if (/intern/i.test(text) && /(led a team of\s*(1[0-9]|[2-9]\d)|owned the product roadmap|series [abc] fundraising)/i.test(text)) {
    findings.push({
      severity: "warn",
      title: "Title vs responsibility mismatch",
      detail: "Intern/junior title appears alongside executive-scale claims. Confirm scope before rewriting as leadership."
    });
  }

  const education = candidate.parsedSections.EDUCATION ?? "";
  if (education && /20\d{2}/.test(education) && ranges.length === 0) {
    findings.push({
      severity: "info",
      title: "Work dates missing",
      detail: "Education dates are present but work/project dates are sparse. Recruiters use dates to check chronology."
    });
  }

  if (!findings.length) {
    findings.push({
      severity: "info",
      title: "No chronology conflicts detected",
      detail: "Dated ranges, claimed years, and intern/leadership language look internally consistent."
    });
  }
  return findings;
}
