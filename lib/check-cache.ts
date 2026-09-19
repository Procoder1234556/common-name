/**
 * Tiny TTL LRU for identical normalized check queries (BACKEND_STRUCTURE.md §10).
 */

import type { MatchOutcome } from "@/lib/match";

interface CacheEntry {
  value: MatchOutcome;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX = 200;

const store = new Map<string, CacheEntry>();

function pruneExpired(now: number): void {
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) {
      store.delete(key);
    }
  }
}

export function getCachedCheck(normalized: string): MatchOutcome | undefined {
  const now = Date.now();
  pruneExpired(now);
  const entry = store.get(normalized);
  if (!entry) return undefined;
  if (entry.expiresAt <= now) {
    store.delete(normalized);
    return undefined;
  }
  // Refresh insertion order for LRU-ish behavior.
  store.delete(normalized);
  store.set(normalized, entry);
  return entry.value;
}

export function setCachedCheck(
  normalized: string,
  value: MatchOutcome,
  ttlMs = DEFAULT_TTL_MS,
): void {
  const now = Date.now();
  pruneExpired(now);

  if (store.has(normalized)) {
    store.delete(normalized);
  }

  store.set(normalized, { value, expiresAt: now + ttlMs });

  while (store.size > DEFAULT_MAX) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

export function clearCheckCache(): void {
  store.clear();
}
