"use client";

import type { ResumeHealthReport } from "@/lib/engines/resume-health";

export default function ResumeHealthDashboard({ health }: { health: ResumeHealthReport }) {
  return (
    <div className="health-card" style={{ marginTop: 16 }}>
      <div className="health-card-head">
        <span>Resume Health</span>
        <strong>{health.overall}/100</strong>
      </div>
      <div className="progress">
        <span style={{ width: `${health.overall}%` }} />
      </div>
      <p className="muted health-card-caption">
        Based on {health.categoriesScored} of {health.categoriesTotal} categories
        {health.categoriesScored < health.categoriesTotal ? " — add a target job to see the rest." : "."}
      </p>
      <div className="grid-2" style={{ marginTop: 10 }}>
        {health.categories.map((c) => (
          <div key={c.key}>
            <span className="muted">{c.label}</span>
            <div className="progress">
              <span style={{ width: `${c.score ?? 0}%` }} />
            </div>
            <strong>{c.score !== null ? `${c.score}%` : "—"}</strong>
            <p className="muted" style={{ fontSize: 11, marginTop: 2 }}>
              {c.note}
            </p>
          </div>
        ))}
      </div>
      {health.topImprovements.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <h4>Top Improvements</h4>
          <ol style={{ margin: "6px 0 0 18px" }}>
            {health.topImprovements.map((imp, i) => (
              <li key={i}>{imp}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
