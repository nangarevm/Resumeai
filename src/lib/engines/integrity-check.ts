/** Truth Guard / Resume Integrity Check — section 16 of the AI Job
 *  Application Optimizer spec, marked mandatory there.
 *
 *  This is deliberately separate from verification.ts's scanVerification():
 *  that engine flags content introduced during tailoring that ISN'T backed
 *  by Career Vault evidence (fabrication detection). This engine instead
 *  surfaces claims that ARE the candidate's own words — counts, metrics,
 *  and named integrations — worth a final self-attestation pass before
 *  export, because these are exactly the kind of specific, checkable
 *  claims a recruiter is most likely to probe in an interview. */

export type IntegrityClaimKind = "count" | "qualifier" | "integration";

export interface IntegrityClaim {
  text: string;
  kind: IntegrityClaimKind;
}

const COUNT_RE =
  /\b\d+\+?\s*(production\s+apps?|applications?|apps?|projects?|users?|customers?|clients?|releases?|downloads?|platforms?|features?|sprints?|team\s+members?|reports?|dashboards?|integrations?)\b/i;
const PERCENT_RE = /\b\d+\+?\s*%/;
const QUALIFIER_RE = /\b(AI-based|AI-powered|automated|advanced|cutting-edge|state-of-the-art|highly optimized|next-generation)\b/i;
const INTEGRATION_RE = /\b(?:[A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2})\s+(?:SDK|API|integration)\b/;

function classify(line: string): IntegrityClaimKind | null {
  if (COUNT_RE.test(line) || PERCENT_RE.test(line)) return "count";
  if (INTEGRATION_RE.test(line)) return "integration";
  if (QUALIFIER_RE.test(line)) return "qualifier";
  return null;
}

/** Scans plain resume text for claims worth a final human confirmation
 *  pass — one claim per matching line, deduplicated, order preserved. */
export function extractVerifiableClaims(resumeText: string): IntegrityClaim[] {
  const claims: IntegrityClaim[] = [];
  const seen = new Set<string>();

  for (const rawLine of resumeText.split("\n")) {
    const line = rawLine.trim();
    if (line.length < 8) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    const kind = classify(line);
    if (!kind) continue;
    seen.add(key);
    claims.push({ text: line, kind });
  }
  return claims;
}

export const INTEGRITY_KIND_LABELS: Record<IntegrityClaimKind, string> = {
  count: "Number/metric",
  qualifier: "Strong claim",
  integration: "Named integration"
};
