import type { CandidateProfile } from "../models";
import type { CareerEvidence, CareerVault } from "../srs-models";

export function buildCareerVault(profile: CandidateProfile, targetRole = "", goals = ""): CareerVault {
  const evidence: CareerEvidence[] = [];
  let i = 1;

  const push = (type: CareerEvidence["type"], content: string, source: string, tags: string[]) => {
    const text = content.trim();
    const min = type === "skill" ? 2 : 8;
    if (!text || text.length < min) return;
    evidence.push({
      id: `ev-${i++}`,
      type,
      content: text,
      tags,
      source,
      verificationStatus: "approved"
    });
  };

  for (const skill of profile.extractedSkills) {
    push("skill", skill, "Skills section", [skill.toLowerCase(), "skill"]);
  }
  for (const project of profile.extractedProjects) {
    push("project", project, "Projects section", ["project", ...tokenize(project).slice(0, 4)]);
  }

  const work = profile.parsedSections.WORK_EXPERIENCE || "";
  for (const line of splitLines(work)) {
    push("work", line, "Work experience", ["work", ...tokenize(line).slice(0, 4)]);
  }

  const edu = profile.parsedSections.EDUCATION || "";
  for (const line of splitLines(edu)) {
    push("education", line, "Education", ["education"]);
  }

  const certs = profile.parsedSections.CERTIFICATIONS || "";
  for (const line of splitLines(certs)) {
    push("certification", line, "Certifications", ["certification"]);
  }

  const summary = profile.parsedSections.SUMMARY || "";
  for (const line of splitLines(summary)) {
    if (/\d+%|\bachieved\b|\bdelivered\b|\bbuilt\b/i.test(line)) {
      push("achievement", line, "Summary", ["achievement"]);
    }
  }

  return {
    profileId: profile.id,
    targetRole: targetRole || profile.preferences.preferredRoles[0] || "",
    goals,
    evidence,
    updatedAt: new Date().toISOString()
  };
}

export function approvedEvidence(vault: CareerVault): CareerEvidence[] {
  return vault.evidence.filter((e) => e.verificationStatus === "approved");
}

function splitLines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter((l) => l.length >= 8);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter((t) => t.length > 2);
}
