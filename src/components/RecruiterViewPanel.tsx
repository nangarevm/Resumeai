"use client";

import type { RecruiterViewReport } from "@/lib/engines/recruiter-view";

export default function RecruiterViewPanel({ view }: { view: RecruiterViewReport }) {
  return (
    <div className="health-card" style={{ marginTop: 12 }}>
      <p className="muted" style={{ marginTop: 0 }}>
        If a recruiter spends only 10 seconds on this resume, what will they understand?
      </p>
      <h4>Immediately Clear</h4>
      {view.immediatelyClear.length > 0 ? (
        <ul style={{ margin: "6px 0 0 18px" }}>
          {view.immediatelyClear.map((c, i) => (
            <li key={i}>✅ {c}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">Nothing stood out as immediately clear yet.</p>
      )}
      <h4 style={{ marginTop: 12 }}>Missing / Unclear</h4>
      {view.missingOrUnclear.length > 0 ? (
        <ul style={{ margin: "6px 0 0 18px" }}>
          {view.missingOrUnclear.map((c, i) => (
            <li key={i}>⚠️ {c}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">Nothing flagged — the top of this resume reads clearly.</p>
      )}
    </div>
  );
}
