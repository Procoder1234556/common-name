/**
 * Map CSV rows → company inserts (name-level fields only).
 */

import {
  assertRequiredColumns,
  mapHeaders,
  type ColumnMap,
} from "@/lib/ingest/columns";
import { parseCsv, stripControlChars } from "@/lib/ingest/csv";
import { normalizeCompanyName } from "@/lib/normalize";
import type { CompanyInsert } from "@/lib/db";

export interface ParseCompaniesResult {
  rows: CompanyInsert[];
  skippedMissing: number;
  skippedNormalizeEmpty: number;
  skippedDuplicateCin: number;
  headers: string[];
  columnMap: ColumnMap;
}

function cellAt(row: string[], index: number | undefined): string {
  if (index === undefined) return "";
  return stripControlChars(row[index] ?? "");
}

export function parseCompaniesCsv(text: string): ParseCompaniesResult {
  const table = parseCsv(text);
  if (table.length < 2) {
    throw new Error("CSV has no data rows");
  }

  const headers = table[0]!;
  const columnMap = mapHeaders(headers);
  assertRequiredColumns(columnMap);

  const rows: CompanyInsert[] = [];
  const seenCin = new Set<string>();
  let skippedMissing = 0;
  let skippedNormalizeEmpty = 0;
  let skippedDuplicateCin = 0;

  for (let r = 1; r < table.length; r += 1) {
    const row = table[r]!;
    const cin = cellAt(row, columnMap.cin).toUpperCase();
    const name = cellAt(row, columnMap.name);

    if (!cin || !name) {
      skippedMissing += 1;
      continue;
    }

    if (seenCin.has(cin)) {
      skippedDuplicateCin += 1;
      continue;
    }

    const normalized = normalizeCompanyName(name);
    if (!normalized) {
      skippedNormalizeEmpty += 1;
      continue;
    }

    seenCin.add(cin);
    rows.push({
      cin,
      name,
      normalized_name: normalized,
      status: cellAt(row, columnMap.status) || null,
      company_class: cellAt(row, columnMap.company_class) || null,
      state: cellAt(row, columnMap.state) || null,
      registered_on: cellAt(row, columnMap.registered_on) || null,
    });
  }

  return {
    rows,
    skippedMissing,
    skippedNormalizeEmpty,
    skippedDuplicateCin,
    headers,
    columnMap,
  };
}
