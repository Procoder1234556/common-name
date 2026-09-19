/** Shared check API / UI types (safe for client imports). */

export type SignalCode = "EXACT_TAKEN" | "SIMILAR" | "LIKELY_UNIQUE";

export type MatchType = "exact" | "similar";

export interface RankedMatchDto {
  cin: string;
  name: string;
  status: string | null;
  state: string | null;
  companyClass: string | null;
  matchType: MatchType;
  score: number;
}

export interface CheckSuccessDto {
  query: { raw: string; normalized: string };
  signal: {
    code: SignalCode;
    message: string;
    exactCount: number;
    similarCount: number;
  };
  matches: RankedMatchDto[];
  meta: {
    snapshotLabel: string;
    snapshotAt: string;
    sourceUrl: string;
    returned: number;
    limit: number;
  };
  links: { mcaVerify: string };
  disclaimer: string;
}

export interface CheckErrorDto {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
