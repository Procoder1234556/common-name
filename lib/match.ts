/**
 * Exact + fuzzy company-name matching (BACKEND_STRUCTURE.md §5).
 *
 * Constants (documented for tuning):
 * - FUSE_THRESHOLD 0.4 — Fuse keeps results with score ≤ 0.4 (0 = perfect)
 * - MIN_SIMILARITY 0.6 — inverted Fuse / Levenshtein floor for similar band
 * - CANDIDATE_LIMIT 500 — SQL prefilter cap before Fuse
 * - MATCH_LIMIT 20 — response cap
 */

import Fuse from "fuse.js";
import type { CompanyDatabase, CompanyRow, DatasetMeta } from "@/lib/db";
import {
  isValidDistinctiveName,
  normalizeCompanyName,
  significantTokens,
} from "@/lib/normalize";
import type { MatchType, SignalCode } from "@/lib/types/check";

export type { MatchType, SignalCode } from "@/lib/types/check";

/** Fuse.js threshold: lower = stricter. Documented default for this product. */
export const FUSE_THRESHOLD = 0.4;

/** Minimum similarity (1 − Fuse score, or Levenshtein ratio) to keep as similar. */
export const MIN_SIMILARITY = 0.6;

export const CANDIDATE_LIMIT = 500;
export const MATCH_LIMIT = 20;
export const MIN_TOKEN_LENGTH = 3;

export const DISCLAIMER =
  "This is a snapshot uniqueness signal from MCA Company Master open data. MCA live search and SPICe+ approval are authoritative — this server never fetches the MCA website.";

export interface RankedMatch {
  cin: string;
  name: string;
  status: string | null;
  state: string | null;
  companyClass: string | null;
  matchType: MatchType;
  score: number;
}

export interface MatchSignal {
  code: SignalCode;
  message: string;
  exactCount: number;
  similarCount: number;
}

export interface MatchOutcome {
  query: { raw: string; normalized: string };
  signal: MatchSignal;
  matches: RankedMatch[];
  meta: {
    snapshotLabel: string;
    snapshotAt: string;
    sourceUrl: string;
    returned: number;
    limit: number;
    totalSimilar: number;
  };
  disclaimer: string;
}

export class IndexUnavailableError extends Error {
  readonly code = "INDEX_UNAVAILABLE" as const;

  constructor(
    message = "Company name index unavailable. Snapshot not loaded.",
  ) {
    super(message);
    this.name = "IndexUnavailableError";
  }
}

export class InvalidDistinctiveNameError extends Error {
  readonly code = "VALIDATION_ERROR" as const;

  constructor(message = "Enter a distinctive name (not only a legal suffix).") {
    super(message);
    this.name = "InvalidDistinctiveNameError";
  }
}

