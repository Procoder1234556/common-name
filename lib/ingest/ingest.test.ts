import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { zipSync, strToU8, unzipSync } from "fflate";
import {
  assertIngestAllowed,
  IngestGateError,
  isForbiddenHeader,
  mapHeaders,
  parseCompaniesCsv,
  parseCsv,
  buildCompaniesIndex,
  selectCsvEntriesFromZip,
} from "@/lib/ingest";
import { openDb, closeDb } from "@/lib/db";
import { matchCompanyName } from "@/lib/match";

const tempDirs: string[] = [];

afterEach(() => {
  closeDb();
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cn-ingest-"));
  tempDirs.push(dir);
  return dir;
}

describe("ingest gate", () => {
  it("exits closed without confirm or local path", () => {
    expect(() =>
      assertIngestAllowed({
        CONFIRM_OGD_DOWNLOAD: "no",
        OGD_LOCAL_PATH: "",
      }),
    ).toThrow(IngestGateError);
  });

  it("allows OGD_LOCAL_PATH when file exists", () => {
    const dir = tempDir();
    const file = path.join(dir, "sample.csv");
    fs.writeFileSync(file, "CIN,Company Name\nU1,Acme\n");
    const result = assertIngestAllowed({
      CONFIRM_OGD_DOWNLOAD: "no",
      OGD_LOCAL_PATH: file,
    });
    expect(result.mode).toBe("local");
    expect(result.localPath).toBe(path.resolve(file));
  });

  it("requires OGD_DOWNLOAD_URL when confirm=yes", () => {
    expect(() =>
      assertIngestAllowed({
        CONFIRM_OGD_DOWNLOAD: "yes",
        OGD_LOCAL_PATH: "",
        OGD_DOWNLOAD_URL: "",
      }),
    ).toThrow(/OGD_DOWNLOAD_URL/);
  });

  it("allows confirm=yes with https download URL", () => {
    const result = assertIngestAllowed({
      CONFIRM_OGD_DOWNLOAD: "yes",
      OGD_DOWNLOAD_URL: "https://example.com/company-master.zip",
    });
    expect(result.mode).toBe("download");
  });
});

describe("columns + csv", () => {
  it("maps OGD aliases and skips director headers", () => {
    expect(isForbiddenHeader("Director Name")).toBe(true);
    const map = mapHeaders([
      "CIN",
      "Company Name",
      "Company Status",
      "Director Name",
      "Registered State",
    ]);
    expect(map.cin).toBe(0);
    expect(map.name).toBe(1);
    expect(map.status).toBe(2);
    expect(map.state).toBe(4);
  });

  it("parses quoted CSV and ignores director column values", () => {
    const text = [
      "CIN,Company Name,Company Status,Director Name",
      'U72900KA2015PTC000001,"ACME Private Limited",Active,SHOULD_NOT_IMPORT',
      ",Missing Name,Active,X",
      'U72900KA2016PTC000002,"ACME PVT LTD",Active,Y',
    ].join("\n");

    const parsed = parseCompaniesCsv(text);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.skippedMissing).toBe(1);
    expect(JSON.stringify(parsed.rows)).not.toContain("SHOULD_NOT_IMPORT");
    expect(parsed.rows[0]?.normalized_name).toBe("acme");
  });

  it("parseCsv handles doubled quotes", () => {
    const rows = parseCsv('a,b\n"1,""x""",two\n');
    expect(rows[1]).toEqual(['1,"x"', "two"]);
  });
});

describe("zip entry selection", () => {
  it("skips director sheet names", () => {
    const selected = selectCsvEntriesFromZip({
      "company_master.csv": strToU8("CIN,Company Name\n"),
      "directors.csv": strToU8("DIN,Name\n"),
    });
    expect(selected).toHaveLength(1);
    expect(selected[0]?.name).toBe("company_master.csv");
  });
});

