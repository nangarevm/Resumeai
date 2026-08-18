import type { CandidateProfile, JobDescription } from "../models";
import type { CareerVault, RoleOpportunity } from "../srs-models";
import { approvedEvidence } from "./career-vault";
import { getMarketSignals, resolveRoleFamily } from "./market-intelligence";

const ROLE_CORPUS: Record<string, { skills: string[]; label: string }> = {
  sdet: {
    label: "SDET / QA Automation Engineer",
    skills: ["playwright", "selenium", "api testing", "ci/cd", "python", "java", "jenkins", "automation"]
  },
  software_engineer: {
    label: "Software Engineer",
    skills: ["python", "java", "sql", "git", "api", "system design", "cloud"]
  },
  ml_engineer: {
    label: "Machine Learning Engineer",
    skills: ["python", "machine learning", "sql", "pytorch", "tensorflow", "mlops"]
  },
  backend_engineer: {
    label: "Backend Engineer",
    skills: ["python", "java", "api", "sql", "microservices", "docker", "rest"]
  },
  devops: {
    label: "DevOps / Platform Engineer",
    skills: ["ci/cd", "docker", "kubernetes", "jenkins", "terraform", "aws", "linux"]
  },
  data_analyst: {
    label: "Data Analyst",
    skills: ["sql", "excel", "python", "dashboard", "statistics", "visualization"]
  },
  product_manager: {
    label: "Product Manager",
    skills: ["roadmap", "stakeholder", "analytics", "sql", "communication", "research"]
  }
};

export function detectOpportunities(
  profile: CandidateProfile,
  jd: JobDescription,
  vault: CareerVault,
  fitScore: number
): RoleOpportunity[] {
  const approved = approvedEvidence(vault);
  const blob = `${profile.rawResumeText} ${approved.map((e) => e.content).join(" ")}`.toLowerCase();
  const jdFamily = resolveRoleFamily(jd.title, jd.domain);
  const market = getMarketSignals(jd.title, jd.domain);
  const out: RoleOpportunity[] = [];

  // Best-fit: target JD role
  out.push({
    role: jd.title,
    matchPercent: fitScore,
    why: `Active target job at ${jd.companyName}. Fit is based on vault evidence — not keyword stuffing.`,
    category: "best_fit"
  });

  // Adjacent from market signals
  for (const adj of market.adjacentRoles.slice(0, 3)) {
    const overlap = adj.overlapSkills.filter((s) => blob.includes(s.toLowerCase()));
    const pct = Math.round((overlap.length / adj.overlapSkills.length) * 100);
    if (pct >= 35) {
      const missing = adj.overlapSkills.filter((s) => !blob.includes(s.toLowerCase()));
      out.push({
        role: adj.role,
        matchPercent: pct,
        why: `Shares ${overlap.length} skills with your vault: ${overlap.join(", ")}.`,
        skillsToAdd: missing.slice(0, 3),
        category: "adjacent"
      });
    }
  }

  // Corpus-based adjacent / high-growth
  for (const [key, role] of Object.entries(ROLE_CORPUS)) {
    if (key === jdFamily) continue;
    const hits = role.skills.filter((s) => blob.includes(s));
    const pct = Math.round((hits.length / role.skills.length) * 100);
    if (pct < 40) continue;

    const missing = role.skills.filter((s) => !blob.includes(s));
    const isQuickWin = pct >= 65 && missing.length <= 2;

    out.push({
      role: role.label,
      matchPercent: pct,
      why: `Vault proves: ${hits.slice(0, 4).join(", ")}.`,
      skillsToAdd: missing.slice(0, 3),
      category: isQuickWin ? "quick_win" : pct >= 50 ? "high_growth" : "adjacent"
    });
  }

  // Deduplicate by role name, keep highest match
  const byRole = new Map<string, RoleOpportunity>();
  for (const o of out) {
    const existing = byRole.get(o.role);
    if (!existing || o.matchPercent > existing.matchPercent) byRole.set(o.role, o);
  }

  return Array.from(byRole.values())
    .sort((a, b) => b.matchPercent - a.matchPercent)
    .slice(0, 8);
}
