/**
 * One-shot helper — regenerate data/fixtures/ogd-sample.csv from sample-companies.json
 */
import fs from "node:fs";
import path from "node:path";

interface Row {
  cin: string;
  name: string;
  status?: string;
  company_class?: string;
  state?: string;
  registered_on?: string;
}

function esc(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

const src = path.resolve("data/fixtures/sample-companies.json");
const dest = path.resolve("data/fixtures/ogd-sample.csv");
const rows = JSON.parse(fs.readFileSync(src, "utf8")) as Row[];

const headers = [
  "CIN",
  "Company Name",
  "Company Status",
  "Company Class",
  "Registered State",
  "Date of Registration",
  "Director Name",
];

const lines = [headers.join(",")];
for (const r of rows) {
  lines.push(
    [
      esc(r.cin),
      esc(r.name),
      esc(r.status ?? ""),
      esc(r.company_class ?? ""),
      esc(r.state ?? ""),
      esc(r.registered_on ?? ""),
      esc("SHOULD_NOT_IMPORT"),
    ].join(","),
  );
}

fs.writeFileSync(dest, `${lines.join("\n")}\n`);
console.log(`Wrote ${rows.length} rows → ${dest}`);
