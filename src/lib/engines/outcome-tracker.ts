import type { ApplicationRecord, OutcomeStats } from "../srs-models";

function bandFromScore(score?: number): string {
  if (score == null) return "unknown";
  if (score >= 80) return "80+ Strong";
  if (score >= 60) return "60–79 Promising";
  if (score >= 40) return "40–59 Partial";
  return "0–39 Early";
}

export function computeOutcomeStats(apps: ApplicationRecord[]): OutcomeStats {
  const byBand: OutcomeStats["byBand"] = {};
  for (const a of apps) {
    const band = a.fitBand || bandFromScore(a.fitScore);
    if (!byBand[band]) byBand[band] = { saved: 0, applied: 0, interview: 0, offer: 0, rejected: 0 };
    const row = byBand[band];
    if (a.status === "Saved") row.saved++;
    else if (a.status === "Applied" || a.status === "Screening") row.applied++;
    else if (a.status === "Interview") row.interview++;
    else if (a.status === "Offer") row.offer++;
    else if (a.status === "Rejected" || a.status === "Withdrawn") row.rejected++;
  }

  const applied = apps.filter((a) => a.status !== "Saved").length;
  const interviews = apps.filter((a) => a.status === "Interview" || a.status === "Offer").length;
  const offers = apps.filter((a) => a.status === "Offer").length;

  return {
    byBand,
    totals: {
      applications: apps.length,
      interviewRate: applied ? Math.round((interviews / applied) * 100) : 0,
      offerRate: applied ? Math.round((offers / applied) * 100) : 0
    }
  };
}

export { bandFromScore };
