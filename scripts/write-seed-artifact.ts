import fs from "node:fs";
import path from "node:path";

const src = path.resolve(process.cwd(), "data", "companies.sqlite");
const dest = path.resolve(process.cwd(), "data", "companies.sqlite.seed");

if (!fs.existsSync(src) || fs.statSync(src).size === 0) {
  console.error("Missing data/companies.sqlite — run pnpm db:ogd-goa first");
  process.exit(1);
}

fs.copyFileSync(src, dest);
console.info(
  JSON.stringify({
    ok: true,
    dest,
    bytes: fs.statSync(dest).size,
  }),
);
