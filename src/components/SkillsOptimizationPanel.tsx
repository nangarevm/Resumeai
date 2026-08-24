"use client";

import type { SkillCategoryGroup } from "@/lib/engines/skills-optimizer";

export default function SkillsOptimizationPanel({
  groups,
  busy,
  onApply
}: {
  groups: SkillCategoryGroup[];
  busy: boolean;
  onApply: () => void;
}) {
  if (groups.length === 0) return null;
  return (
    <div className="health-card" style={{ marginTop: 16 }}>
      <p className="muted" style={{ marginTop: 0 }}>
        Your skills, grouped the way a recruiter scans them. Nothing is added or removed — only reorganized.
      </p>
      {groups.map((g) => (
        <div key={g.key} style={{ marginTop: 10 }}>
          <span className="muted">{g.label}</span>
          <div className="chips" style={{ marginTop: 4 }}>
            {g.skills.map((s) => (
              <span className="tag" key={s}>
                {s}
              </span>
            ))}
          </div>
        </div>
      ))}
      <button className="chip" type="button" disabled={busy} onClick={onApply} style={{ marginTop: 12 }}>
        Apply categorized SKILLS section
      </button>
    </div>
  );
}
