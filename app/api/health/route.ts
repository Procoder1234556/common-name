import { NextResponse } from "next/server";
import { getDb, getDatasetMeta, isIndexReady } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — liveness + index readiness (BACKEND_STRUCTURE.md §6).
 * Returns 503 when index empty so hosts fail closed (never advertise ready uniqueness).
 */
export async function GET() {
  try {
    const db = await getDb();
    const ready = isIndexReady(db);
    const meta = getDatasetMeta(db);
    const rowCount = meta?.row_count ?? 0;
    const snapshotAt = meta?.snapshot_at ?? null;
    const snapshotLabel = meta?.snapshot_label ?? null;

    const body = {
      ok: ready,
      index: {
        ready,
        rowCount,
        snapshotAt,
        snapshotLabel,
      },
    };

    if (!ready) {
      console.warn(
        JSON.stringify({
          level: "warn",
          code: "INDEX_UNAVAILABLE",
          route: "/api/health",
          rowCount,
        }),
      );
      return NextResponse.json(body, { status: 503 });
    }

    return NextResponse.json(body);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        code: "HEALTH_ERROR",
        route: "/api/health",
        message: error instanceof Error ? error.message : "unknown",
      }),
    );
    return NextResponse.json(
      {
        ok: false,
        index: {
          ready: false,
          rowCount: 0,
          snapshotAt: null,
          snapshotLabel: null,
        },
      },
      { status: 503 },
    );
  }
}
