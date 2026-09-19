/**
 * On Render (or BAKE_OGD=1), replace fixture index with public Goa OGD seed.
 * Lets deploy work even if service buildCommand still calls db:fixture first.
 */

import { spawnSync } from "node:child_process";

const shouldBake =
  process.env.BAKE_OGD === "1" ||
  process.env.RENDER === "true" ||
  Boolean(process.env.RENDER);

if (!shouldBake) {
  process.exit(0);
}

console.info(
  JSON.stringify({
    level: "info",
    code: "BAKE_OGD_START",
    render: process.env.RENDER ?? null,
  }),
);

for (const script of [
  "scripts/ingest-ogd-goa.ts",
  "scripts/write-seed-artifact.ts",
]) {
  const result = spawnSync("pnpm", ["exec", "tsx", script], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.info(JSON.stringify({ level: "info", code: "BAKE_OGD_DONE" }));
