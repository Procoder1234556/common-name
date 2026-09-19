/**
 * Ensure SQLite index exists at COMPANIES_DB_PATH.
 * If missing (empty Render disk), copy baked seed from build artifact.
 * Never downloads OGD / never hits MCA.
 */

import fs from "node:fs";
import path from "node:path";

function main(): void {
  const target = path.resolve(
    process.env.COMPANIES_DB_PATH?.trim() ||
      path.join(process.cwd(), "data", "companies.sqlite"),
  );
  const seed = path.resolve(
    process.env.COMPANIES_DB_SEED?.trim() ||
      path.join(process.cwd(), "data", "companies.sqlite.seed"),
  );

  if (fs.existsSync(target) && fs.statSync(target).size > 0) {
    console.info(
      JSON.stringify({
        level: "info",
        code: "DB_SEED_SKIP",
        target,
        reason: "already_present",
      }),
    );
    return;
  }

  if (!fs.existsSync(seed) || fs.statSync(seed).size === 0) {
    console.warn(
      JSON.stringify({
        level: "warn",
        code: "DB_SEED_MISSING",
        target,
        seed,
      }),
    );
    return;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(seed, target);
  console.info(
    JSON.stringify({
      level: "info",
      code: "DB_SEED_COPIED",
      target,
      seed,
      bytes: fs.statSync(target).size,
    }),
  );
}

main();
