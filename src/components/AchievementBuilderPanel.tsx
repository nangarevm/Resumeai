"use client";

import type { AchievementAnswer } from "@/lib/engines/achievement-builder";
import { isQuantifiedAnswer } from "@/lib/engines/achievement-builder";

const DIRECTIONS: AchievementAnswer["direction"][] = ["Reduced", "Increased", "Saved", "Improved", "Grew", "Automated"];

export default function AchievementBuilderPanel({
  bullets,
  drafts,
  applied,
  onChange,
  onApply,
  onSkip
}: {
  bullets: string[];
  drafts: Record<string, Partial<AchievementAnswer>>;
  applied: Record<string, boolean>;
  onChange: (bullet: string, field: keyof AchievementAnswer, value: string) => void;
  onApply: (bullet: string) => void;
  onSkip: (bullet: string) => void;
}) {
  if (bullets.length === 0) return null;
  return (
    <div className="health-card" style={{ marginTop: 16 }}>
      <p className="muted" style={{ marginTop: 0 }}>
        Answer a few quick questions about your own work — we&apos;ll never invent a number for you, only format the
        one you give us.
      </p>
      {bullets.map((bullet) => {
        const draft = drafts[bullet] || {};
        const isApplied = applied[bullet];
        const ready = isQuantifiedAnswer({ metric: draft.metric || "", amount: draft.amount || "", direction: draft.direction, scope: draft.scope || "" });
        return (
          <article className="chain-item" key={bullet}>
            <p>{bullet}</p>
            {isApplied ? (
              <p className="muted" style={{ marginTop: 6 }}>✅ Added to your draft</p>
            ) : (
              <>
                <div className="form-grid" style={{ marginTop: 8 }}>
                  <div>
                    <label className="form-label">What improved?</label>
                    <input
                      className="form-control"
                      placeholder="e.g. load time, deployment speed"
                      value={draft.metric || ""}
                      onChange={(e) => onChange(bullet, "metric", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Direction</label>
                    <select
                      className="form-control"
                      value={draft.direction || ""}
                      onChange={(e) => onChange(bullet, "direction", e.target.value)}
                    >
                      <option value="">Choose one</option>
                      {DIRECTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">By how much?</label>
                    <input
                      className="form-control"
                      placeholder="e.g. 40%, 2 hours/week, $10K"
                      value={draft.amount || ""}
                      onChange={(e) => onChange(bullet, "amount", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Scope (optional)</label>
                    <input
                      className="form-control"
                      placeholder="e.g. for 5,000 users"
                      value={draft.scope || ""}
                      onChange={(e) => onChange(bullet, "scope", e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button className="chip" type="button" disabled={!ready} onClick={() => onApply(bullet)}>
                    Add to draft
                  </button>
                  <button className="chip" type="button" onClick={() => onSkip(bullet)}>
                    Skip
                  </button>
                </div>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
