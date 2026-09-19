/**
 * OGD Company Master ingest CLI (Phase 4).
 *
 * Gate: CONFIRM_OGD_DOWNLOAD=yes (+ OGD_DOWNLOAD_URL) OR OGD_LOCAL_PATH.
 * Never scrapes MCA portal. Name-level fields only.
 */

import fs from "node:fs";
import path from "node:path";
import {
  assertIngestAllowed,
  buildCompaniesIndex,
  IngestGateError,
  parseCompaniesCsv,
  resolveArtifact,
} from "@/lib/ingest";
import { getDbPath } from "@/lib/db";

async function main(): Promise<void> {
  const gate = assertIngestAllowed();
  const artifact = await resolveArtifact(gate);
  const csvText = fs.readFileSync(artifact.csvPath, "utf8");
  const parsed = parseCompaniesCsv(csvText);

  if (parsed.rows.length === 0) {
    console.error(
      JSON.stringify({
        ok: false,
        error: "ZERO_ROWS",
        skippedMissing: parsed.skippedMissing,
        skippedNormalizeEmpty: parsed.skippedNormalizeEmpty,
        skippedDuplicateCin: parsed.skippedDuplicateCin,
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

  const now = new Date().toISOString();
  const dbPath = getDbPath();

  const result = await buildCompaniesIndex({
    rows: parsed.rows,
    dbPath,
    meta: {
      source_name: "data.gov.in Company Master Data (OGD)",
      source_url: catalogUrl,
      snapshot_label: `OGD ${snapshotAt}`,
      snapshot_at: snapshotAt,
      ingested_at: now,
      row_count: parsed.rows.length,
      checksum_sha256: artifact.checksumSha256,
      notes:
        `Ingest via ${artifact.sourceLabel}; CSV ${path.basename(artifact.csvPath)}; ` +
        `skipped missing=${parsed.skippedMissing} emptyNorm=${parsed.skippedNormalizeEmpty} ` +
        `dupCin=${parsed.skippedDuplicateCin}; no director fields.`,
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        dbPath: result.dbPath,
        bakPath: result.bakPath,
        rowCount: result.rowCount,
        checksumSha256: artifact.checksumSha256,
        ftsEnabled: result.ftsEnabled,
        note: result.ftsEnabled
          ? undefined
          : "FTS5 unavailable in sql.js WASM — LIKE prefilter used (Phase 4)",
        sourceLabel: artifact.sourceLabel,
        columnMap: parsed.columnMap,
        skipped: {
          missing: parsed.skippedMissing,
          normalizeEmpty: parsed.skippedNormalizeEmpty,
          duplicateCin: parsed.skippedDuplicateCin,
        },
        sample: parsed.rows.slice(0, 3).map((r) => ({
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
