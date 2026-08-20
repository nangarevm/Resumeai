"use client";

import { useRef } from "react";

export default function PhotoUploadPanel({
  photoDataUrl,
  busy,
  onUpload,
  onRemove
}: {
  photoDataUrl?: string | null;
  busy: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="health-card" style={{ marginTop: 16 }}>
      <p className="muted" style={{ marginTop: 0 }}>
        Add a headshot for templates and markets where a photo on a CV is expected. It's optional — most US/UK
        applications don't use one, and every template still works without it.
      </p>
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        {photoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- data: URI, not a static asset Next can optimize
          <img
            src={photoDataUrl}
            alt="Your uploaded photo"
            style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.06)",
              display: "grid",
              placeItems: "center",
              fontSize: 11,
              color: "var(--muted)"
            }}
          >
            No photo
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="chip" type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
            {photoDataUrl ? "Replace photo" : "Upload photo"}
          </button>
          {photoDataUrl && (
            <button className="chip" type="button" disabled={busy} onClick={onRemove}>
              Remove
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
      </div>
      <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
        JPEG, PNG, or WEBP, under 1.5MB.
      </p>
    </div>
  );
}
