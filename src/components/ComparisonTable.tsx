"use client";

interface ComparisonRow {
  candidateId: string;
  candidateName: string;
  qualificationScore: number;
  isShortlisted: boolean;
  preferenceAlignment: string;
  strongAreas: string[];
  partialAreas: string[];
  missingRequirements: string[];
}

function requirementStatus(row: ComparisonRow, requirement: string): { icon: string; label: string } {
  if (row.strongAreas.includes(requirement)) return { icon: "✅", label: "Proven" };
  if (row.partialAreas.includes(requirement)) return { icon: "🟡", label: "Partial" };
  if (row.missingRequirements.includes(requirement)) return { icon: "⬜", label: "Missing" };
  return { icon: "–", label: "Not evaluated" };
}

export default function ComparisonTable({ a, b }: { a: ComparisonRow; b: ComparisonRow }) {
  const requirements = Array.from(new Set([...a.strongAreas, ...a.partialAreas, ...a.missingRequirements, ...b.strongAreas, ...b.partialAreas, ...b.missingRequirements]));

  return (
    <div className="comparison-table-wrap">
      <table className="comparison-table">
        <thead>
          <tr>
            <th>Requirement</th>
            <th>{a.candidateName}</th>
            <th>{b.candidateName}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Overall score</td>
            <td><strong>{Math.round(a.qualificationScore)}%</strong></td>
            <td><strong>{Math.round(b.qualificationScore)}%</strong></td>
          </tr>
          <tr>
            <td>Status</td>
            <td>
              <span className={`badge ${a.isShortlisted ? "ok" : "no"}`}>{a.isShortlisted ? "Shortlisted" : "Rejected"}</span>
            </td>
            <td>
              <span className={`badge ${b.isShortlisted ? "ok" : "no"}`}>{b.isShortlisted ? "Shortlisted" : "Rejected"}</span>
            </td>
          </tr>
          <tr>
            <td>Preference alignment</td>
            <td>{a.preferenceAlignment}</td>
            <td>{b.preferenceAlignment}</td>
          </tr>
          {requirements.map((req) => {
            const sa = requirementStatus(a, req);
            const sb = requirementStatus(b, req);
            return (
              <tr key={req}>
                <td>{req}</td>
                <td>
                  {sa.icon} {sa.label}
                </td>
                <td>
                  {sb.icon} {sb.label}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
