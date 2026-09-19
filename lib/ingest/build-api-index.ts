/**
 * Stream Company Master pages from data.gov.in into SQLite (name-level only).
 */

import fs from "node:fs";
import path from "node:path";
import { openDb, type DatasetMetaInput } from "@/lib/db";
import { atomicReplaceDb } from "@/lib/ingest/build-db";
import {
  fetchOgdApiPage,
  mapOgdApiRecord,
  OGD_API_SOURCE_URL,
} from "@/lib/ingest/ogd-api";

export interface BuildApiIndexOptions {
  apiKey: string;
  resourceId: string;
  dbPath: string;
  /** Max records to pull (default: all). Useful for smoke tests. */
  maxRows?: number;
  /** Page size requested from API (portal keys often cap ~10). */
  pageSize?: number;
  persistEveryPages?: number;
  onProgress?: (info: {
    offset: number;
    inserted: number;
    total: number;
    pageCount: number;
  }) => void;
}

export interface BuildApiIndexResult {
  dbPath: string;
  bakPath: string | null;
  rowCount: number;
  apiTotal: number;
  pages: number;
  ftsEnabled: boolean;
  skipped: number;
}

export async function buildCompaniesIndexFromApi(
  options: BuildApiIndexOptions,
): Promise<BuildApiIndexResult> {
  const pageSize = Math.max(1, options.pageSize ?? 1000);
  const persistEvery = Math.max(1, options.persistEveryPages ?? 50);
  const maxRows = options.maxRows ?? Number.POSITIVE_INFINITY;

  const resolved = path.resolve(options.dbPath);
  const tmpPath = `${resolved}.tmp`;
  if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);

  const db = await openDb(tmpPath);
  let inserted = 0;
  let skipped = 0;
  let pages = 0;
  let apiTotal = 0;
  let offset = 0;
  let ftsEnabled = false;

  try {
    db.clearCompanies();

    while (inserted < maxRows) {
      const limit = Math.min(pageSize, maxRows - inserted);
      const page = await fetchOgdApiPage({
        apiKey: options.apiKey,
        resourceId: options.resourceId,
        offset,
        limit,
      });
      apiTotal = page.total || apiTotal;
      pages += 1;

      if (page.records.length === 0) break;

      const batch = [];
      for (const record of page.records) {
        const row = mapOgdApiRecord(record);
        if (!row) {
          skipped += 1;
          continue;
        }
        batch.push(row);
      }

      if (batch.length > 0) {
        db.insertCompanies(batch, { rebuildFts: false, persist: false });
        inserted += batch.length;
      }

      options.onProgress?.({
        offset,
        inserted,
        total: apiTotal,
        pageCount: page.records.length,
      });

      if (pages % persistEvery === 0) {
        db.persist();
      }

      // Advance by returned count (portal keys often ignore large limit).
      offset += page.records.length;
      if (page.records.length === 0) break;
      if (apiTotal > 0 && offset >= apiTotal) break;
      if (inserted >= maxRows) break;
    }

    const now = new Date().toISOString();
    const snapshotAt = process.env.OGD_SNAPSHOT_AT?.trim() || now.slice(0, 10);

    const meta: DatasetMetaInput = {
      source_name: "data.gov.in RoC-wise Company Master (API)",
      source_url: OGD_API_SOURCE_URL,
      snapshot_label: `OGD API ${snapshotAt}`,
      snapshot_at: snapshotAt,
      ingested_at: now,
      row_count: inserted,
      checksum_sha256: null,
      notes:
        `API resource ${options.resourceId}; pages=${pages}; skipped=${skipped}; ` +
        `name-level only (no office address / directors); no MCA portal scrape.`,
    };
    db.upsertDatasetMeta(meta);
    db.rebuildFts();
    ftsEnabled = db.hasFts();
  } finally {
    db.close();
  }

  if (inserted === 0) {
    fs.unlinkSync(tmpPath);
    throw new Error("Aborting ingest: zero company rows from OGD API");
  }

  const bakPath = atomicReplaceDb(tmpPath, resolved);
  return {
    dbPath: resolved,
    bakPath,
    rowCount: inserted,
    apiTotal,
    pages,
    ftsEnabled,
    skipped,
  };
}
