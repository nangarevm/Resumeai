"use client";

import type { TopFix } from "@/lib/engines/top-fixes";

export default function TopFixesPanel({ fixes }: { fixes: TopFix[] }) {
  if (fixes.length === 0) {
    return (
      <div className="health-card" style={{ marginTop: 16, borderColor: "var(--accent-green, #3fb950)" }}>
        <div className="health-card-head">
          <span>✅ Nothing urgent to fix</span>
        </div>
        <p className="muted" style={{ marginTop: 4 }}>
          No structural or ATS problems detected right now. Keep building — more suggestions will show up here as you add a
          target job or edit your resume.
        </p>
      </div>
    );
  }

  return (
    <div className="health-card" style={{ marginTop: 16 }}>
      <div className="health-card-head">
        <span>Fix these {fixes.length} first</span>
      </div>
      <p className="muted" style={{ marginTop: 2, marginBottom: 10 }}>
        Ranked by impact — resolving these moves your Resume Health score the most.
      </p>
      <ol className="top-fixes-list" style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {fixes.map((fix, i) => (
          <li
            key={fix.id}
            style={{
              display: "flex",
              gap: 10,
              padding: "10px 0",
              borderTop: i > 0 ? "1px solid var(--border-color)" : "none"
            }}
          >
            <span
              aria-hidden="true"
              style={{
                flexShrink: 0,
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "var(--accent-blue, #58a6ff)",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontSize: 12,
                fontWeight: 700
              }}
            >
              {i + 1}
            </span>
            <div>
              <strong>{fix.title}</strong>
              <p className="muted" style={{ margin: "2px 0 0", fontSize: 13 }}>
                {fix.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
