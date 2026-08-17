import type { CareerVault } from "../srs-models";
import type { CareerChangePlan } from "../srs-models";
import { approvedEvidence } from "./career-vault";

const ROLE_SKILLS: Record<string, string[]> = {
  "product manager": ["communication", "sql", "roadmap", "stakeholder", "research", "analytics"],
  "data analyst": ["sql", "excel", "python", "dashboard", "analysis", "statistics"],
  "software engineer": ["python", "java", "sql", "git", "api", "testing"],
  "machine learning engineer": ["python", "machine learning", "sql", "git", "model"],
  "marketing": ["seo", "campaign", "analytics", "content", "communication"]
};

export function planCareerChange(vault: CareerVault, targetRole: string): CareerChangePlan {
  const role = targetRole.toLowerCase() || "software engineer";
  const needed = ROLE_SKILLS[role] || ROLE_SKILLS["software engineer"];
  const approved = approvedEvidence(vault);
  const blob = approved.map((e) => `${e.content} ${e.tags.join(" ")}`.toLowerCase()).join("\n");

  const transferable: CareerChangePlan["transferable"] = [];
  const missing: string[] = [];

  for (const skill of needed) {
    const hit = approved.find((e) => e.content.toLowerCase().includes(skill) || blob.includes(skill));
    if (hit) transferable.push({ skill, fromEvidence: hit.content });
    else missing.push(skill);
  }

  const truthfulFraming = transferable.map(
    (t) => `Keep '${t.skill}' — it already appears in: ${t.fromEvidence.slice(0, 90)}`
  );
  truthfulFraming.push(
    ...missing.map((m) => `Do not write '${m}' as professional experience. Add a course/project first, then confirm it in the vault.`)
  );

  return {
    targetRole,
    transferable,
    missing,
    truthfulFraming,
    strategy: [
      `Lead with ${transferable[0]?.skill || "communication"} because the vault already proves it.`,
      missing.length
        ? `Close gaps with a small public project covering: ${missing.slice(0, 3).join(", ")}.`
        : "No critical skill gap detected against this role family.",
      "Use Career Change Mode bullets only after you accept them — never auto-rewrite the vault."
    ]
  };
}
