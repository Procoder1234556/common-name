/**
 * Nationwide Company Master ingest via official data.gov.in resource API.
 * Gate: CONFIRM_OGD_DOWNLOAD=yes + DATA_GOV_IN_API_KEY.
 * Optional: OGD_MAX_ROWS for smoke; OGD_RESOURCE_ID override.
 */

import {
  assertIngestAllowed,
  IngestGateError,
  buildCompaniesIndexFromApi,
} from "@/lib/ingest";
import { getDbPath } from "@/lib/db";

async function main(): Promise<void> {
  const gate = assertIngestAllowed();
  if (gate.mode !== "api" || !gate.apiKey || !gate.resourceId) {
    throw new IngestGateError(
      "This script needs CONFIRM_OGD_DOWNLOAD=yes and DATA_GOV_IN_API_KEY. " +
        "Get a free key at https://data.gov.in/ (API keys). " +
        "For ZIP/CSV use pnpm db:ingest instead.",
    );
  }

  const maxRowsRaw = process.env.OGD_MAX_ROWS?.trim();
  const maxRows = maxRowsRaw ? Number(maxRowsRaw) : undefined;
  if (maxRowsRaw && (!Number.isFinite(maxRows) || (maxRows ?? 0) <= 0)) {
    throw new Error("OGD_MAX_ROWS must be a positive number");
  }

  const pageSize = Number(process.env.OGD_API_PAGE_SIZE?.trim() || "1000");

  console.info(
    JSON.stringify({
      level: "info",
      code: "OGD_API_INGEST_START",
      resourceId: gate.resourceId,
      maxRows: maxRows ?? null,
      pageSize,
      dbPath: getDbPath(),
    }),
  );

  const result = await buildCompaniesIndexFromApi({
    apiKey: gate.apiKey,
    resourceId: gate.resourceId,
    dbPath: getDbPath(),
    maxRows,
    pageSize,
    onProgress: ({ offset, inserted, total, pageCount }) => {
      if (inserted % 5000 < pageCount || offset === 0) {
        console.info(
          JSON.stringify({
            level: "info",
            code: "OGD_API_PROGRESS",
            offset,
            inserted,
            total,
            pageCount,
          }),
        );
      }
    },
  });

  console.log(
    JSON.stringify({
      ok: true,
      ...result,
      note: result.ftsEnabled
        ? undefined
        : "FTS5 unavailable in sql.js WASM — LIKE prefilter used",
    }),
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exit(error instanceof IngestGateError ? error.exitCode : 1);
});
