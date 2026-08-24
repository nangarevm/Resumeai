"use client";

import type { NextBestAction as NextBestActionData } from "@/lib/next-best-action";

export default function NextBestAction({ action, onGo }: { action: NextBestActionData | null; onGo: (step: NextBestActionData["step"]) => void }) {
  if (!action) return null;
  return (
    <div className="nba-banner">
      <div className="nba-icon" aria-hidden="true">
        {action.icon}
      </div>
      <div className="nba-text">
        <div className="nba-label">Next best action</div>
        <div className="nba-title">{action.title}</div>
        <div className="nba-detail">{action.detail}</div>
      </div>
      <button type="button" className="btn-primary nba-cta" onClick={() => onGo(action.step)}>
        {action.ctaLabel} →
      </button>
    </div>
  );
}
