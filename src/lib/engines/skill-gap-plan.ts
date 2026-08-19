import type { CandidateProfile, JobDescription } from "../models";
import type { SkillGapItem } from "../srs-models";
import { scorableRequirements } from "../models";
import { findEvidenceForRequirement } from "./evidence-engine";
import { getMarketSignals } from "./market-intelligence";

type SkillGapLevel = SkillGapItem["level"];

export function buildSkillGapPlan(profile: CandidateProfile, jd: JobDescription): SkillGapItem[] {
  const scorable = scorableRequirements(jd);
  const evidence = scorable.map((req) => findEvidenceForRequirement(profile, req));
  const market = getMarketSignals(jd.title, jd.domain);
  const items: SkillGapItem[] = [];
  const blob = profile.rawResumeText.toLowerCase();

  for (const ev of evidence) {
    const skill = ev.requirementName;
    let level: SkillGapLevel;
    let emoji: string;
    let priority: SkillGapItem["priority"];

    if (ev.strength === "STRONG") {
      level = "strong";
      emoji = "🟢";
      priority = "Low";
    } else if (ev.strength === "PARTIAL" || ev.strength === "UNCLEAR") {
      level = "improve";
      emoji = "🟡";
      priority = "Medium";
    } else {
      level = "missing";
      emoji = "🔴";
      priority = "High";
    }

    const inDemand = market.increasingDemand.some((d) => d.toLowerCase().includes(skill.toLowerCase().split(" ")[0]));
    const marketNote = inDemand
      ? `Frequently requested for ${market.label} roles in current hiring data.`
      : `Parsed from this JD — verify demand in your target market.`;

    items.push({
      skill,
      level,
      emoji,
      whyItMatters:
        level === "strong"
          ? "You already prove this in your resume — lead with it in summary and top bullets."
          : level === "improve"
            ? "Partial or unclear evidence — strengthen with a concrete bullet or vault item."
            : "Not evidenced — do not add as job experience without a real project or course.",
      marketNote,
      priority: level === "missing" && inDemand ? "High" : priority,
      learningApproach: buildLearningApproach(skill, level),
      evidenceStrength: ev.strength
    });
  }

  for (const emerg of market.emerging.slice(0, 2)) {
    if (items.some((i) => i.skill.toLowerCase().includes(emerg.split(" ")[0].toLowerCase()))) continue;
    if (blob.includes(emerg.split(" ")[0].toLowerCase())) continue;
    items.push({
      skill: emerg,
      level: "emerging",
      emoji: "⭐",
      whyItMatters: "Emerging in your profession — optional upskill, not required for this JD.",
      marketNote: `Listed as emerging for ${market.label} — only pursue if aligned with your goals.`,
      priority: "Low",
      learningApproach: `Research one 2-week tutorial or internal pilot — add to vault only after you ship something real.`
    });
  }

  return items.slice(0, 20);
}

function buildLearningApproach(skill: string, level: SkillGapLevel): string {
  if (level === "strong") return "Keep in top 3 bullets — no new learning needed.";
  if (level === "improve") return `Add one metric-backed bullet or vault evidence item for ${skill}.`;
  if (level === "emerging") return `Optional: 1-week public artifact demonstrating ${skill}, then vault it.`;
  return `Potential improvement — verify with candidate. Ship a small project using ${skill}, paste README into Career Vault — never list as employer experience first.`;
}
