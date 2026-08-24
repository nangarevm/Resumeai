"use client";

import { useState } from "react";
import type { ResumeVersion } from "@/lib/srs-models";

export default function NamedResumesPanel({
  versions,
  busy,
  onSave,
  onSwitch,
  onRename,
  onDelete
}: {
  versions: ResumeVersion[];
  busy: boolean;
  onSave: (name: string) => void;
  onSwitch: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const pinned = versions.filter((v) => v.pinned);

  function startRename(v: ResumeVersion) {
    setRenamingId(v.id);
    setRenameValue(v.reason);
  }

  function saveRename(id: string) {
    if (renameValue.trim()) onRename(id, renameValue.trim());
    setRenamingId(null);
  }

  return (
    <div className="health-card" style={{ marginTop: 16 }}>
      <p className="muted" style={{ marginTop: 0 }}>
        Keep a few named copies of your resume — one for frontend roles, one for backend, one for a career change —
        and switch between them without losing any of them.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: pinned.length ? 16 : 0 }}>
        <input
          className="form-control"
          style={{ maxWidth: 260 }}
          placeholder="e.g. Frontend resume"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          className="chip"
          type="button"
          disabled={busy || !newName.trim()}
          onClick={() => {
            onSave(newName.trim());
            setNewName("");
          }}
        >
          Save current resume as this
        </button>
      </div>

      {pinned.map((v) => (
        <article className="chain-item" key={v.id}>
          {renamingId === v.id ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input className="form-control" style={{ maxWidth: 260 }} value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
              <button className="chip" type="button" onClick={() => saveRename(v.id)}>
                Save name
              </button>
              <button className="chip" type="button" onClick={() => setRenamingId(null)}>
                Cancel
              </button>
            </div>
          ) : (
            <>
              <strong>{v.reason}</strong>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <button className="chip" type="button" disabled={busy} onClick={() => onSwitch(v.id)}>
                  Switch to this resume
                </button>
                <button className="chip" type="button" onClick={() => startRename(v)}>
                  Rename
                </button>
                <button className="chip" type="button" disabled={busy} onClick={() => onDelete(v.id)}>
                  Delete
                </button>
              </div>
            </>
          )}
        </article>
      ))}
    </div>
  );
}