describe("buildCompaniesIndex (local sample)", () => {
  it("atomic replace + bak + checksum meta + match works", async () => {
    const dir = tempDir();
    const dbPath = path.join(dir, "companies.sqlite");
    const fixtureCsv = path.resolve(
      process.cwd(),
      "data/fixtures/ogd-sample.csv",
    );

    // Ensure sample exists (CI / fresh clone).
    if (!fs.existsSync(fixtureCsv)) {
      throw new Error("Missing data/fixtures/ogd-sample.csv — run gen script");
    }

    const csvText = fs.readFileSync(fixtureCsv, "utf8");
    const parsed = parseCompaniesCsv(csvText);
    expect(parsed.rows.length).toBeGreaterThan(20);

    // Seed an old DB so bak is written.
    const first = await buildCompaniesIndex({
      rows: parsed.rows.slice(0, 5),
      dbPath,
      meta: {
        source_name: "old",
        source_url: "file://old",
        snapshot_label: "old",
        snapshot_at: "2020-01-01",
        ingested_at: new Date().toISOString(),
        row_count: 5,
        checksum_sha256: "abc",
      },
    });
    expect(first.rowCount).toBe(5);

    const second = await buildCompaniesIndex({
      rows: parsed.rows,
      dbPath,
      meta: {
        source_name: "data.gov.in Company Master Data (OGD)",
        source_url: "https://data.gov.in/catalog/company-master-data",
        snapshot_label: "OGD sample",
        snapshot_at: "2026-09-19",
        ingested_at: new Date().toISOString(),
        row_count: parsed.rows.length,
        checksum_sha256: "deadbeef",
        notes: "fixture-sized sample",
      },
    });

    expect(second.bakPath).toBe(`${dbPath}.bak`);
    expect(fs.existsSync(second.bakPath!)).toBe(true);
    expect(second.rowCount).toBe(parsed.rows.length);

    const db = await openDb(dbPath);
    try {
      expect(db.countCompanies()).toBe(parsed.rows.length);
      const meta = db.getDatasetMeta();
      expect(meta?.checksum_sha256).toBe("deadbeef");
      expect(meta?.row_count).toBe(parsed.rows.length);

      // Schema must not invent director columns.
      const cols = db.exec(`PRAGMA table_info(companies)`);
      const names = cols.map((c) => String(c.name));
      expect(names).not.toContain("director_name");
      expect(names).not.toContain("din");

      const outcome = matchCompanyName(db, "ACME Private Limited");
      expect(outcome.signal.code).toBe("EXACT_TAKEN");
    } finally {
      db.close();
      closeDb();
    }
  });

  it("aborts on zero rows", async () => {
    const dir = tempDir();
    const dbPath = path.join(dir, "companies.sqlite");
    await expect(
      buildCompaniesIndex({
        rows: [],
        dbPath,
        meta: {
          source_name: "x",
          source_url: "x",
          snapshot_label: "x",
          snapshot_at: "x",
          ingested_at: new Date().toISOString(),
          row_count: 0,
        },
      }),
    ).rejects.toThrow(/zero company rows/i);
  });

  it("ingests ZIP-wrapped sample CSV", async () => {
    const dir = tempDir();
    const csvPath = path.resolve(process.cwd(), "data/fixtures/ogd-sample.csv");
    const csvBytes = new Uint8Array(fs.readFileSync(csvPath));
    const zipped = zipSync({
      "Company_Master_Data.csv": csvBytes,
      "directors.csv": strToU8("DIN,Director Name\n1,Bad\n"),
    });
    const zipPath = path.join(dir, "ogd-sample.zip");
    fs.writeFileSync(zipPath, Buffer.from(zipped));

    const unzipped = unzipSync(new Uint8Array(fs.readFileSync(zipPath)));
    const selected = selectCsvEntriesFromZip(unzipped);
    expect(selected.some((e) => /Company_Master/i.test(e.name))).toBe(true);

    const text = Buffer.from(selected[0]!.data).toString("utf8");
    const parsed = parseCompaniesCsv(text);
    const dbPath = path.join(dir, "from-zip.sqlite");
    const result = await buildCompaniesIndex({
      rows: parsed.rows,
      dbPath,
      meta: {
        source_name: "zip sample",
        source_url: "file://zip",
        snapshot_label: "zip",
        snapshot_at: "2026-09-19",
        ingested_at: new Date().toISOString(),
        row_count: parsed.rows.length,
        checksum_sha256: "zip",
      },
    });
    expect(result.rowCount).toBeGreaterThan(20);
  });
});
