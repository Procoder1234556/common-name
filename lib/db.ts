/**
 * Company name index — sql.js (dev/WASM) or better-sqlite3 (prod FTS5/BM25).
 * Set COMPANIES_DB_DRIVER=better-sqlite3 when native module loads (Linux/Render).
 */

import fs from "node:fs";
import path from "node:path";
import initSqlJs, {
  type Database as SqlJsDatabase,
  type SqlValue as SqlJsValue,
} from "sql.js";

export type SqlValue = string | number | null | Uint8Array | bigint;

export interface DatasetMeta {
  id: number;
  source_name: string;
  source_url: string;
  snapshot_label: string;
  snapshot_at: string;
  ingested_at: string;
  row_count: number;
  checksum_sha256: string | null;
  notes: string | null;
}

export interface CompanyRow {
  id: number;
  cin: string;
  name: string;
  normalized_name: string;
  status: string | null;
  company_class: string | null;
  state: string | null;
  registered_on: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatasetMetaInput {
  source_name: string;
  source_url: string;
  snapshot_label: string;
  snapshot_at: string;
  ingested_at: string;
  row_count: number;
  checksum_sha256?: string | null;
  notes?: string | null;
}

export interface CompanyInsert {
  cin: string;
  name: string;
  normalized_name: string;
  status?: string | null;
  company_class?: string | null;
  state?: string | null;
  registered_on?: string | null;
}

export type CompaniesDbDriver = "sqljs" | "better-sqlite3";

type BetterSqliteDatabase = import("better-sqlite3").Database;

type Backend =
  | { kind: "sqljs"; db: SqlJsDatabase }
  | { kind: "better-sqlite3"; db: BetterSqliteDatabase };

export function resolvePreferredDriver(
  env: Record<string, string | undefined> = process.env,
): CompaniesDbDriver {
  const raw = env.COMPANIES_DB_DRIVER?.trim().toLowerCase();
  if (raw === "better-sqlite3") return "better-sqlite3";
  return "sqljs";
}

function tryRequireBetterSqlite3(): typeof import("better-sqlite3") | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("better-sqlite3") as typeof import("better-sqlite3");
  } catch {
    return null;
  }
}

/**
 * Thin sync wrapper over sql.js or better-sqlite3.
 */
export class CompanyDatabase {
  private constructor(
    private readonly backend: Backend,
    private readonly dbPath: string,
    readonly driver: CompaniesDbDriver,
  ) {}

  static async open(dbPath = getDbPath()): Promise<CompanyDatabase> {
    const preferred = resolvePreferredDriver();
    if (preferred === "better-sqlite3") {
      try {
        return CompanyDatabase.openBetterSqlite3(dbPath);
      } catch (error) {
        console.warn(
          JSON.stringify({
            level: "warn",
            code: "BETTER_SQLITE3_FALLBACK",
            message:
              error instanceof Error ? error.message : "native open failed",
          }),
        );
      }
    }
    return CompanyDatabase.openSqlJs(dbPath);
  }

  /**
   * Prefer native SQLite for large ingest (FTS5) when safe.
   * Skip auto better-sqlite3 on win32 (ACCESS_VIOLATION on some hosts) unless
   * INGEST_USE_BETTER_SQLITE3=1 or COMPANIES_DB_DRIVER=better-sqlite3 on non-win.
   */
  static async openForIngest(dbPath = getDbPath()): Promise<CompanyDatabase> {
    const forceNative = process.env.INGEST_USE_BETTER_SQLITE3 === "1";
    const wantNative =
      forceNative ||
      (resolvePreferredDriver() === "better-sqlite3" &&
        process.platform !== "win32");

    if (wantNative) {
      try {
        return CompanyDatabase.openBetterSqlite3(dbPath);
      } catch (error) {
        console.warn(
          JSON.stringify({
            level: "warn",
            code: "INGEST_SQLJS_FALLBACK",
            message:
              error instanceof Error
                ? error.message
                : "better-sqlite3 unavailable",
          }),
        );
      }
    }
    return CompanyDatabase.openSqlJs(dbPath);
  }

  private static openBetterSqlite3(dbPath: string): CompanyDatabase {
    const Database = tryRequireBetterSqlite3();
    if (!Database) {
      throw new Error("better-sqlite3 module not loadable");
    }
    const dir = path.dirname(dbPath);
    fs.mkdirSync(dir, { recursive: true });
    const db = new Database(dbPath);
    // DELETE journal for ingest tmp files so atomic rename does not leave -wal orphans.
    // Runtime open can still use WAL via pragma after first connect if desired.
    db.pragma("journal_mode = DELETE");
    const instance = new CompanyDatabase(
      { kind: "better-sqlite3", db },
      dbPath,
      "better-sqlite3",
    );
    instance.createSchema();
    return instance;
  }

