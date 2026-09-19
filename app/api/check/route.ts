import { NextRequest, NextResponse } from "next/server";
import { getCachedCheck, setCachedCheck } from "@/lib/check-cache";
import { getDatasetMeta, getDb } from "@/lib/db";
import {
  DISCLAIMER,
  IndexUnavailableError,
  InvalidDistinctiveNameError,
  matchCompanyName,
  type MatchOutcome,
} from "@/lib/match";
import { normalizeCompanyName } from "@/lib/normalize";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkNameBodySchema } from "@/lib/schemas/check";

const MCA_VERIFY_URL =
  process.env.NEXT_PUBLIC_MCA_VERIFY_URL ??
  "https://www.mca.gov.in/content/mca/global/en/mca/fo-llp-services/company-llp-name-search.html";

interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

function errorJson(
  status: number,
  code: string,
  message: string,
  details?: unknown,
  headers?: HeadersInit,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status, headers },
  );
}

function successJson(outcome: MatchOutcome, rowCount?: number) {
  return NextResponse.json({
    query: outcome.query,
    signal: {
      code: outcome.signal.code,
      message: outcome.signal.message,
      exactCount: outcome.signal.exactCount,
      similarCount: outcome.signal.similarCount,
    },
    matches: outcome.matches,
    meta: {
      snapshotLabel: outcome.meta.snapshotLabel,
      snapshotAt: outcome.meta.snapshotAt,
      sourceUrl: outcome.meta.sourceUrl,
      returned: outcome.meta.returned,
      limit: outcome.meta.limit,
      ...(rowCount !== undefined ? { rowCount } : {}),
    },
    links: {
      mcaVerify: MCA_VERIFY_URL,
    },
    disclaimer: outcome.disclaimer || DISCLAIMER,
  });
}

/**
 * POST /api/check — uniqueness signal against local company name snapshot.
 */
export async function POST(request: NextRequest) {
  const started = Date.now();
  const ip = clientIp(request);
  const limit = checkRateLimit(ip);

  if (!limit.isAllowed) {
    return errorJson(
      429,
      "RATE_LIMITED",
      "Too many requests. Try again later.",
      undefined,
      {
        "Retry-After": String(limit.retryAfterSeconds),
        "X-RateLimit-Limit": String(limit.limit),
        "X-RateLimit-Remaining": "0",
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorJson(400, "VALIDATION_ERROR", "Request body must be JSON");
  }

  const parsed = checkNameBodySchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(
      400,
      "VALIDATION_ERROR",
      "Validation failed",
      parsed.error.issues,
    );
  }

  const rawName = parsed.data.name;
  const normalizedPreview = normalizeCompanyName(rawName);
  if (!normalizedPreview) {
    return errorJson(
      400,
      "VALIDATION_ERROR",
      "Enter a distinctive name (not only a legal suffix).",
    );
  }

  try {
    const db = await getDb();
    const indexRowCount = getDatasetMeta(db)?.row_count;

    const cached = getCachedCheck(normalizedPreview);
    if (cached) {
      console.info(
        JSON.stringify({
          level: "info",
          code: "CHECK_CACHE_HIT",
          latencyMs: Date.now() - started,
          normalizedLength: cached.query.normalized.length,
          signal: cached.signal.code,
        }),
      );
      return successJson(
        {
          ...cached,
          query: { raw: rawName, normalized: cached.query.normalized },
        },
        indexRowCount,
      );
    }

    const outcome = matchCompanyName(db, rawName);
    setCachedCheck(outcome.query.normalized, outcome);

    const latencyMs = Date.now() - started;
    console.info(
      JSON.stringify({
        level: "info",
        code: "CHECK_OK",
        latencyMs,
        normalizedLength: outcome.query.normalized.length,
        signal: outcome.signal.code,
      }),
    );

    return successJson(outcome, indexRowCount);
  } catch (error) {
    if (error instanceof IndexUnavailableError) {
      console.warn(
        JSON.stringify({
          level: "warn",
          code: "INDEX_UNAVAILABLE",
          route: "/api/check",
          latencyMs: Date.now() - started,
        }),
      );
      return errorJson(503, error.code, error.message);
    }
    if (error instanceof InvalidDistinctiveNameError) {
      return errorJson(400, error.code, error.message);
    }

    console.error(
      JSON.stringify({
        level: "error",
        code: "SERVER_ERROR",
        route: "/api/check",
        latencyMs: Date.now() - started,
        normalizedLength: normalizedPreview.length,
        status: 500,
      }),
    );

    return errorJson(
      500,
      "SERVER_ERROR",
      "Unexpected error while checking name.",
    );
  }
}
