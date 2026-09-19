/**
 * Company-name normalization (BACKEND_STRUCTURE.md §4).
 * Pure functions — shared by fixtures, ingest, and match.
 */

/** Longest-first legal suffix / form tokens stripped from the end. */
export const LEGAL_SUFFIXES = [
  "limited liability partnership",
  "one person company",
  "private limited",
  "pvt limited",
  "pvt. ltd.",
  "pvt ltd",
  "p ltd",
  "ltd.",
  "ltd",
  "limited",
  "llp",
  "opc",
  "company",
  "co.",
  "co",
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripTrailingSuffixes(value: string): string {
  let current = value;
  let changed = true;

  while (changed) {
    changed = false;
    for (const suffix of LEGAL_SUFFIXES) {
      // After punctuation fold, dotted forms are redundant but kept for safety.
      const pattern = new RegExp(`(?:^|\\s)${escapeRegExp(suffix)}$`, "i");
      const next = current.replace(pattern, "").replace(/\s+/g, " ").trim();
      if (next !== current) {
        current = next;
        changed = true;
        break;
      }
    }
  }

  return current;
}

/**
 * Normalize a proposed or registered company name for matching.
 * Returns empty string when nothing distinctive remains after suffix strip.
 */
export function normalizeCompanyName(input: string): string {
  let value = input.normalize("NFKC").trim().toLowerCase();
  value = value.replace(/\s+/g, " ");
  // Replace punctuation with space; keep letters/numbers/spaces (Unicode-aware).
  value = value.replace(/[^\p{L}\p{N}\s]/gu, " ");
  value = value.replace(/\s+/g, " ").trim();
  value = stripTrailingSuffixes(value);
  return value;
}

export function isValidDistinctiveName(normalized: string): boolean {
  return normalized.length >= 1;
}

/** Significant tokens for candidate prefilter (length ≥ 3). */
export function significantTokens(normalized: string): string[] {
  return normalized
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}
