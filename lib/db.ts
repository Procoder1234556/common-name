import fs from "node:fs";
import path from "node:path";
import initSqlJs, {
  type Database as SqlJsDatabase,
  type SqlValue,
} from "sql.js";

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

/**
 * Thin sync wrapper over sql.js.
 * Prefer better-sqlite3 when native builds work (Linux CI / VS Build Tools):
 * set COMPANIES_DB_DRIVER=better-sqlite3 after `pnpm rebuild better-sqlite3`.
 */
export class CompanyDatabase {
  private constructor(
    private readonly db: SqlJsDatabase,
    private readonly dbPath: string,
  ) {}

  static async open(dbPath = getDbPath()): Promise<CompanyDatabase> {
    const dir = path.dirname(dbPath);
    fs.mkdirSync(dir, { recursive: true });

    const SQL = await initSqlJs();
    const fileExists = fs.existsSync(dbPath);
    const db = fileExists
      ? new SQL.Database(fs.readFileSync(dbPath))
      : new SQL.Database();

    const instance = new CompanyDatabase(db, dbPath);
    instance.createSchema();
    instance.persist();
    return instance;
  }

  createSchema(): void {
    this.db.run(`
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
      );

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
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_cin
        ON companies (cin);

      CREATE INDEX IF NOT EXISTS idx_companies_normalized_name
        ON companies (normalized_name);
    `);
    this.ensureFts();
  }

  /** Optional FTS5 for token candidate prefilter (Phase 4). */
  ensureFts(): void {
    try {
      this.db.run(`
        CREATE VIRTUAL TABLE IF NOT EXISTS companies_fts USING fts5(
          normalized_name,
          name,
          tokenize = 'unicode61'
        );
      `);
    } catch (error) {
      // sql.js builds without FTS5 — LIKE prefilter still works.
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
    this.db.run("DELETE FROM companies_fts");
    this.db.run(`
      INSERT INTO companies_fts(rowid, normalized_name, name)
      SELECT id, normalized_name, name FROM companies
    `);
    this.persist();
  }

  persist(): void {
    const data = this.db.export();
    fs.writeFileSync(this.dbPath, Buffer.from(data));
  }

  close(): void {
    this.persist();
    this.db.close();
  }

  upsertDatasetMeta(meta: DatasetMetaInput): void {
    this.db.run(`DELETE FROM dataset_meta WHERE id = 1`);
    this.db.run(
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
    this.db.run("DELETE FROM companies");
    if (this.hasFts()) {
      this.db.run("DELETE FROM companies_fts");
    }
    this.persist();
  }

  insertCompanies(rows: CompanyInsert[]): number {
    const stmt = this.db.prepare(`
      INSERT INTO companies (
        cin, name, normalized_name, status, company_class, state, registered_on
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    this.db.run("BEGIN");
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
      this.db.run("COMMIT");
    } catch (error) {
      this.db.run("ROLLBACK");
      throw error;
    } finally {
      stmt.free();
    }

    this.rebuildFts();
    this.persist();
    return rows.length;
  }

  getDatasetMeta(): DatasetMeta | null {
    const result = this.db.exec("SELECT * FROM dataset_meta WHERE id = 1");
    const table = result[0];
    if (!table || table.values.length === 0) {
      return null;
    }
    return rowToObject<DatasetMeta>(table.columns, table.values[0]!);
  }

  isIndexReady(): boolean {
    const meta = this.getDatasetMeta();
    return Boolean(meta && meta.row_count > 0);
  }

  countCompanies(): number {
    const result = this.db.exec("SELECT COUNT(*) AS c FROM companies");
    const value = result[0]?.values[0]?.[0];
    return typeof value === "number" ? value : Number(value ?? 0);
  }

  /**
   * Escape hatch for Phase 2 match queries.
   */
  exec(sql: string, params: SqlValue[] = []): Record<string, SqlValue>[] {
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(params);
      const rows: Record<string, SqlValue>[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      return rows;
    } finally {
      stmt.free();
    }
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

function rowToObject<T>(columns: string[], values: SqlValue[]): T {
  const row: Record<string, SqlValue> = {};
  for (let i = 0; i < columns.length; i += 1) {
    const key = columns[i];
    if (key) {
      row[key] = values[i] ?? null;
    }
  }
  return row as T;
}
