import type { CareerVault } from "../srs-models";
import { approvedEvidence } from "./career-vault";

/** Measurable-impact evidence in the vault — achievement-type items plus
 *  any approved item that already carries a number. Never invents a metric;
 *  just checks whether the candidate has any to draw on. JD-independent —
 *  kept in its own module (no market-intelligence/live-market-feed import
 *  chain) so it can be used from client components without pulling
 *  server-only "fs"/"path" dependencies into the browser bundle. */
export function computeAchievementMatch(vault: CareerVault): { score: number; note: string } {
  const approved = approvedEvidence(vault);
  const achievementCount = approved.filter((e) => e.type === "achievement").length;
  const metricBearing = approved.filter((e) => /\d+\s*%|\b\d+\+?\s*(users?|apps?|applications?|projects?|customers?|releases?|downloads?)\b/i.test(e.content)).length;
  const signal = achievementCount * 2 + metricBearing;
  if (signal === 0) return { score: 30, note: "No measurable achievements or metrics found in your approved vault items." };
  if (signal <= 2) return { score: 55, note: "A little measurable impact in your vault — a few more numbers would help." };
  if (signal <= 4) return { score: 75, note: "Solid measurable impact represented in your vault." };
  return { score: 90, note: "Strong measurable impact — several quantified results in your vault." };
}
