/**
 * Ingest public Goa OGD fixture (NDSAP sample hosted on data.gov.in files).
 * Full nationwide dump still requires operator browser download + OGD_LOCAL_PATH.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";

const csv = path.resolve(
  process.cwd(),
  "data",
  "fixtures",
  "ogd-goa-mar2015.csv",
);

const env = {
  ...process.env,
  OGD_LOCAL_PATH: csv,
  OGD_SNAPSHOT_AT: process.env.OGD_SNAPSHOT_AT?.trim() || "2015-03-31",
};

const result = spawnSync("pnpm", ["exec", "tsx", "scripts/ingest-ogd.ts"], {
  env,
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
