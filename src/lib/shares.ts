import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";

export interface ShareRecord {
  token: string;
  userId: string;
  snapshot: string;
  createdAt: string;
  expiresAt: string;
}

interface SharesFile {
  shares: Record<string, ShareRecord>; // keyed by token
}

const SHARE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function sharesFilePath(): string {
  return process.env.RESUMEPROOF_SHARES_FILE || path.join(process.cwd(), "data", "shares", "shares.json");
}

// Deliberately NOT using the in-memory-cache-in-front-of-disk pattern the
// other file-backed stores in this codebase use (accounts.ts, store.ts,
// market-intelligence.ts, live-market-feed.ts). Confirmed by testing: the
// public share-viewer page (src/app/r/[token]/page.tsx) and the
// authenticated /api/share route end up as separate module instances with
// their own copies of a module-level cache variable, so revoking through
// one left the other still serving a cached, already-revoked share. Those
// other stores can tolerate that kind of staleness (or never mutate
// cross-route at all); a share link's revoke has to take effect
// immediately everywhere, and shares aren't a hot path, so the cache
// isn't worth the correctness risk here.
export function resetSharesCache(): void {
  /* no-op — kept so tests/setup.ts's beforeEach call stays uniform across
   * all three file-backed stores without needing a special case. */
}

function readShares(): SharesFile {
  const file = sharesFilePath();
  try {
    if (fs.existsSync(/* turbopackIgnore: true */ file)) {
      return JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ file, "utf8")) as SharesFile;
    }
  } catch {
    /* ignore — fall through to empty store */
  }
  return { shares: {} };
}

function writeShares(file: SharesFile): void {
  const filePath = sharesFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(file, null, 2));
}

function isExpired(record: ShareRecord): boolean {
  return Date.now() > new Date(record.expiresAt).getTime();
}

/** One active share link per user — creating a new one replaces any
 *  existing link for that user (revoking the old token), so a forgotten
 *  stale link can't keep sitting around alongside a fresh one. */
export function createShare(userId: string, resumeText: string): ShareRecord {
  const file = readShares();
  for (const [token, record] of Object.entries(file.shares)) {
    if (record.userId === userId) delete file.shares[token];
  }
  const token = randomBytes(24).toString("base64url");
  const record: ShareRecord = {
    token,
    userId,
    snapshot: resumeText,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SHARE_TTL_MS).toISOString()
  };
  file.shares[token] = record;
  writeShares(file);
  return record;
}

export function getActiveShareForUser(userId: string): ShareRecord | null {
  const file = readShares();
  const record = Object.values(file.shares).find((r) => r.userId === userId);
  if (!record || isExpired(record)) return null;
  return record;
}

/** Public lookup path — no auth, no userId known in advance. Returns null
 *  for a missing OR expired token so an expired link reads identically to
 *  a never-existed one (no signal leaked either way). */
export function getShareByToken(token: string): ShareRecord | null {
  const record = readShares().shares[token];
  if (!record || isExpired(record)) return null;
  return record;
}

export function revokeShare(userId: string): boolean {
  const file = readShares();
  let removed = false;
  for (const [token, record] of Object.entries(file.shares)) {
    if (record.userId === userId) {
      delete file.shares[token];
      removed = true;
    }
  }
  if (removed) writeShares(file);
  return removed;
}
