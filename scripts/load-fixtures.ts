import path from "node:path";
import { closeDb, openDb, type CompanyInsert } from "../lib/db";
import { normalizeCompanyName } from "../lib/normalize";
import fs from "node:fs";

interface FixtureCompany {
  cin: string;
  name: string;
  status?: string | null;
  company_class?: string | null;
  state?: string | null;
  registered_on?: string | null;
}

function loadFixtureFile(): FixtureCompany[] {
  const fixturePath = path.resolve(
    process.cwd(),
    "data",
    "fixtures",
    "sample-companies.json",
  );
  const raw = fs.readFileSync(fixturePath, "utf8");
  const parsed = JSON.parse(raw) as FixtureCompany[];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Fixture file is empty or invalid");
  }
  return parsed;
}

async function main(): Promise<void> {
  const fixtures = loadFixtureFile();
  const dbPath =
    process.env.COMPANIES_DB_PATH ??
    path.resolve(process.cwd(), "data", "companies.sqlite");

  const db = await openDb(dbPath);
  try {
    db.createSchema();
    db.clearCompanies();

    const rows: CompanyInsert[] = [];
    for (const item of fixtures) {
      const normalized = normalizeCompanyName(item.name);
      if (!normalized) {
        throw new Error(
          `Fixture name normalized to empty string: ${item.name}`,
        );
      }
      rows.push({
        cin: item.cin,
        name: item.name,
        normalized_name: normalized,
        status: item.status ?? null,
        company_class: item.company_class ?? null,
        state: item.state ?? null,
        registered_on: item.registered_on ?? null,
      });
    }

    const inserted = db.insertCompanies(rows);
    const now = new Date().toISOString();

    db.upsertDatasetMeta({
      source_name: "Synthetic fixtures (sample-companies.json)",
      source_url: "file://data/fixtures/sample-companies.json",
      snapshot_label: "fixtures-dev",
      snapshot_at: "2026-09-19",
      ingested_at: now,
      row_count: inserted,
      checksum_sha256: null,
      notes:
        "Development-only synthetic names. No OGD download. No director fields. Driver: sql.js (Phase 1 Windows-safe).",
    });

    const counted = db.countCompanies();
    console.log(
      JSON.stringify(
        {
          ok: true,
          dbPath,
          driver: "sql.js",
          inserted,
          counted,
          sampleNormalized: rows.slice(0, 3).map((r) => ({
            name: r.name,
            normalized_name: r.normalized_name,
          })),
        },
        null,
        2,
      ),
    );
  } finally {
    db.close();
    closeDb();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
