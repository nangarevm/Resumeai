import type { AgencyWorkspace } from "../srs-models";

export interface TierLimits {
  maxSeats: number;
  maxCandidatesPerMonth: number;
}

/** First real enforcement of AgencyWorkspace.tier — previously stored on
 *  every account but never checked anywhere. These numbers are deliberately
 *  illustrative starting points (there's no billing data yet to size them
 *  against), generous enough not to interrupt normal single-account usage
 *  in this file-based, pre-billing version of the product. */
export const TIER_LIMITS: Record<AgencyWorkspace["tier"], TierLimits> = {
  Coach: { maxSeats: 5, maxCandidatesPerMonth: 20 },
  "Small Agency": { maxSeats: 25, maxCandidatesPerMonth: 100 },
  Professional: { maxSeats: 200, maxCandidatesPerMonth: 1000 }
};

export function tierLimitsFor(tier: AgencyWorkspace["tier"]): TierLimits {
  return TIER_LIMITS[tier];
}
