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
    ],
    plan90: [
      {
        window: "Days 1–30",
        action: transferable.length
          ? `Rewrite your summary around proven skills: ${transferable
              .slice(0, 3)
              .map((t) => t.skill)
              .join(", ")}.`
          : "Import a fuller resume so we can find transferable proof."
      },
      {
        window: "Days 31–60",
        action: missing.length
          ? `Build one public artifact for: ${missing.slice(0, 2).join(" and ")}. Add it to the vault only after it exists.`
          : "Apply to 8 roles in this family and log outcomes in Tracker."
      },
      {
        window: "Days 61–90",
        action: "Interview using STAR stories from vault projects. Do not claim the missing skills as job experience."
      }
    ],
    thisMonthLearn: missing.slice(0, 3).map(
      (m) => `Ship a 1-week public artifact that uses ${m}, then paste the repo/README into Career Vault — do not add ${m} as job experience first.`
    )
  };
}