function rowFromExec(row: Record<string, unknown>): CompanyRow {
  return {
    id: Number(row.id),
    cin: String(row.cin),
    name: String(row.name),
    normalized_name: String(row.normalized_name),
    status: (row.status as string | null) ?? null,
    company_class: (row.company_class as string | null) ?? null,
    state: (row.state as string | null) ?? null,
    registered_on: (row.registered_on as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function findExactMatches(
  db: CompanyDatabase,
  normalized: string,
): CompanyRow[] {
  const rows = db.exec(
    `
    SELECT id, cin, name, normalized_name, status, company_class, state,
           registered_on, created_at, updated_at
    FROM companies
    WHERE normalized_name = ?
    ORDER BY name ASC
    `,
    [normalized],
  );
  return rows.map(rowFromExec);
}

/** Escape FTS5 query tokens (keep alphanumerics; quote phrases). */
export function buildFtsMatchQuery(tokens: string[]): string {
  return tokens
    .map((token) => {
      const cleaned = token.replace(/[^a-z0-9]+/gi, "").toLowerCase();
      if (cleaned.length < MIN_TOKEN_LENGTH) return null;
      return `"${cleaned}"`;
    })
    .filter((t): t is string => Boolean(t))
    .join(" OR ");
}

function findCandidatesViaFts(
  db: CompanyDatabase,
  tokens: string[],
  limit: number,
): CompanyRow[] | null {
  if (!db.hasFts()) return null;
  const matchQuery = buildFtsMatchQuery(tokens);
  if (!matchQuery) return null;

  try {
    const rows = db.exec(
      `
      SELECT c.id, c.cin, c.name, c.normalized_name, c.status, c.company_class,
             c.state, c.registered_on, c.created_at, c.updated_at
      FROM companies_fts
      JOIN companies c ON c.id = companies_fts.rowid
      WHERE companies_fts MATCH ?
      ORDER BY c.name ASC
      LIMIT ?
      `,
      [matchQuery, limit],
    );
    return rows.map(rowFromExec);
  } catch {
    return null;
  }
}

export function findCandidateMatches(
  db: CompanyDatabase,
  normalized: string,
  limit = CANDIDATE_LIMIT,
): CompanyRow[] {
  const tokens = significantTokens(normalized);
  const searchTokens =
    tokens.length > 0
      ? tokens
      : normalized.length >= MIN_TOKEN_LENGTH
        ? [normalized]
        : [];

  if (searchTokens.length === 0) {
    return [];
  }

  const ftsRows = findCandidatesViaFts(db, searchTokens, limit);
  if (ftsRows !== null) {
    return ftsRows;
  }

  const clauses = searchTokens.map(() => `normalized_name LIKE ?`).join(" OR ");
  const params = searchTokens.map((token) => `%${token}%`);

  const rows = db.exec(
    `
    SELECT id, cin, name, normalized_name, status, company_class, state,
           registered_on, created_at, updated_at
    FROM companies
    WHERE ${clauses}
    ORDER BY name ASC
    LIMIT ?
    `,
    [...params, limit],
  );

  return rows.map(rowFromExec);
}

/** Classic Levenshtein edit distance. */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);

  for (let j = 0; j <= b.length; j += 1) {
    prev[j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    const aChar = a.charCodeAt(i - 1);
    for (let j = 1; j <= b.length; j += 1) {
      const cost = aChar === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        (prev[j] ?? 0) + 1,
        (curr[j - 1] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost,
      );
    }
    for (let j = 0; j <= b.length; j += 1) {
      prev[j] = curr[j] ?? 0;
    }
  }

  return prev[b.length] ?? 0;
}

/** Similarity in [0, 1] from edit distance. */
export function levenshteinRatio(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

/**
 * Lightweight phonetic key (first letter + consonant skeleton).
 * Optional boost when keys equal (e.g. Tekno / Techno via ch→k).
 */
export function phoneticKey(value: string): string {
  const words = value
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  return words
    .map((word) => {
      const compact = word
        .replace(/ph/g, "f")
        .replace(/ch/g, "k")
        .replace(/ck/g, "k")
        .replace(/q/g, "k");
      if (compact.length === 0) return "";
      const first = compact[0] ?? "";
      const rest = compact
        .slice(1)
        .replace(/[aeiou]/g, "")
        .replace(/(.)\1+/g, "$1");
      return `${first}${rest}`;
    })
    .join(" ");
}

export function scoreSimilarity(
  queryNormalized: string,
  candidate: CompanyRow,
  fuseScore: number | undefined,
): number {
  const invertedFuse =
    typeof fuseScore === "number" ? Math.max(0, 1 - fuseScore) : 0;
  const edit = levenshteinRatio(queryNormalized, candidate.normalized_name);

  let score = Math.max(invertedFuse, edit);

  if (
    phoneticKey(queryNormalized) === phoneticKey(candidate.normalized_name) &&
    phoneticKey(queryNormalized).length > 0
  ) {
    score = Math.min(1, score + 0.08);
  }

  return score;
}

function toRankedExact(row: CompanyRow): RankedMatch {
  return {
    cin: row.cin,
    name: row.name,
    status: row.status,
    state: row.state,
    companyClass: row.company_class,
    matchType: "exact",
    score: 1,
  };
}

function toRankedSimilar(row: CompanyRow, score: number): RankedMatch {
  return {
    cin: row.cin,
    name: row.name,
    status: row.status,
    state: row.state,
    companyClass: row.company_class,
    matchType: "similar",
    score: Number(score.toFixed(4)),
  };
}

export function buildSignal(
  exactCount: number,
  similarCount: number,
): MatchSignal {
  if (exactCount >= 1) {
    return {
      code: "EXACT_TAKEN",
      message: `${exactCount} exact matches — name appears taken`,
      exactCount,
      similarCount,
    };
  }
  if (similarCount >= 1) {
    return {
      code: "SIMILAR",
      message: `${similarCount} similar name${similarCount === 1 ? "" : "s"} in snapshot — review carefully, then verify on MCA`,
      exactCount,
      similarCount,
    };
  }
  return {
    code: "LIKELY_UNIQUE",
    message:
      "0 matches in our OGD snapshot — still verify on MCA before filing",
    exactCount: 0,
    similarCount: 0,
  };
}

function assertIndexReady(meta: DatasetMeta | null): DatasetMeta {
  if (!meta || meta.row_count <= 0) {
    throw new IndexUnavailableError();
  }
  return meta;
}

/**
 * Run exact + fuzzy match against the company index.
 * Throws IndexUnavailableError when meta missing / empty (fail closed).
 * Throws InvalidDistinctiveNameError when normalized name is empty.
 */
export function matchCompanyName(
  db: CompanyDatabase,
  rawName: string,
): MatchOutcome {
  const meta = assertIndexReady(db.getDatasetMeta());
  const normalized = normalizeCompanyName(rawName);

  if (!isValidDistinctiveName(normalized)) {
    throw new InvalidDistinctiveNameError();
  }

  const exactRows = findExactMatches(db, normalized);
  const exactCins = new Set(exactRows.map((row) => row.cin));

  const candidates = findCandidateMatches(db, normalized).filter(
    (row) => !exactCins.has(row.cin),
  );

  const fuse = new Fuse(candidates, {
    keys: [
      { name: "normalized_name", weight: 1 },
      { name: "name", weight: 0.3 },
    ],
    includeScore: true,
    threshold: FUSE_THRESHOLD,
    ignoreLocation: true,
  });

  const fuseHits = fuse.search(normalized);
  const scoredByCin = new Map<string, { row: CompanyRow; score: number }>();

  for (const hit of fuseHits) {
    const score = scoreSimilarity(normalized, hit.item, hit.score);
    if (score < MIN_SIMILARITY) continue;
    scoredByCin.set(hit.item.cin, { row: hit.item, score });
  }

  // Catch near-misses Fuse threshold dropped (e.g. Tekno ↔ Techno on small lists).
  for (const row of candidates) {
    if (scoredByCin.has(row.cin)) continue;
    const score = scoreSimilarity(normalized, row, undefined);
    if (score >= MIN_SIMILARITY) {
      scoredByCin.set(row.cin, { row, score });
    }
  }

  const similarRanked = [...scoredByCin.values()]
    .map(({ row, score }) => toRankedSimilar(row, score))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name);
    });

  const exactRanked = exactRows
    .map(toRankedExact)
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalSimilar = similarRanked.length;
  const combined = [...exactRanked, ...similarRanked].slice(0, MATCH_LIMIT);
  const signal = buildSignal(exactRanked.length, totalSimilar);

  return {
    query: { raw: rawName, normalized },
    signal,
    matches: combined,
    meta: {
      snapshotLabel: meta.snapshot_label,
      snapshotAt: meta.snapshot_at,
      sourceUrl: meta.source_url,
      returned: combined.length,
      limit: MATCH_LIMIT,
      totalSimilar,
    },
    disclaimer: DISCLAIMER,
  };
}
