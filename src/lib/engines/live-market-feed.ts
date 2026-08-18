import fs from "fs";
import path from "path";
import type { RoleMarketSignals } from "./market-intelligence";

const CACHE_FILE = path.join(process.cwd(), "data", "runtime", "market-cache.json");
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface MarketCacheEntry {
  fetchedAt: string;
  roleFamily: string;
  fastGrowing: string[];
  increasingDemand: string[];
  emerging: string[];
  source: string;
}

interface MarketCacheFile {
  entries: Record<string, MarketCacheEntry>;
}

const ROLE_SEARCH_QUERIES: Record<string, string[]> = {
  sdet: ["playwright", "api testing", "test automation"],
  software_engineer: ["typescript", "react", "nodejs"],
  ml_engineer: ["pytorch", "machine learning", "llm"],
  backend_engineer: ["microservices", "rest api", "golang"],
  devops: ["kubernetes", "terraform", "ci cd"],
  data_analyst: ["pandas", "sql analytics", "data visualization"],
  intern: ["python portfolio", "git github", "rest api"]
};

function readCache(): MarketCacheFile {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) as MarketCacheFile;
    }
  } catch {
    /* ignore */
  }
  return { entries: {} };
}

function writeCache(file: MarketCacheFile): void {
  const dir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(file, null, 2));
}

function isFresh(entry: MarketCacheEntry): boolean {
  const age = Date.now() - new Date(entry.fetchedAt).getTime();
  return age < CACHE_TTL_MS;
}

async function fetchNpmTrendKeywords(query: string, limit = 6): Promise<string[]> {
  const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${limit}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    objects?: Array<{ package?: { name?: string; description?: string } }>;
  };
  const names: string[] = [];
  for (const obj of data.objects || []) {
    const name = obj.package?.name;
    if (name) names.push(name.replace(/-/g, " "));
  }
  return names;
}

async function fetchGithubTopicKeywords(query: string, limit = 5): Promise<string[]> {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=${limit}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "ResumeProof-MarketFeed"
    },
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: Array<{ topics?: string[]; description?: string }> };
  const topics: string[] = [];
  for (const item of data.items || []) {
    if (item.description) topics.push(item.description.split(/[.,]/)[0].trim().slice(0, 48));
    for (const t of item.topics || []) {
      if (t.length > 2) topics.push(t.replace(/-/g, " "));
    }
  }
  return topics;
}

async function fetchCustomMarketUrl(url: string): Promise<Partial<RoleMarketSignals> | null> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;
  const data = (await res.json()) as Partial<RoleMarketSignals>;
  return data;
}

export interface LiveMarketOverlay {
  fastGrowing: string[];
  increasingDemand: string[];
  emerging: string[];
  source: string;
  fetchedAt: string;
  fromCache: boolean;
}

export function getCachedLiveOverlay(roleFamily: string): LiveMarketOverlay | null {
  const cache = readCache();
  const cached = cache.entries[roleFamily];
  if (!cached || !isFresh(cached)) return null;
  return {
    fastGrowing: cached.fastGrowing,
    increasingDemand: cached.increasingDemand,
    emerging: cached.emerging,
    source: cached.source,
    fetchedAt: cached.fetchedAt,
    fromCache: true
  };
}

export async function fetchLiveMarketOverlay(roleFamily: string, jobTitle?: string): Promise<LiveMarketOverlay> {
  const cache = readCache();
  const cached = cache.entries[roleFamily];
  if (cached && isFresh(cached)) {
    return {
      fastGrowing: cached.fastGrowing,
      increasingDemand: cached.increasingDemand,
      emerging: cached.emerging,
      source: cached.source,
      fetchedAt: cached.fetchedAt,
      fromCache: true
    };
  }

  const queries = ROLE_SEARCH_QUERIES[roleFamily] || ROLE_SEARCH_QUERIES.software_engineer;
  const titleQuery = jobTitle?.split(/\s+/).slice(0, 2).join(" ");
  const searchQueries = titleQuery ? [titleQuery, ...queries.slice(0, 2)] : queries;

  const npmResults: string[] = [];
  const githubResults: string[] = [];

  for (const q of searchQueries.slice(0, 3)) {
    try {
      npmResults.push(...(await fetchNpmTrendKeywords(q, 4)));
      githubResults.push(...(await fetchGithubTopicKeywords(q, 3)));
    } catch {
      /* network timeout — fall through to static */
    }
  }

  let custom: Partial<RoleMarketSignals> | null = null;
  const customUrl = process.env.MARKET_DATA_URL;
  if (customUrl) {
    try {
      custom = await fetchCustomMarketUrl(customUrl);
    } catch {
      /* ignore */
    }
  }

  const dedupe = (list: string[]) =>
    [...new Set(list.map((s) => s.trim()).filter((s) => s.length > 2 && s.length < 64))].slice(0, 8);

  const fastGrowing = dedupe([
    ...(custom?.fastGrowing || []),
    ...npmResults.slice(0, 6),
    ...githubResults.slice(0, 4)
  ]);

  const increasingDemand = dedupe([
    ...(custom?.increasingDemand || []),
    ...npmResults.slice(0, 8)
  ]);

  const emerging = dedupe([
    ...(custom?.emerging || []),
    ...githubResults.slice(0, 6)
  ]);

  const source =
    customUrl && custom
      ? `custom URL + npm/github`
      : npmResults.length || githubResults.length
        ? "npm registry + GitHub search (live)"
        : "curated baseline only";

  const entry: MarketCacheEntry = {
    fetchedAt: new Date().toISOString(),
    roleFamily,
    fastGrowing,
    increasingDemand,
    emerging,
    source
  };

  cache.entries[roleFamily] = entry;
  writeCache(cache);

  return {
    fastGrowing,
    increasingDemand,
    emerging,
    source,
    fetchedAt: entry.fetchedAt,
    fromCache: false
  };
}

export function mergeLiveWithStatic(
  staticSignals: RoleMarketSignals,
  live: LiveMarketOverlay | null
): RoleMarketSignals & { liveSource?: string; liveFetchedAt?: string } {
  if (!live || !live.fastGrowing.length && !live.increasingDemand.length) {
    return staticSignals;
  }

  const mergeList = (base: string[], extra: string[]) =>
    [...new Set([...extra.slice(0, 5), ...base])].slice(0, 10);

  return {
    ...staticSignals,
    fastGrowing: mergeList(staticSignals.fastGrowing, live.fastGrowing),
    increasingDemand: mergeList(staticSignals.increasingDemand, live.increasingDemand),
    emerging: mergeList(staticSignals.emerging, live.emerging),
    liveSource: live.source,
    liveFetchedAt: live.fetchedAt
  };
}
