"use client";

import type { BulletFormulaResult } from "@/lib/engines/bullet-formula-check";

const PART_ICON = (present: boolean) => (present ? "✅" : "⚠️");

export default function BulletFormulaPanel({ results }: { results: BulletFormulaResult[] }) {
  if (results.length === 0) return null;
  return (
    <div className="health-card" style={{ marginTop: 16 }}>
      <p className="muted" style={{ marginTop: 0 }}>
        Strong bullets name the Action, the Technology, the Scope, and the Result. These bullets are missing one or
        more — nothing is rewritten for you, just flagged.
      </p>
      {results.map((r, i) => (
        <article className="chain-item yellow" key={i}>
          <p>{r.bullet}</p>
          <div className="checklist-inline" style={{ marginTop: 6 }}>
            <span className={r.hasAction ? "ok" : "miss"}>{PART_ICON(r.hasAction)} Action</span>
            <span className={r.hasTechnology ? "ok" : "miss"}>{PART_ICON(r.hasTechnology)} Technology</span>
            <span className={r.hasScope ? "ok" : "miss"}>{PART_ICON(r.hasScope)} Scope</span>
            <span className={r.hasResult ? "ok" : "miss"}>{PART_ICON(r.hasResult)} Result</span>
          </div>
          <p className="muted" style={{ marginTop: 6 }}>
            {r.tip}
          </p>
        </article>
      ))}
    </div>
  );
}
