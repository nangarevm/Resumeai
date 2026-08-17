import type { CandidateProfile } from "../models";
import type { CareerVault, VerificationFinding } from "../srs-models";
import { approvedEvidence } from "./career-vault";

const METRIC = /\b\d+\s*%|\b\$\d|\b\d+\s*(users|customers|engineers|people)\b/i;
const TITLE_INFLATION = /\b(cto|vp|head of|director|principal architect)\b/i;

export function scanVerification(resumeText: string, vault: CareerVault, profile: CandidateProfile): VerificationFinding[] {
  const findings: VerificationFinding[] = [];
  const approved = approvedEvidence(vault);
  const blob = approved.map((e) => e.content.toLowerCase()).join("\n");
  let i = 1;

  for (const line of resumeText.split("\n")) {
    const t = line.trim();
    if (t.length < 20) continue;

    if (METRIC.test(t) && !blob.includes(t.toLowerCase().slice(0, 40))) {
      const inVault = approved.some((e) => similar(e.content, t));
      if (!inVault) {
        findings.push({
          id: `vf-${i++}`,
          claim: t,
          risk: "high",
          reason: "Numeric result is not in approved Career Vault evidence.",
          resolution: "open"
        });
      }
    }

    if (TITLE_INFLATION.test(t) && !/intern|student|associate|engineer|analyst/i.test(profile.rawResumeText.split("\n")[0] || "")) {
      if (!blob.includes("director") && !blob.includes("vp") && !blob.includes("head of")) {
        findings.push({
          id: `vf-${i++}`,
          claim: t,
          risk: "high",
          reason: "Senior title language is not backed by Career Vault work history.",
          resolution: "open"
        });
      }
    }
  }

  const inventedSkills = findInventedSkills(resumeText, profile);
  for (const skill of inventedSkills) {
    findings.push({
      id: `vf-${i++}`,
      claim: `Skill '${skill}' appears in the tailored draft but not in the source vault.`,
      risk: "high",
      reason: "Skills must exist in the imported resume or an approved vault item.",
      resolution: "open"
    });
  }

  return findings;
}

export function hasBlockingFindings(findings: VerificationFinding[]): boolean {
  return findings.some((f) => f.risk === "high" && f.resolution === "open");
}

function similar(a: string, b: string): boolean {
  const aa = a.toLowerCase();
  const bb = b.toLowerCase();
  return aa.includes(bb.slice(0, 28)) || bb.includes(aa.slice(0, 28));
}

function findInventedSkills(resumeText: string, profile: CandidateProfile): string[] {
  const known = new Set(profile.extractedSkills.map((s) => s.toLowerCase()));
  const suspects = ["kubernetes", "terraform", "aws", "gcp", "azure", "pytorch", "tensorflow", "react", "golang"];
  return suspects.filter((s) => resumeText.toLowerCase().includes(s) && !known.has(s) && !profile.rawResumeText.toLowerCase().includes(s));
}