  private static async openSqlJs(dbPath: string): Promise<CompanyDatabase> {
    const dir = path.dirname(dbPath);
    fs.mkdirSync(dir, { recursive: true });

    const SQL = await initSqlJs();
    const fileExists = fs.existsSync(dbPath);
    const db = fileExists
      ? new SQL.Database(fs.readFileSync(dbPath))
      : new SQL.Database();

    const instance = new CompanyDatabase(
      { kind: "sqljs", db },
      dbPath,
      "sqljs",
    );
    instance.createSchema();
    instance.persist();
    return instance;
  }

  createSchema(): void {
    // sql.js `run()` executes only the first statement — keep statements separate.
    this.run(`
      CREATE TABLE IF NOT EXISTS dataset_meta (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        source_name TEXT NOT NULL,
        source_url TEXT NOT NULL,
        snapshot_label TEXT NOT NULL,
        snapshot_at TEXT NOT NULL,
        ingested_at TEXT NOT NULL,
        row_count INTEGER NOT NULL CHECK (row_count >= 0),
        checksum_sha256 TEXT,
        notes TEXT
      )
    `);
    this.run(`
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cin TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        normalized_name TEXT NOT NULL,
        status TEXT,
        company_class TEXT,
        state TEXT,
        registered_on TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    this.run(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_cin
        ON companies (cin)
    `);
    this.run(`
      CREATE INDEX IF NOT EXISTS idx_companies_normalized_name
        ON companies (normalized_name)
    `);
    this.ensureFts();
  }

  ensureFts(): void {
    try {
      this.run(`
        CREATE VIRTUAL TABLE IF NOT EXISTS companies_fts USING fts5(
          normalized_name,
          name,
          tokenize = 'unicode61'
        );
      `);
    } catch (error) {
      if (process.env.DEBUG_FTS === "1") {
        console.warn("FTS5 unavailable:", error);
      }
    }
  }

  hasFts(): boolean {
    const rows = this.exec(
      `SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = 'companies_fts' LIMIT 1`,
    );
    return rows.length > 0;
  }

  rebuildFts(): void {
    if (!this.hasFts()) {
      this.ensureFts();
    }
    if (!this.hasFts()) return;
    this.run("DELETE FROM companies_fts");
    this.run(`
      INSERT INTO companies_fts(rowid, normalized_name, name)
      SELECT id, normalized_name, name FROM companies
    `);
    this.persist();
  }

  persist(): void {
    if (this.backend.kind === "sqljs") {
      const data = this.backend.db.export();
      fs.writeFileSync(this.dbPath, Buffer.from(data));
      return;
    }
    // better-sqlite3 writes through to the file; checkpoint WAL for durability.
    try {
      this.backend.db.pragma("wal_checkpoint(TRUNCATE)");
    } catch {
      // ignore checkpoint errors on fresh files
    }
  }

  close(): void {
    if (this.backend.kind === "sqljs") {
      this.persist();
      this.backend.db.close();
      return;
    }
    this.persist();
    this.backend.db.close();
  }

