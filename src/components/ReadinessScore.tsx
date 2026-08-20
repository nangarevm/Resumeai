"use client";

export interface ReadinessStep {
  label: string;
  done: boolean;
}

export default function ReadinessScore({ steps }: { steps: ReadinessStep[] }) {
  const doneCount = steps.filter((s) => s.done).length;
  const percent = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;
  return (
    <div className="readiness">
      <div className="readiness-head">
        <span className="readiness-label">Application readiness</span>
        <span className="readiness-percent">{percent}%</span>
      </div>
      <div className="progress readiness-bar">
        <span style={{ width: `${percent}%` }} />
      </div>
      <p className="muted readiness-caption">
        {doneCount} of {steps.length} preparation steps complete
      </p>
    </div>
  );
}
