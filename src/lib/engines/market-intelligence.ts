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

export function resolveRoleFamily(jobTitle: string, domain?: string): string {
  const blob = `${jobTitle} ${domain || ""}`.toLowerCase();
  const market = loadMarket();
  for (const [key, signals] of Object.entries(market)) {
    if (signals.titleHints.some((h) => blob.includes(h))) return key;
  }
  if (/intern|trainee|graduate/i.test(blob)) return "intern";
  if (/ml|machine learning|ai\b/i.test(blob)) return "ml_engineer";
  if (/qa|sdet|test|quality/i.test(blob)) return "sdet";
  return "software_engineer";
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
