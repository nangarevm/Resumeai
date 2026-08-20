"use client";

import { useState } from "react";
import type { ResumeVersion } from "@/lib/srs-models";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function VersionHistoryPanel({
  versions,
  busy,
  onRestore
}: {
  versions: ResumeVersion[];
  busy: boolean;
  onRestore: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  // Named/pinned resumes have their own panel (NamedResumesPanel) — this
  // one is strictly the automatic save-history trail.
  const autoVersions = versions.filter((v) => !v.pinned);

  if (autoVersions.length === 0) return null;

  return (
    <div className="health-card" style={{ marginTop: 16 }}>
      <p className="muted" style={{ marginTop: 0 }}>
        Every save is kept here — up to the last {autoVersions.length < 20 ? autoVersions.length : 20}. Restoring
        saves your current resume as a new version first, so nothing is ever lost.
      </p>
      {autoVersions.map((v, i) => {
        const isOpen = expanded === v.id;
        return (
          <article className={`chain-item ${i === 0 ? "green" : ""}`} key={v.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <span>
                <strong>{v.reason}</strong> {i === 0 && <span className="badge ok">current</span>}
              </span>
              <span className="muted">{formatWhen(v.createdAt)}</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="chip" type="button" onClick={() => setExpanded(isOpen ? null : v.id)}>
                {isOpen ? "Hide preview" : "Preview"}
              </button>
              {i !== 0 && (
                <button className="chip" type="button" disabled={busy} onClick={() => onRestore(v.id)}>
                  Restore this version
                </button>
              )}
            </div>
            {isOpen && <pre className="pre" style={{ marginTop: 8, maxHeight: 260, overflowY: "auto" }}>{v.snapshot}</pre>}
          </article>
        );
      })}
    </div>
  );
}
