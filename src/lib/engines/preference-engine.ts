import type { CandidateProfile, JobDescription } from "../models";

export function calculateAlignment(candidate: CandidateProfile, jd: JobDescription): string {
  const prefs = candidate.preferences;
  if (!prefs) return "MEDIUM";
  let matches = 0;

  for (const role of prefs.preferredRoles) {
    if (containsEither(jd.title, role)) {
      matches++;
      break;
    }
  }
  for (const dom of prefs.preferredDomains) {
    if (containsEither(jd.domain, dom)) {
      matches++;
      break;
    }
  }
  for (const company of prefs.dreamCompanies) {
    if (containsEither(jd.companyName, company)) {
      matches++;
      break;
    }
  }

  if (matches >= 2) return "HIGH ALIGNMENT";
  if (matches === 1) return "MEDIUM ALIGNMENT";
  return "LOW ALIGNMENT";
}

function containsEither(a: string, b: string): boolean {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  return la.includes(lb) || lb.includes(la);
}
