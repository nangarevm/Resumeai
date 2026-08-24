"use client";

import { useState } from "react";
import { segmentLines, moveLineInText, moveSegmentInText, type ResumeSegment } from "@/lib/resume-line-editor";

const BULLET_RE = /^([-•*]\s+)/;

/** Structured add/edit/delete/reorder editor for the evidence-bound resume
 *  draft. Operates on the same plain-text format ResumeDraftPreview renders
 *  (NAME:/SUMMARY/SKILLS headers, "- " bullets) so it's a drop-in
 *  replacement for the raw textarea — every row is its own input with an
 *  inline delete and up/down move, each section can be reordered as a
 *  whole, and each section gets an "+ Add line" button. A collapsible
 *  raw-text view stays available for bulk edits/paste. */
export default function ResumeSectionEditor({ text, onChange }: { text: string; onChange: (next: string) => void }) {
  const [rawOpen, setRawOpen] = useState(false);
  const lines = text.split("\n");
  const segments = segmentLines(lines);

  function setLine(index: number, value: string) {
    const next = [...lines];
    const bulletMatch = next[index]?.match(BULLET_RE);
    next[index] = bulletMatch ? `${bulletMatch[1]}${value}` : value;
    onChange(next.join("\n"));
  }

  function deleteLine(index: number) {
    const next = lines.filter((_, i) => i !== index);
    onChange(next.join("\n"));
  }

  function moveLine(segmentIndex: number, pos: number, direction: -1 | 1) {
    onChange(moveLineInText(text, segmentIndex, pos, direction));
  }

  function moveSegment(si: number, direction: -1 | 1) {
    onChange(moveSegmentInText(text, si, direction));
  }

  function addLineAfterSegment(seg: ResumeSegment) {
    const lastIdx = seg.rowIndices.length ? seg.rowIndices[seg.rowIndices.length - 1] : seg.headerIndex ?? lines.length - 1;
    const insertAt = lastIdx + 1;
    const isBulletSection = seg.rowIndices.some((i) => BULLET_RE.test(lines[i]));
    const newLine = isBulletSection || seg.headerIndex !== null ? "- " : "";
    const next = [...lines.slice(0, insertAt), newLine, ...lines.slice(insertAt)];
    onChange(next.join("\n"));
  }

  return (
    <div className="resume-editor-wrap">
      {segments.map((seg, si) => (
        <div className="resume-seg" key={si}>
          <div className="resume-seg-toolbar">
            <span className="muted resume-seg-label">Section</span>
            <button
              type="button"
              className="row-move"
              disabled={si === 0}
              title="Move this section up"
              aria-label="Move this section up"
              onClick={() => moveSegment(si, -1)}
            >
              ▲
            </button>
            <button
              type="button"
              className="row-move"
              disabled={si === segments.length - 1}
              title="Move this section down"
              aria-label="Move this section down"
              onClick={() => moveSegment(si, 1)}
            >
              ▼
            </button>
          </div>
          {seg.headerIndex !== null && (
            <div className="resume-row resume-row-header">
              <input
                className="form-control resume-row-input"
                value={lines[seg.headerIndex]}
                onChange={(e) => setLine(seg.headerIndex as number, e.target.value)}
              />
              <button
                type="button"
                className="row-del"
                title="Remove this line"
                aria-label="Remove this line"
                onClick={() => deleteLine(seg.headerIndex as number)}
              >
                ×
              </button>
            </div>
          )}
          {seg.rowIndices.map((idx, pos) => {
            const bulletMatch = lines[idx].match(BULLET_RE);
            const value = bulletMatch ? lines[idx].slice(bulletMatch[1].length) : lines[idx];
            return (
              <div className={`resume-row ${bulletMatch ? "resume-row-bullet" : ""}`} key={idx}>
                <input className="form-control resume-row-input" value={value} onChange={(e) => setLine(idx, e.target.value)} />
                <button
                  type="button"
                  className="row-move"
                  disabled={pos === 0}
                  title="Move this line up"
                  aria-label="Move this line up"
                  onClick={() => moveLine(si, pos, -1)}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="row-move"
                  disabled={pos === seg.rowIndices.length - 1}
                  title="Move this line down"
                  aria-label="Move this line down"
                  onClick={() => moveLine(si, pos, 1)}
                >
                  ▼
                </button>
                <button
                  type="button"
                  className="row-del"
                  title="Remove this line"
                  aria-label="Remove this line"
                  onClick={() => deleteLine(idx)}
                >
                  ×
                </button>
              </div>
            );
          })}
          <button type="button" className="chip row-add" onClick={() => addLineAfterSegment(seg)}>
            + Add line
          </button>
        </div>
      ))}
      <details className="opt-section" open={rawOpen} onToggle={(e) => setRawOpen((e.target as HTMLDetailsElement).open)}>
        <summary>Raw text (advanced — paste or bulk-edit)</summary>
        <textarea className="form-control resume-draft-editor" rows={12} value={text} onChange={(e) => onChange(e.target.value)} style={{ marginTop: 10 }} />
      </details>
    </div>
  );
}
