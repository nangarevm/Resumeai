"use client";

const FAMILY_LABELS: Record<string, string> = {
  skill: "Skills",
  work: "Work experience",
  project: "Projects",
  education: "Education",
  achievement: "Achievements",
  certification: "Certifications"
};

export default function HealthCard({
  percent,
  approvedCount,
  total,
  present,
  missing
}: {
  percent: number;
  approvedCount: number;
  total: number;
  present: string[];
  missing: string[];
}) {
  return (
    <div className="health-card">
      <div className="health-card-head">
        <span>Career Vault health</span>
        <strong>{percent}%</strong>
      </div>
      <div className="progress">
        <span style={{ width: `${percent}%` }} />
      </div>
      <p className="muted health-card-caption">
        {approvedCount} of {total} evidence items approved and ready to use.
      </p>
      <ul className="health-card-list">
        {present.map((t) => (
          <li key={t} className="health-card-item ok">
            <span aria-hidden="true">✅</span> {FAMILY_LABELS[t] || t}
          </li>
        ))}
        {missing.map((t) => (
          <li key={t} className="health-card-item missing">
            <span aria-hidden="true">⬜</span> {FAMILY_LABELS[t] || t} — not added yet
          </li>
        ))}
      </ul>
      <p className="muted" style={{ fontSize: 12 }}>
        Archive outdated items. Every export uses approved evidence only — nothing is invented to fill a gap.
      </p>
    </div>
  );
}
