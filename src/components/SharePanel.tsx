"use client";

import CopyButton from "@/components/CopyButton";

function formatExpiry(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function SharePanel({
  active,
  url,
  expiresAt,
  busy,
  onCreate,
  onRevoke
}: {
  active: boolean;
  url?: string;
  expiresAt?: string;
  busy: boolean;
  onCreate: () => void;
  onRevoke: () => void;
}) {
  return (
    <div className="health-card" style={{ marginTop: 16 }}>
      <p className="muted" style={{ marginTop: 0 }}>
        Get a read-only link a mentor or friend can open without an account, so they can review your resume. Your
        email and phone are automatically hidden on the shared view.
      </p>
      {active && url ? (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input className="form-control" style={{ maxWidth: 420 }} value={url} readOnly onFocus={(e) => e.target.select()} />
            <CopyButton text={url} label="Copy link" />
          </div>
          {expiresAt && <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>Expires {formatExpiry(expiresAt)}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="chip" type="button" disabled={busy} onClick={onCreate}>
              Regenerate link (invalidates the old one)
            </button>
            <button className="chip" type="button" disabled={busy} onClick={onRevoke}>
              Stop sharing
            </button>
          </div>
        </>
      ) : (
        <button className="chip" type="button" disabled={busy} onClick={onCreate}>
          Get a shareable link
        </button>
      )}
    </div>
  );
}