  upsertDatasetMeta(meta: DatasetMetaInput): void {
    this.run(`DELETE FROM dataset_meta WHERE id = 1`);
    this.run(
      `
      INSERT INTO dataset_meta (
        id, source_name, source_url, snapshot_label, snapshot_at,
        ingested_at, row_count, checksum_sha256, notes
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        meta.source_name,
        meta.source_url,
        meta.snapshot_label,
        meta.snapshot_at,
        meta.ingested_at,
        meta.row_count,
        meta.checksum_sha256 ?? null,
        meta.notes ?? null,
      ],
    );
    this.persist();
  }

  clearCompanies(): void {
    this.run("DELETE FROM companies");
    if (this.hasFts()) {
      this.run("DELETE FROM companies_fts");
    }
    this.persist();
  }

  insertCompanies(
    rows: CompanyInsert[],
    options: { rebuildFts?: boolean; persist?: boolean } = {},
  ): number {
    const rebuildFts = options.rebuildFts ?? true;
    const shouldPersist = options.persist ?? true;

    if (this.backend.kind === "better-sqlite3") {
      const insert = this.backend.db.prepare(`
        INSERT OR IGNORE INTO companies (
          cin, name, normalized_name, status, company_class, state, registered_on
        ) VALUES (@cin, @name, @normalized_name, @status, @company_class, @state, @registered_on)
      `);
      const tx = this.backend.db.transaction((batch: CompanyInsert[]) => {
        for (const row of batch) {
          insert.run({
            cin: row.cin,
            name: row.name,
            normalized_name: row.normalized_name,
            status: row.status ?? null,
            company_class: row.company_class ?? null,
            state: row.state ?? null,
            registered_on: row.registered_on ?? null,
          });
        }
      });
      tx(rows);
    } else {
      const stmt = this.backend.db.prepare(`
        INSERT OR IGNORE INTO companies (
          cin, name, normalized_name, status, company_class, state, registered_on
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      this.backend.db.run("BEGIN");
      try {
        for (const row of rows) {
          stmt.run([
            row.cin,
            row.name,
            row.normalized_name,
            row.status ?? null,
            row.company_class ?? null,
            row.state ?? null,
            row.registered_on ?? null,
          ]);
        }
        this.backend.db.run("COMMIT");
      } catch (error) {
        this.backend.db.run("ROLLBACK");
        throw error;
      } finally {
        stmt.free();
      }
    }

    if (rebuildFts) {
      this.rebuildFts();
    }
    if (shouldPersist) {
      this.persist();
    }
    return rows.length;
  }

  getDatasetMeta(): DatasetMeta | null {
    const rows = this.exec("SELECT * FROM dataset_meta WHERE id = 1");
    const row = rows[0];
    if (!row) return null;
    return {
      id: Number(row.id),
      source_name: String(row.source_name),
      source_url: String(row.source_url),
      snapshot_label: String(row.snapshot_label),
      snapshot_at: String(row.snapshot_at),
      ingested_at: String(row.ingested_at),
      row_count: Number(row.row_count),
      checksum_sha256: (row.checksum_sha256 as string | null) ?? null,
      notes: (row.notes as string | null) ?? null,
    };
  }

  isIndexReady(): boolean {
    const meta = this.getDatasetMeta();
    return Boolean(meta && meta.row_count > 0);
  }

  countCompanies(): number {
    const rows = this.exec("SELECT COUNT(*) AS c FROM companies");
    const value = rows[0]?.c;
    return typeof value === "number" ? value : Number(value ?? 0);
  }

  exec(sql: string, params: SqlValue[] = []): Record<string, SqlValue>[] {
    if (this.backend.kind === "better-sqlite3") {
      const stmt = this.backend.db.prepare(sql);
      if (params.length === 0 && !/\?/u.test(sql)) {
        return stmt.all() as Record<string, SqlValue>[];
      }
      return stmt.all(...params) as Record<string, SqlValue>[];
    }

    const stmt = this.backend.db.prepare(sql);
    try {
      stmt.bind(params as SqlJsValue[]);
      const rows: Record<string, SqlValue>[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as Record<string, SqlValue>);
      }
      return rows;
    } finally {
      stmt.free();
    }
  }

  private run(sql: string, params: SqlValue[] = []): void {
    if (this.backend.kind === "better-sqlite3") {
      if (params.length === 0) {
        this.backend.db.exec(sql);
        return;
      }
      this.backend.db.prepare(sql).run(...params);
      return;
    }
    // sql.js: omit bind args when empty — [] breaks multi-statement CREATE SCHEMA.
    if (params.length === 0) {
      this.backend.db.run(sql);
      return;
    }
    this.backend.db.run(sql, params as SqlJsValue[]);
  }
}

let dbSingleton: CompanyDatabase | null = null;
let dbPromise: Promise<CompanyDatabase> | null = null;

export function getDbPath(): string {
  const configured = process.env.COMPANIES_DB_PATH;
  if (configured && configured.trim().length > 0) {
    return path.resolve(configured);
  }
  return path.resolve(process.cwd(), "data", "companies.sqlite");
}

export async function getDb(): Promise<CompanyDatabase> {
  if (dbSingleton) {
    return dbSingleton;
  }
  if (!dbPromise) {
    dbPromise = CompanyDatabase.open().then((db) => {
      dbSingleton = db;
      return db;
    });
  }
  return dbPromise;
}

export function closeDb(): void {
  if (dbSingleton) {
    dbSingleton.close();
    dbSingleton = null;
    dbPromise = null;
  }
}

/** Drop in-memory singleton so next getDb() re-reads the SQLite file (post-ingest). */
export async function reloadDb(): Promise<CompanyDatabase> {
  closeDb();
  return getDb();
}

/** @deprecated Prefer CompanyDatabase instance methods — kept for script ergonomics */
export function createSchema(db: CompanyDatabase): void {
  db.createSchema();
}

export function upsertDatasetMeta(
  db: CompanyDatabase,
  meta: DatasetMetaInput,
): void {
  db.upsertDatasetMeta(meta);
}

export function clearCompanies(db: CompanyDatabase): void {
  db.clearCompanies();
}

export function insertCompanies(
  db: CompanyDatabase,
  rows: CompanyInsert[],
): number {
  return db.insertCompanies(rows);
}

export function getDatasetMeta(db: CompanyDatabase): DatasetMeta | null {
  return db.getDatasetMeta();
}

export function isIndexReady(db: CompanyDatabase): boolean {
  return db.isIndexReady();
}

export function countCompanies(db: CompanyDatabase): number {
  return db.countCompanies();
}

export async function openDb(dbPath = getDbPath()): Promise<CompanyDatabase> {
  return CompanyDatabase.open(dbPath);
}

export async function openDbForIngest(
  dbPath = getDbPath(),
): Promise<CompanyDatabase> {
  return CompanyDatabase.openForIngest(dbPath);
}
