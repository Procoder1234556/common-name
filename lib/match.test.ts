import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, openDb, type CompanyDatabase } from "@/lib/db";
import {
  IndexUnavailableError,
  InvalidDistinctiveNameError,
  buildSignal,
  levenshteinRatio,
  matchCompanyName,
  phoneticKey,
} from "@/lib/match";
import { normalizeCompanyName } from "@/lib/normalize";

async function createFixtureDb(
  rows: Array<{ cin: string; name: string }>,
  opts?: { skipMeta?: boolean; rowCountOverride?: number },
): Promise<{ db: CompanyDatabase; dbPath: string }> {
  const dbPath = path.join(
    os.tmpdir(),
    `common-name-match-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`,
  );
  const db = await openDb(dbPath);

  const inserts = rows.map((row) => ({
    cin: row.cin,
    name: row.name,
    normalized_name: normalizeCompanyName(row.name),
    status: "Active",
    company_class: "Private",
    state: "Karnataka",
    registered_on: "2020-01-01",
  }));

  db.clearCompanies();
  if (inserts.length > 0) {
    db.insertCompanies(inserts);
  }

  if (!opts?.skipMeta) {
    db.upsertDatasetMeta({
      source_name: "test fixtures",
      source_url: "file://test",
      snapshot_label: "test-snapshot",
      snapshot_at: "2026-09-19",
      ingested_at: new Date().toISOString(),
      row_count: opts?.rowCountOverride ?? inserts.length,
      notes: "match unit test",
    });
  }

  return { db, dbPath };
}

describe("matchCompanyName", () => {
  let db: CompanyDatabase | undefined;
  let dbPath: string | undefined;

  afterEach(() => {
    if (db) {
      db.close();
      db = undefined;
    }
    closeDb();
    if (dbPath && fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      dbPath = undefined;
    }
  });

  it("maps ACME suffix variants to EXACT_TAKEN", async () => {
    const created = await createFixtureDb([
      { cin: "C1", name: "ACME Private Limited" },
      { cin: "C2", name: "ACME PVT LTD" },
      { cin: "C3", name: "Acme Private Limited" },
    ]);
    db = created.db;
    dbPath = created.dbPath;

    const result = matchCompanyName(db, "ACME Private Limited");
    expect(result.signal.code).toBe("EXACT_TAKEN");
    expect(result.signal.exactCount).toBe(3);
    expect(result.query.normalized).toBe("acme");
    expect(result.matches.every((m) => m.matchType === "exact")).toBe(true);
    expect(result.matches.map((m) => m.cin).sort()).toEqual(["C1", "C2", "C3"]);
  });

  it("marks Tekno ↔ Techno as SIMILAR with deterministic ordering", async () => {
    // Index has Techno only — query Tekno must be fuzzy, not exact.
    const created = await createFixtureDb([
      { cin: "T1", name: "Techno Solutions Private Limited" },
      { cin: "U1", name: "Unrelated Maple Drift Consulting Private Limited" },
    ]);
    db = created.db;
    dbPath = created.dbPath;

    const result = matchCompanyName(db, "Tekno Solutions");
    expect(result.signal.code).toBe("SIMILAR");
    expect(result.signal.exactCount).toBe(0);
    expect(result.signal.similarCount).toBeGreaterThanOrEqual(1);

    const techno = result.matches.find((m) => m.cin === "T1");
    expect(techno).toBeDefined();
    expect(techno?.matchType).toBe("similar");
    expect(techno!.score).toBeGreaterThanOrEqual(0.6);

    // Score desc, then name asc — stable across runs.
    const scores = result.matches.map((m) => m.score);
    const sorted = [...scores].sort((a, b) => b - a);
    expect(scores).toEqual(sorted);
  });

  it("returns LIKELY_UNIQUE for sparse unrelated name", async () => {
    const created = await createFixtureDb([
      { cin: "A1", name: "ACME Private Limited" },
      { cin: "Z1", name: "Zephyr Quill Analytics Private Limited" },
    ]);
    db = created.db;
    dbPath = created.dbPath;

    const result = matchCompanyName(db, "Xylophone Nebula Trading Works");
    expect(result.signal.code).toBe("LIKELY_UNIQUE");
    expect(result.signal.exactCount).toBe(0);
    expect(result.signal.similarCount).toBe(0);
    expect(result.matches).toEqual([]);
  });

  it("fails closed when index meta missing", async () => {
    const created = await createFixtureDb(
      [{ cin: "A1", name: "ACME Private Limited" }],
      { skipMeta: true },
    );
    db = created.db;
    dbPath = created.dbPath;
    db.exec("DELETE FROM dataset_meta");

    expect(() => matchCompanyName(db!, "ACME")).toThrow(IndexUnavailableError);
  });

  it("fails closed when row_count is 0", async () => {
    const created = await createFixtureDb([], {
      rowCountOverride: 0,
    });
    db = created.db;
    dbPath = created.dbPath;
    db.upsertDatasetMeta({
      source_name: "empty",
      source_url: "file://empty",
      snapshot_label: "empty",
      snapshot_at: "2026-09-19",
      ingested_at: new Date().toISOString(),
      row_count: 0,
    });

    expect(() => matchCompanyName(db!, "Anything Unique")).toThrow(
      IndexUnavailableError,
    );
  });

  it("rejects suffix-only distinctive name", async () => {
    const created = await createFixtureDb([
      { cin: "A1", name: "ACME Private Limited" },
    ]);
    db = created.db;
    dbPath = created.dbPath;

    expect(() => matchCompanyName(db!, "Private Limited")).toThrow(
      InvalidDistinctiveNameError,
    );
  });
});

