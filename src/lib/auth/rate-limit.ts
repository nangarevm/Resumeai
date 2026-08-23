/** In-memory, fixed-window rate limiter for auth endpoints. No database or
 *  Redis exists in this app (see workspace-store.ts's file-based design),
 *  so this deliberately matches that: a module-level Map, correct on a
 *  single server instance, and explicitly NOT correct across multiple
 *  instances/serverless replicas — the same known limitation already
 *  documented for the rest of this app's storage. Good enough to stop
 *  casual brute-force/spam against a single deployment; a real multi-
 *  instance deployment would need this backed by Redis or the eventual
 *  Postgres migration instead. */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Without this, every distinct key (one per attempted email/IP) would sit in
// memory forever — bounded cleanup keeps a long-running server's memory flat.
let lastSweep = Date.now();
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

function sweepExpired(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** Checks and records one attempt against `key` in a fixed window. Call
 *  this once per attempt you want to count — callers decide what counts
 *  (e.g. only failed logins, so a legitimate user isn't penalized for
 *  succeeding after one typo). */
export function checkRateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweepExpired(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= max) {
    return { allowed: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export function resetRateLimits(): void {
  buckets.clear();
}
