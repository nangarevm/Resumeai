import type { FitReport } from "../srs-models";
import type { JobDescription } from "../models";

export function formatOptimizerReportMarkdown(name: string, job: JobDescription, fit: FitReport): string {
  const o = fit.optimizer;
  if (!o) {
    return `# Career report\n\nNo optimizer data — re-analyze the job on Step 2.\n`;
  }

  const lines: string[] = [
    `# AI Career & CV Optimizer Report`,
    "",
    `**Candidate:** ${name}`,
    `**Target role:** ${job.title} · ${job.companyName}`,
    `**Generated:** ${new Date().toISOString().slice(0, 10)}`,
    "",
    "---",
    "",
    "## 1. JD Match Score",
    `- **Overall:** ${o.jdMatch.overall}/100 (${fit.label})`,
    `- Skills: ${o.jdMatch.skillsMatch}%`,
    `- Experience: ${o.jdMatch.experienceMatch}%`,
    `- Technology: ${o.jdMatch.technologyMatch}%`,
    `- Responsibilities: ${o.jdMatch.responsibilityMatch}%`,
    `- ATS keywords: ${o.jdMatch.atsKeywordMatch}%`,
    `- Education/Certifications: ${o.jdMatch.educationCertMatch}%`,
    "",
    "## 2. Career Opportunity Score",
    `**${o.careerOpportunityScore}/100** — ${o.careerOpportunityLabel}`,
    "",
    "## 3. Top Strengths",
    ...o.topStrengths.map((s) => `- ${s}`),
    "",
    "## 4. Missing / Weak Skills",
    ...o.missingWeakSkills.map((s) => `- ${s}`),
    "",
    "## 5. Current Market Trends",
    `- Fast-growing: ${o.marketTrends.fastGrowing.join(", ")}`,
    `- Emerging: ${o.marketTrends.emerging.join(", ")}`,
    `- Increasing demand: ${o.marketTrends.increasingDemand.join(", ")}`,
    `- Declining emphasis: ${o.marketTrends.declining.join(", ")}`,
    "",
    "## 6. Emerging Skills",
    ...o.marketTrends.emerging.map((s) => `- ${s}`),
    "",
    "## 7. Recommended Career Opportunities",
    ...o.opportunities.map(
      (op) =>
        `- **${op.role}** (${op.matchPercent}%) — ${op.why}${op.skillsToAdd?.length ? ` · Add: ${op.skillsToAdd.join(", ")}` : ""}`
    ),
    "",
    "## 8. Quick-Win Opportunities",
    ...o.opportunities
      .filter((op) => op.category === "quick_win")
      .map((op) => `- ${op.role} (${op.matchPercent}%)`),
    "",
    "## 9. Skill Improvement Plan",
    ...o.skillGapPlan.map(
      (g) =>
        `- ${g.emoji} **${g.skill}** (${g.priority}) — ${g.whyItMatters}\n  - Market: ${g.marketNote}\n  - Learn: ${g.learningApproach}`
    ),
    "",
    "## 10. Recommended CV Changes",
    ...o.recommendedCvChanges.map((c) => `- **${c.area}:** ${c.change}${c.truthful ? "" : " _(verify first)_"}`),
    "",
    "## 11. Suggested Summary Line",
    o.summarySuggestion || "(none)",
    "",
    "## 12. Why This CV Is More Competitive",
    ...o.whyMoreCompetitive.map((w) => `- ${w}`),
    "",
    "## 13. Next Best Actions",
    ...o.nextBestActions.map((a) => `- **${a.title}:** ${a.detail}`),
    "",
    "---",
    "",
    fit.disclaimer,
    "",
    "_ResumeProof — evidence only. Nothing invented._"
  ];

  return lines.join("\n");
}
