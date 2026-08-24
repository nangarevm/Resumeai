"use client";

import CopyButton from "@/components/CopyButton";

export default function CandidateBriefPanel({ brief }: { brief: string }) {
  return (
    <div className="health-card" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
        <p className="muted" style={{ marginTop: 0 }}>
          The same read-only summary an agency or recruiter would generate about you.
        </p>
        <CopyButton text={brief} label="Copy brief" />
      </div>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          fontFamily: "inherit",
          fontSize: 13.5,
          lineHeight: 1.5,
          background: "var(--panel, rgba(127,127,127,0.08))",
          borderRadius: 8,
          padding: 12,
          margin: 0
        }}
      >
        {brief}
      </pre>
    </div>
  );
}
