import fs from "fs";
import path from "path";

export interface RoleMarketSignals {
  label: string;
  titleHints: string[];
  fastGrowing: string[];
  emerging: string[];
  increasingDemand: string[];
  declining: string[];
  aiOpportunities: string[];
  adjacentRoles: Array<{ role: string; overlapSkills: string[] }>;
  unlockSkills: string[];
  liveSource?: string;
  liveFetchedAt?: string;
}

type MarketFile = Record<string, RoleMarketSignals>;

let cache: MarketFile | null = null;

function loadMarket(): MarketFile {
  if (cache) return cache;
  const file = path.join(process.cwd(), "data", "market", "role-signals.json");
  cache = JSON.parse(fs.readFileSync(file, "utf8")) as MarketFile;
  return cache;
}

/** Plain substring matching lets a short hint like "ai" false-positive inside
 *  "container" or "maintain". Require word boundaries for hints of 3 chars
 *  or less; longer, more specific phrases are safe to substring-match. */
function hintPresent(blob: string, hint: string): boolean {
  if (hint.length <= 3) {
    const escaped = hint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, "i").test(blob);
  }
  return blob.includes(hint);
}

export function resolveRoleFamily(jobTitle: string, domain?: string): string {
  const blob = `${jobTitle} ${domain || ""}`.toLowerCase();
  const market = loadMarket();

  // Career stage takes priority over domain — "AI/ML Intern" should get intern-
  // stage guidance, not ml_engineer signals, even though both hints are present.
  if (market.intern?.titleHints.some((h) => hintPresent(blob, h))) return "intern";

  for (const [key, signals] of Object.entries(market)) {
    if (key === "intern") continue;
    if (signals.titleHints.some((h) => hintPresent(blob, h))) return key;
  }
  // titleHints missed — try broader regex buckets before giving up. A role that
  // matches none of these gets the honestly-labeled "general" fallback instead of
  // being silently mislabeled as software_engineer (which used to hand a finance
  // or marketing candidate irrelevant advice like "TypeScript is trending").
  if (/intern|trainee|graduate/i.test(blob)) return "intern";
  if (/data analyst|business analyst|\bbi analyst\b/i.test(blob)) return "data_analyst";
  if (/\bml\b|machine learning|\bai\b/i.test(blob)) return "ml_engineer";
  if (/devops|platform engineer|site reliability|\bsre\b/i.test(blob)) return "devops";
  if (/backend|back-end|api engineer|server-side/i.test(blob)) return "backend_engineer";
  // Bare "quality" deliberately excluded here too — "Quality Control Inspector"
  // (manufacturing) and "Quality Manager" are not software QA roles.
  if (/\bqa\b|sdet|\btest\b|quality assurance/i.test(blob)) return "sdet";
  // Deliberately not a bare \bengineer\b catch-all — "Mechanical Engineer",
  // "Civil Engineer", etc. have nothing to do with software market signals,
  // so an unqualified "engineer" title falls through to the honest "general"
  // bucket instead of confidently-wrong software advice.
  if (/software|developer/i.test(blob)) return "software_engineer";
  return "general";
}

export function getMarketSignals(jobTitle: string, domain?: string): RoleMarketSignals {
  const family = resolveRoleFamily(jobTitle, domain);
  return loadMarket()[family] || loadMarket().software_engineer;
}

export function marketIntelligenceForCandidate(
  jobTitle: string,
  vaultSkillBlob: string,
  domain?: string
): {
  roleFamily: string;
  fastGrowing: string[];
  emerging: string[];
  increasingDemand: string[];
  declining: string[];
  aiOpportunities: string[];
  relevantEmerging: string[];
  unlockSkills: string[];
} {
  const signals = getMarketSignals(jobTitle, domain);
  const family = resolveRoleFamily(jobTitle, domain);
  const lower = vaultSkillBlob.toLowerCase();

  const relevantEmerging = signals.emerging.filter(
    (e) =>
      !lower.includes(e.split(" ")[0].toLowerCase()) &&
      signals.increasingDemand.some((d) => lower.includes(d.toLowerCase().split(" ")[0]) || d.length < 12)
  ).slice(0, 4);

  const unlockSkills = signals.unlockSkills.filter((s) => !lower.includes(s.toLowerCase().split(" ")[0])).slice(0, 4);

  return {
    roleFamily: family,
    fastGrowing: signals.fastGrowing,
    emerging: signals.emerging,
    increasingDemand: signals.increasingDemand,
    declining: signals.declining,
    aiOpportunities: signals.aiOpportunities,
    relevantEmerging,
    unlockSkills
  };
}
