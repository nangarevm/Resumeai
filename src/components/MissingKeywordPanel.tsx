"use client";

import type { SkillGapItem } from "@/lib/srs-models";

export type KeywordResolution = "added" | "mentioned" | "declined";

const PRIORITY_ORDER: Array<SkillGapItem["priority"]> = ["High", "Medium", "Low"];
const PRIORITY_LABEL: Record<SkillGapItem["priority"], string> = {
  High: "High priority",
  Medium: "Medium priority",
  Low: "Low priority"
};

export default function MissingKeywordPanel({
  gaps,
  resolutions,
  busy,
  onConfirm
}: {
  gaps: SkillGapItem[];
  resolutions: Record<string, KeywordResolution>;
  busy: boolean;
  onConfirm: (skill: string, mode: "add" | "mention" | "decline") => void;
}) {
  const bySkill = new Map<string, SkillGapItem>();
  for (const g of gaps) if (!bySkill.has(g.skill)) bySkill.set(g.skill, g);
  const items = Array.from(bySkill.values());

  if (items.length === 0) {
    return <p className="muted">No missing or weak keywords found for this job — your vault already covers what was parsed.</p>;
  }

  return (
    <div>
      <p className="muted">
        For each one: only say yes if it&apos;s genuinely true. Confirming adds it to your Career Vault as real evidence — nothing
        is added automatically.
      </p>
      {PRIORITY_ORDER.map((priority) => {
        const group = items.filter((g) => g.priority === priority);
        if (group.length === 0) return null;
        return (
          <div key={priority} style={{ marginTop: 12 }}>
            <h4>{PRIORITY_LABEL[priority]}</h4>
            {group.map((g) => {
              const resolution = resolutions[g.skill];
              return (
                <article
                  className={`chain-item ${resolution === "added" ? "green" : resolution === "declined" ? "" : "yellow"}`}
                  key={g.skill}
                  style={{ marginBottom: 8 }}
                >
                  <strong>{g.skill}</strong>
                  <p className="muted">{g.whyItMatters}</p>
                  {resolution ? (
                    <p className="muted">
                      {resolution === "added" && "✅ Added to your Career Vault"}
                      {resolution === "mentioned" && "⚠️ Added with a careful, qualified mention"}
                      {resolution === "declined" && "❌ Not added"}
                    </p>
                  ) : (
                    <>
                      <p style={{ marginTop: 6, fontWeight: 600 }}>Do you have experience with this?</p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                        <button className="chip" type="button" disabled={busy} onClick={() => onConfirm(g.skill, "add")}>
                          Yes — Add to Resume
                        </button>
                        <button className="chip" type="button" disabled={busy} onClick={() => onConfirm(g.skill, "mention")}>
                          Some Experience — Mention Carefully
                        </button>
                        <button className="chip" type="button" disabled={busy} onClick={() => onConfirm(g.skill, "decline")}>
                          No — Don&apos;t Add
                        </button>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
