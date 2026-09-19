import { closeDb, openDb } from "../lib/db";
import { matchCompanyName } from "../lib/match";

async function main(): Promise<void> {
  const dbPath = process.env.COMPANIES_DB_PATH ?? "./data/companies.sqlite";
  const name = process.argv[2] ?? "MANDOVI PELLETS LIMITED";
  const db = await openDb(dbPath);
  try {
    const outcome = matchCompanyName(db, name);
    console.log(
      JSON.stringify(
        {
          code: outcome.signal.code,
          message: outcome.signal.message,
          top: outcome.matches[0]?.name ?? null,
          snapshotLabel: outcome.meta.snapshotLabel,
          snapshotAt: outcome.meta.snapshotAt,
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

void main();
