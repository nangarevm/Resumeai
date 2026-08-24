"use client";

import { useState } from "react";
import type { ResumeVersion } from "@/lib/srs-models";
import { computeLineDiff, summarizeDiff } from "@/lib/engines/resume-diff";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

type ViewMode = { id: string; mode: "preview" | "diff" } | null;

export default function VersionHistoryPanel({
  versions,
  currentText,
  busy,
  onRestore
}: {
  versions: ResumeVersion[];
  currentText: string;
  busy: boolean;
  onRestore: (id: string) => void;
}) {
  const [view, setView] = useState<ViewMode>(null);
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
        const isPreview = view?.id === v.id && view.mode === "preview";
        const isDiff = view?.id === v.id && view.mode === "diff";
        const diffLines = isDiff ? computeLineDiff(v.snapshot, currentText) : null;
        const diffSummary = diffLines ? summarizeDiff(diffLines) : null;
        return (
          <article className={`chain-item ${i === 0 ? "green" : ""}`} key={v.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <span>
                <strong>{v.reason}</strong> {i === 0 && <span className="badge ok">current</span>}
              </span>
              <span className="muted">{formatWhen(v.createdAt)}</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <button className="chip" type="button" onClick={() => setView(isPreview ? null : { id: v.id, mode: "preview" })}>
                {isPreview ? "Hide preview" : "Preview"}
              </button>
              {i !== 0 && (
                <button className="chip" type="button" onClick={() => setView(isDiff ? null : { id: v.id, mode: "diff" })}>
                  {isDiff ? "Hide changes" : "Compare to current"}
                </button>
              )}
              {i !== 0 && (
                <button className="chip" type="button" disabled={busy} onClick={() => onRestore(v.id)}>
                  Restore this version
                </button>
              )}
            </div>
            {isPreview && <pre className="pre" style={{ marginTop: 8, maxHeight: 260, overflowY: "auto" }}>{v.snapshot}</pre>}
            {isDiff && diffLines && diffSummary && (
              <div style={{ marginTop: 8 }}>
                <p className="muted" style={{ fontSize: 12.5, margin: "0 0 6px" }}>
                  {diffSummary.added === 0 && diffSummary.removed === 0
                    ? "No differences — identical to the current resume."
                    : `+${diffSummary.added} line${diffSummary.added === 1 ? "" : "s"} added, −${diffSummary.removed} line${diffSummary.removed === 1 ? "" : "s"} removed`}
                </p>
                <pre
                  className="pre resume-diff"
                  style={{ marginTop: 0, maxHeight: 320, overflowY: "auto", whiteSpace: "pre-wrap" }}
                >
                  {diffLines.map((line, li) => (
                    <div
                      key={li}
                      className={`diff-line diff-${line.type}`}
                      style={{
                        background: line.type === "added" ? "rgba(63,185,80,0.12)" : line.type === "removed" ? "rgba(248,81,73,0.12)" : "transparent",
                        color: line.type === "added" ? "#3fb950" : line.type === "removed" ? "#f85149" : "inherit",
                        textDecoration: line.type === "removed" ? "line-through" : "none"
                      }}
                    >
                      {line.type === "added" ? "+ " : line.type === "removed" ? "− " : "  "}
                      {line.text || " "}
                    </div>
                  ))}
                </pre>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
