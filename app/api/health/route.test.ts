import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";
import { closeDb, openDb } from "@/lib/db";
import { normalizeCompanyName } from "@/lib/normalize";

describe("GET /api/health", () => {
  let dbPath: string;

  beforeEach(() => {
    closeDb();
    dbPath = path.join(
      os.tmpdir(),
      `common-name-health-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`,
    );
    process.env.COMPANIES_DB_PATH = dbPath;
  });

  afterEach(() => {
    closeDb();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    delete process.env.COMPANIES_DB_PATH;
  });

  it("returns 503 when index empty", async () => {
    const db = await openDb(dbPath);
    db.close();
    closeDb();

    const res = await GET();
    expect(res.status).toBe(503);
    const json = (await res.json()) as {
      ok: boolean;
      index: { ready: boolean; rowCount: number };
    };
    expect(json.ok).toBe(false);
    expect(json.index.ready).toBe(false);
    expect(json.index.rowCount).toBe(0);
  });

  it("returns 200 when index ready with snapshot", async () => {
    const db = await openDb(dbPath);
    const rows = [
      {
        cin: "U72900KA2015PTC000001",
        name: "ACME Private Limited",
        normalized_name: normalizeCompanyName("ACME Private Limited"),
        status: "Active",
        company_class: "Private",
        state: "Test",
        registered_on: "2020-01-01",
      },
    ];
    db.clearCompanies();
    db.insertCompanies(rows);
    db.upsertDatasetMeta({
      source_name: "health test",
      source_url: "file://health-test",
      snapshot_label: "health-fixtures",
      snapshot_at: "2026-09-19",
      ingested_at: new Date().toISOString(),
      row_count: rows.length,
    });
    db.close();
    closeDb();

    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      ok: boolean;
      index: {
        ready: boolean;
        rowCount: number;
        snapshotAt: string | null;
        snapshotLabel: string | null;
      };
    };
    expect(json.ok).toBe(true);
    expect(json.index.ready).toBe(true);
    expect(json.index.rowCount).toBe(1);
    expect(json.index.snapshotAt).toBe("2026-09-19");
    expect(json.index.snapshotLabel).toBe("health-fixtures");
  });
});
