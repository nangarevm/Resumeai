"use client";

import type { ProjectRelevance } from "@/lib/engines/project-intelligence";

const TIER_LABEL: Record<ProjectRelevance["tier"], string> = {
  highly_relevant: "🟢 Highly relevant",
  somewhat_relevant: "🟡 Somewhat relevant",
  less_relevant: "⚪ Less relevant to this job"
};

export default function ProjectIntelligencePanel({ ranked }: { ranked: ProjectRelevance[] }) {
  if (ranked.length === 0) return null;
  return (
    <div className="health-card" style={{ marginTop: 16 }}>
      <p className="muted" style={{ marginTop: 0 }}>
        Your projects, ranked by overlap with this job&apos;s own requirements. Lead with the top ones; the rest
        don&apos;t need to be dropped, just don&apos;t have to lead.
      </p>
      {ranked.map((r) => (
        <article className="chain-item" key={r.project}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <span className="badge mid">{TIER_LABEL[r.tier]}</span>
            <span className="muted">{r.score}% match</span>
          </div>
          <p style={{ marginTop: 6 }}>{r.project}</p>
          {r.matchedTerms.length > 0 && (
            <p className="muted" style={{ marginTop: 4 }}>
              Matched: {r.matchedTerms.join(", ")}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}
