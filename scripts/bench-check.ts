/**
 * Warm-index latency probe for POST-style match (Phase 4.2).
 * Usage: pnpm db:bench
 * Target: p95 < 3000ms on production-sized DB.
 */

import { closeDb, openDb, getDbPath } from "../lib/db";
import { matchCompanyName } from "../lib/match";

const SAMPLE_QUERIES = [
  "ACME Private Limited",
  "Tekno Solutions",
  "Techno Solutions Pvt Ltd",
  "Zorblax Quorvian Holdings",
  "Unique Sparse Nebula LLP",
  "Blue Ocean Ventures",
  "Quantum Softwares",
  "Nova Retail",
];

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx] ?? 0;
}

async function main(): Promise<void> {
  const dbPath = getDbPath();
  const db = await openDb(dbPath);
  try {
    const count = db.countCompanies();
    if (count === 0) {
      console.error(
        "Index empty. Run pnpm db:fixture or pnpm db:ingest first.",
      );
      process.exit(1);
    }

    const warmup = Math.min(3, SAMPLE_QUERIES.length);
    for (let i = 0; i < warmup; i += 1) {
      try {
        matchCompanyName(db, SAMPLE_QUERIES[i]!);
      } catch {
        // ignore invalid / sparse misses during warmup
      }
    }

    const times: number[] = [];
    const rounds = Number(process.env.BENCH_ROUNDS ?? "20");

    for (let r = 0; r < rounds; r += 1) {
      const q = SAMPLE_QUERIES[r % SAMPLE_QUERIES.length]!;
      const t0 = performance.now();
      try {
        matchCompanyName(db, q);
      } catch {
        // still count latency for fail-closed paths
      }
      times.push(performance.now() - t0);
    }

    times.sort((a, b) => a - b);
    const report = {
      ok: true,
      dbPath,
      rowCount: count,
      fts: db.hasFts(),
      rounds: times.length,
      p50Ms: Number(percentile(times, 50).toFixed(2)),
      p95Ms: Number(percentile(times, 95).toFixed(2)),
      p99Ms: Number(percentile(times, 99).toFixed(2)),
      maxMs: Number((times[times.length - 1] ?? 0).toFixed(2)),
      targetP95Ms: 3000,
      pass: percentile(times, 95) < 3000,
    };

    console.log(JSON.stringify(report, null, 2));
    if (!report.pass) process.exit(1);
  } finally {
    db.close();
    closeDb();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
