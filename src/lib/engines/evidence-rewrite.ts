import type { CandidateProfile, JobDescription } from "../models";
import type { CareerVault } from "../srs-models";
import { approvedEvidence } from "./career-vault";
import { extractEvidence } from "./evidence-engine";

export interface RewriteSuggestion {
  id: string;
  original: string;
  rewritten: string;
  evidenceIds: string[];
  reason: string;
}

/**
 * Evidence-gated bullet strengthener — no LLM, no new facts.
 * Reorders phrasing to lead with JD-aligned terms already present in the bullet or vault.
 */
export function strengthenBullets(
  profile: CandidateProfile,
  jd: JobDescription,
  vault: CareerVault
): RewriteSuggestion[] {
  const approved = approvedEvidence(vault);
  const evidence = extractEvidence(profile, jd);
  const strongReqs = evidence
    .filter((e) => e.strength === "STRONG" || e.strength === "PARTIAL")
    .map((e) => e.requirementName.toLowerCase());

  const out: RewriteSuggestion[] = [];
  let n = 1;
  const work = profile.parsedSections.WORK_EXPERIENCE || profile.rawResumeText;

  for (const line of work.split("\n")) {
    const bullet = line.replace(/^[-•*]\s*/, "").trim();
    if (bullet.length < 24) continue;

    const lower = bullet.toLowerCase();
    const hitReq = strongReqs.find((r) => lower.includes(r.slice(0, Math.min(r.length, 12))) || r.split(/\s+/)[0]?.length > 3 && lower.includes(r.split(/\s+/)[0]));
    const vaultHit = approved.find((e) => bullet.includes(e.content.slice(0, 24)) || e.content.toLowerCase().includes(lower.slice(0, 28)));

    if (!hitReq && !vaultHit) continue;

    const lead = hitReq || vaultHit?.tags[0] || "";
    if (!lead || bullet.toLowerCase().startsWith(String(lead).toLowerCase().slice(0, 8))) continue;

    const rewritten = leadSkillFirst(bullet, String(lead));
    if (rewritten === bullet) continue;

    out.push({
      id: `rw-${n++}`,
      original: bullet,
      rewritten,
      evidenceIds: vaultHit ? [vaultHit.id] : [],
      reason: "Reorder only — same facts, stronger alignment with job proof. No new tools or metrics added."
    });
    if (out.length >= 8) break;
  }

  return out;
}

function leadSkillFirst(bullet: string, skill: string): string {
  const cleanSkill = skill.replace(/[^a-z0-9/+ ]/gi, "").trim();
  if (!cleanSkill || bullet.toLowerCase().includes(cleanSkill.toLowerCase())) {
    const words = bullet.split(/\s+/);
    if (words.length < 6) return bullet;
    return `${words.slice(0, 3).join(" ")} — ${words.slice(3).join(" ")}`;
  }
  return `${cleanSkill.charAt(0).toUpperCase()}${cleanSkill.slice(1)}: ${bullet.replace(/^[-•*]\s*/, "")}`;
}
