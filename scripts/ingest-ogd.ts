/**
 * OGD Company Master ingest CLI (Phase 4+).
 *
 * Gate: CONFIRM_OGD_DOWNLOAD=yes (+ URL/API) OR OGD_LOCAL_PATH OR OGD_LOCAL_DIR.
 * Never scrapes MCA portal. Name-level fields only.
 */

import fs from "node:fs";
import path from "node:path";
import {
  assertIngestAllowed,
  buildCompaniesIndex,
  IngestGateError,
  mergeParsedCompanies,
  parseCompaniesCsv,
  resolveArtifact,
} from "@/lib/ingest";
import { getDbPath } from "@/lib/db";

async function main(): Promise<void> {
  const gate = assertIngestAllowed();
  if (gate.mode === "api") {
    console.error(
      "API mode: use `pnpm db:ingest-api` instead of `pnpm db:ingest`.",
    );
    process.exit(1);
  }

  const artifact = await resolveArtifact(gate);
  const parsedList = artifact.csvPaths.map((csvPath) => {
    const csvText = fs.readFileSync(csvPath, "utf8");
    return parseCompaniesCsv(csvText);
  });
  const merged = mergeParsedCompanies(parsedList);

  if (merged.rows.length === 0) {
    console.error(
      JSON.stringify({
        ok: false,
        error: "ZERO_ROWS",
        fileCount: merged.fileCount,
        skippedMissing: merged.skippedMissing,
        skippedNormalizeEmpty: merged.skippedNormalizeEmpty,
        skippedDuplicateCin: merged.skippedDuplicateCin,
        skippedCrossFileDupCin: merged.skippedCrossFileDupCin,
      }),
    );
    process.exit(1);
  }

  const catalogUrl =
    process.env.NEXT_PUBLIC_OGD_CATALOG_URL?.trim() ||
    "https://data.gov.in/catalog/company-master-data";

  const snapshotAt =
    process.env.OGD_SNAPSHOT_AT?.trim() ||
    new Date().toISOString().slice(0, 10);

  const multi = artifact.fileCount > 1;
  const snapshotLabel = multi
    ? `OGD multi-state ${snapshotAt}`
    : `OGD ${snapshotAt}`;

  const now = new Date().toISOString();
  const dbPath = getDbPath();
  const csvNames = artifact.csvPaths
    .map((p) => path.basename(p))
    .slice(0, 12)
    .join(", ");

  const result = await buildCompaniesIndex({
    rows: merged.rows,
    dbPath,
    meta: {
      source_name: "data.gov.in Company Master Data (OGD)",
      source_url: catalogUrl,
      snapshot_label: snapshotLabel,
      snapshot_at: snapshotAt,
      ingested_at: now,
      row_count: merged.rows.length,
      checksum_sha256: artifact.checksumSha256,
      notes:
        `Ingest via ${artifact.sourceLabel}; files=${artifact.fileCount}` +
        `${multi ? ` [${csvNames}${artifact.fileCount > 12 ? ", …" : ""}]` : ` CSV ${path.basename(artifact.csvPaths[0]!)}`}; ` +
        `skipped missing=${merged.skippedMissing} emptyNorm=${merged.skippedNormalizeEmpty} ` +
        `dupCin=${merged.skippedDuplicateCin} crossFileDup=${merged.skippedCrossFileDupCin}; no director fields.`,
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        dbPath: result.dbPath,
        bakPath: result.bakPath,
        rowCount: result.rowCount,
        fileCount: artifact.fileCount,
        checksumSha256: artifact.checksumSha256,
        ftsEnabled: result.ftsEnabled,
        driver: result.driver,
        note: result.ftsEnabled
          ? undefined
          : "FTS5 unavailable — LIKE prefilter used; set COMPANIES_DB_DRIVER=better-sqlite3 for BM25",
        sourceLabel: artifact.sourceLabel,
        snapshotLabel,
        skipped: {
          missing: merged.skippedMissing,
          normalizeEmpty: merged.skippedNormalizeEmpty,
          duplicateCin: merged.skippedDuplicateCin,
          crossFileDupCin: merged.skippedCrossFileDupCin,
        },
        sample: merged.rows.slice(0, 3).map((r) => ({
          cin: r.cin,
          name: r.name,
          normalized_name: r.normalized_name,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  if (error instanceof IngestGateError) {
    console.error(error.message);
    process.exit(error.exitCode);
  }
  console.error(error);
  process.exit(1);
});
