/**
 * Build SQLite index into a temp file, then atomic replace.
 * Prefers better-sqlite3 (FTS5/BM25) via openDbForIngest when safe; else sql.js.
 * (BACKEND_STRUCTURE.md §12; Phase 4+ — indexes + FTS5)
 */

import fs from "node:fs";
import path from "node:path";
import {
  openDbForIngest,
  type CompaniesDbDriver,
  type CompanyInsert,
  type DatasetMetaInput,
} from "@/lib/db";

export interface BuildIndexOptions {
  rows: CompanyInsert[];
  meta: DatasetMetaInput;
  /** Final path e.g. data/companies.sqlite */
  dbPath: string;
}

export interface BuildIndexResult {
  dbPath: string;
  bakPath: string | null;
  rowCount: number;
  ftsEnabled: boolean;
  driver: CompaniesDbDriver;
}

/**
 * Atomically replace companies.sqlite; keep previous as .bak.
 */
export function atomicReplaceDb(
  tmpPath: string,
  finalPath: string,
): string | null {
  const dir = path.dirname(finalPath);
  fs.mkdirSync(dir, { recursive: true });

  const bakPath = `${finalPath}.bak`;
  let wroteBak: string | null = null;

  if (fs.existsSync(finalPath)) {
    if (fs.existsSync(bakPath)) {
      fs.unlinkSync(bakPath);
    }
    fs.renameSync(finalPath, bakPath);
    wroteBak = bakPath;
  }

  fs.renameSync(tmpPath, finalPath);
  return wroteBak;
}

export async function buildCompaniesIndex(
  options: BuildIndexOptions,
): Promise<BuildIndexResult> {
  const { rows, meta, dbPath } = options;
  if (rows.length === 0) {
    throw new Error("Aborting ingest: zero company rows after parse");
  }

  const resolved = path.resolve(dbPath);
  const tmpPath = `${resolved}.tmp`;

  if (fs.existsSync(tmpPath)) {
    fs.unlinkSync(tmpPath);
  }

  const db = await openDbForIngest(tmpPath);
  let ftsEnabled = false;
  const driver = db.driver;
  try {
    db.clearCompanies();
    db.insertCompanies(rows);
    db.upsertDatasetMeta({
      ...meta,
      row_count: rows.length,
    });
    ftsEnabled = db.hasFts();
  } finally {
    db.close();
  }

  const bakPath = atomicReplaceDb(tmpPath, resolved);

  return {
    dbPath: resolved,
    bakPath,
    rowCount: rows.length,
    ftsEnabled,
    driver,
  };
}

/** Schema SQL reference (mirrors lib/db.ts + FTS5). */
export const SCHEMA_SQL = `
-- See CompanyDatabase.createSchema / ensureFts in lib/db.ts
`;
