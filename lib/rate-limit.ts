/**
 * In-memory sliding-window rate limiter (BACKEND_STRUCTURE.md §11).
 * MVP: per-process; multi-instance needs shared store later.
 */

export interface RateLimitResult {
  isAllowed: boolean;
  remaining: number;
  /** Seconds until window has capacity again (for Retry-After). */
  retryAfterSeconds: number;
  limit: number;
  windowMs: number;
}

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

function readConfig(): { windowMs: number; max: number } {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900_000);
  const max = Number(process.env.RATE_LIMIT_MAX ?? 30);
  return {
    windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 900_000,
    max: Number.isFinite(max) && max > 0 ? max : 30,
  };
}

function prune(bucket: Bucket, now: number, windowMs: number): void {
  const cutoff = now - windowMs;
  bucket.timestamps = bucket.timestamps.filter((ts) => ts > cutoff);
}

/**
 * Record one request for `key` (typically client IP).
 * Returns whether the request is allowed under the current window.
 */
export function checkRateLimit(key: string, now = Date.now()): RateLimitResult {
  const { windowMs, max } = readConfig();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  prune(bucket, now, windowMs);

  if (bucket.timestamps.length >= max) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterMs = Math.max(0, oldest + windowMs - now);
    buckets.set(key, bucket);
    return {
      isAllowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      limit: max,
      windowMs,
    };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  const remaining = Math.max(0, max - bucket.timestamps.length);

  return {
    isAllowed: true,
    remaining,
    retryAfterSeconds: 0,
    limit: max,
    windowMs,
  };
}

/** Test helper — clears all buckets. */
export function resetRateLimits(): void {
  buckets.clear();
}