describe("matchCompanyName extras", () => {
  let db: CompanyDatabase | undefined;
  let dbPath: string | undefined;

  afterEach(() => {
    if (db) {
      db.close();
      db = undefined;
    }
    closeDb();
    if (dbPath && fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      dbPath = undefined;
    }
  });

  it("ranks equal-score similars by name ascending", async () => {
    const created = await createFixtureDb([
      { cin: "B1", name: "Beta Twin Consulting Private Limited" },
      { cin: "A1", name: "Alpha Twin Consulting Private Limited" },
    ]);
    db = created.db;
    dbPath = created.dbPath;

    const result = matchCompanyName(db, "Alfa Twin Consulting");
    expect(result.signal.code).toBe("SIMILAR");
    expect(result.matches.length).toBeGreaterThanOrEqual(2);
    const names = result.matches.map((m) => m.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    // Within same score band, name order is stable ascending.
    expect(names[0]! <= names[1]!).toBe(true);
    expect(sorted).toContain(names[0]);
  });

  it("returns empty candidates for ultra-short distinctive tokens", async () => {
    const created = await createFixtureDb([
      { cin: "A1", name: "ACME Private Limited" },
    ]);
    db = created.db;
    dbPath = created.dbPath;

    // Normalized "xy" has no token ≥ 3 — candidate prefilter empty → unique.
    const result = matchCompanyName(db, "XY");
    expect(result.query.normalized).toBe("xy");
    expect(result.signal.code).toBe("LIKELY_UNIQUE");
    expect(result.matches).toEqual([]);
  });

  it("findCandidateMatches uses LIKE when FTS absent or skipped", async () => {
    const created = await createFixtureDb([
      { cin: "T1", name: "Techno Solutions Private Limited" },
    ]);
    db = created.db;
    dbPath = created.dbPath;

    const { findCandidateMatches } = await import("@/lib/match");
    const rows = findCandidateMatches(db, "techno solutions");
    expect(rows.some((r) => r.cin === "T1")).toBe(true);
  });
});

describe("match helpers", () => {
  it("buildSignal maps counts to codes", () => {
    expect(buildSignal(2, 0).code).toBe("EXACT_TAKEN");
    expect(buildSignal(0, 3).code).toBe("SIMILAR");
    expect(buildSignal(0, 0).code).toBe("LIKELY_UNIQUE");
    expect(buildSignal(1, 5).code).toBe("EXACT_TAKEN");
  });

  it("phoneticKey groups Tekno/Techno", () => {
    expect(phoneticKey("tekno solutions")).toBe(
      phoneticKey("techno solutions"),
    );
  });

  it("levenshteinRatio is high for near spellings", () => {
    expect(
      levenshteinRatio("tekno solutions", "techno solutions"),
    ).toBeGreaterThan(0.8);
    expect(levenshteinRatio("acme", "acme")).toBe(1);
    expect(levenshteinRatio("", "x")).toBe(0);
  });

  it("buildFtsMatchQuery quotes cleaned tokens", async () => {
    const { buildFtsMatchQuery } = await import("@/lib/match");
    expect(buildFtsMatchQuery(["tekno", "solutions"])).toBe(
      '"tekno" OR "solutions"',
    );
    expect(buildFtsMatchQuery(["ab", "cd"])).toBe("");
  });
});

describe("openDb lifecycle", () => {
  beforeEach(() => {
    closeDb();
  });

  afterEach(() => {
    closeDb();
  });

  it("opens without throwing", async () => {
    const dbPath = path.join(
      os.tmpdir(),
      `common-name-open-${Date.now()}.sqlite`,
    );
    const db = await openDb(dbPath);
    expect(db.countCompanies()).toBe(0);
    db.close();
    fs.unlinkSync(dbPath);
  });
});
