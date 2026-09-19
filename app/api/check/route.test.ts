import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/check/route";
import { clearCheckCache } from "@/lib/check-cache";
import { closeDb, openDb } from "@/lib/db";
import { normalizeCompanyName } from "@/lib/normalize";
import { resetRateLimits } from "@/lib/rate-limit";

async function seedDb(dbPath: string): Promise<void> {
  const db = await openDb(dbPath);
  const rows = [
    {
      cin: "U72900KA2015PTC000001",
      name: "ACME Private Limited",
    },
    {
      cin: "U72900KA2016PTC000002",
      name: "ACME PVT LTD",
    },
    {
      cin: "U72200MH2018PTC000004",
      name: "Tekno Solutions Private Limited",
    },
    {
      cin: "U72200MH2019PTC000005",
      name: "Techno Solutions Private Limited",
    },
    {
      cin: "U74999DL2020PTC000006",
      name: "Zephyr Quill Analytics Private Limited",
    },
  ].map((row) => ({
    ...row,
    normalized_name: normalizeCompanyName(row.name),
    status: "Active",
    company_class: "Private",
    state: "Test",
    registered_on: "2020-01-01",
  }));

  db.clearCompanies();
  db.insertCompanies(rows);
  db.upsertDatasetMeta({
    source_name: "api test fixtures",
    source_url: "file://api-test",
    snapshot_label: "api-test",
    snapshot_at: "2026-09-19",
    ingested_at: new Date().toISOString(),
    row_count: rows.length,
  });
  db.close();
  closeDb();
}

function makeRequest(body: unknown, ip = "203.0.113.10"): NextRequest {
  return new NextRequest("http://localhost/api/check", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/check", () => {
  let dbPath: string;

  beforeEach(async () => {
    resetRateLimits();
    clearCheckCache();
    closeDb();
    dbPath = path.join(
      os.tmpdir(),
      `common-name-api-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`,
    );
    process.env.COMPANIES_DB_PATH = dbPath;
    process.env.RATE_LIMIT_MAX = "30";
    process.env.RATE_LIMIT_WINDOW_MS = "900000";
    await seedDb(dbPath);
  });

  afterEach(() => {
    closeDb();
    clearCheckCache();
    resetRateLimits();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    delete process.env.COMPANIES_DB_PATH;
  });

  it("returns EXACT_TAKEN for ACME", async () => {
    const res = await POST(makeRequest({ name: "ACME Private Limited" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.signal.code).toBe("EXACT_TAKEN");
    expect(json.signal.exactCount).toBeGreaterThanOrEqual(2);
    expect(json.links.mcaVerify).toContain("mca.gov.in");
    expect(json.disclaimer).toMatch(/snapshot uniqueness signal/i);
    expect(json.meta.snapshotLabel).toBe("api-test");
  });

  it("returns SIMILAR for Tekno vs Techno", async () => {
    // Drop exact Tekno row so query stays in the fuzzy band.
    closeDb();
    const db = await openDb(dbPath);
    db.exec("DELETE FROM companies WHERE cin = ?", ["U72200MH2018PTC000004"]);
    const remaining = db.countCompanies();
    db.upsertDatasetMeta({
      source_name: "api test fixtures",
      source_url: "file://api-test",
      snapshot_label: "api-test",
      snapshot_at: "2026-09-19",
      ingested_at: new Date().toISOString(),
      row_count: remaining,
    });
    db.close();
    closeDb();
    clearCheckCache();

    const res = await POST(makeRequest({ name: "Tekno Solutions" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.signal.code).toBe("SIMILAR");
    expect(json.signal.similarCount).toBeGreaterThanOrEqual(1);
    expect(
      json.matches.some((m: { name: string }) =>
        m.name.toLowerCase().includes("techno"),
      ),
    ).toBe(true);
  });

  it("returns LIKELY_UNIQUE for sparse name", async () => {
    const res = await POST(
      makeRequest({ name: "Xylophone Nebula Trading Works" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.signal.code).toBe("LIKELY_UNIQUE");
    expect(json.matches).toEqual([]);
  });

  it("returns 400 for invalid body", async () => {
    const res = await POST(makeRequest({ name: "x" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for suffix-only name", async () => {
    const res = await POST(makeRequest({ name: "Private Limited" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 503 when index empty — never LIKELY_UNIQUE", async () => {
    closeDb();
    const emptyPath = path.join(
      os.tmpdir(),
      `common-name-empty-${Date.now()}.sqlite`,
    );
    process.env.COMPANIES_DB_PATH = emptyPath;
    const db = await openDb(emptyPath);
    db.upsertDatasetMeta({
      source_name: "empty",
      source_url: "file://empty",
      snapshot_label: "empty",
      snapshot_at: "2026-09-19",
      ingested_at: new Date().toISOString(),
      row_count: 0,
    });
    db.close();
    closeDb();

    const res = await POST(makeRequest({ name: "Anything Unique Corp" }));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error.code).toBe("INDEX_UNAVAILABLE");
    expect(json.signal).toBeUndefined();

    fs.unlinkSync(emptyPath);
    process.env.COMPANIES_DB_PATH = dbPath;
  });

  it("returns 429 after burst", async () => {
    process.env.RATE_LIMIT_MAX = "3";
    resetRateLimits();
    const ip = "198.51.100.50";

    expect((await POST(makeRequest({ name: "ACME" }, ip))).status).toBe(200);
    expect((await POST(makeRequest({ name: "ACME" }, ip))).status).toBe(200);
    expect((await POST(makeRequest({ name: "ACME" }, ip))).status).toBe(200);

    const limited = await POST(makeRequest({ name: "ACME" }, ip));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeTruthy();
    const json = await limited.json();
    expect(json.error.code).toBe("RATE_LIMITED");
  });

  it("returns 400 for non-JSON body", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/check", {
        method: "POST",
        headers: {
          "content-type": "text/plain",
          "x-forwarded-for": "203.0.113.99",
        },
        body: "not-json",
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when name field missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.details).toBeDefined();
  });

  it("returns 400 when name exceeds 120 chars", async () => {
    const res = await POST(makeRequest({ name: "A".repeat(121) }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("serves cached result for same normalized query", async () => {
    const first = await POST(makeRequest({ name: "ACME Private Limited" }));
    expect(first.status).toBe(200);
    const firstJson = await first.json();

    const second = await POST(makeRequest({ name: "ACME PVT LTD" }));
    expect(second.status).toBe(200);
    const secondJson = await second.json();

    expect(secondJson.signal.code).toBe(firstJson.signal.code);
    expect(secondJson.query.normalized).toBe("acme");
    expect(secondJson.query.raw).toBe("ACME PVT LTD");
  });

  it("uses x-real-ip when forwarded-for absent", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/check", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-real-ip": "203.0.113.77",
        },
        body: JSON.stringify({ name: "ACME" }),
      }),
    );
    expect(res.status).toBe(200);
  });
});
