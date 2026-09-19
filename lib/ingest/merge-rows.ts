/**
 * Merge company rows across multiple CSV parses (first CIN wins).
 */

import type { CompanyInsert } from "@/lib/db";
import type { ParseCompaniesResult } from "@/lib/ingest/parse-companies";

export interface MergeCompaniesResult {
  rows: CompanyInsert[];
  skippedMissing: number;
  skippedNormalizeEmpty: number;
  skippedDuplicateCin: number;
  /** Cross-file CIN collisions (first file kept). */
  skippedCrossFileDupCin: number;
  fileCount: number;
}

export function mergeParsedCompanies(
  parsedList: ParseCompaniesResult[],
): MergeCompaniesResult {
  const rows: CompanyInsert[] = [];
  const seenCin = new Set<string>();
  let skippedMissing = 0;
  let skippedNormalizeEmpty = 0;
  let skippedDuplicateCin = 0;
  let skippedCrossFileDupCin = 0;

  for (const parsed of parsedList) {
    skippedMissing += parsed.skippedMissing;
    skippedNormalizeEmpty += parsed.skippedNormalizeEmpty;
    skippedDuplicateCin += parsed.skippedDuplicateCin;

    for (const row of parsed.rows) {
      if (seenCin.has(row.cin)) {
        skippedCrossFileDupCin += 1;
        continue;
      }
      seenCin.add(row.cin);
      rows.push(row);
    }
  }

  return {
    rows,
    skippedMissing,
    skippedNormalizeEmpty,
    skippedDuplicateCin,
    skippedCrossFileDupCin,
    fileCount: parsedList.length,
  };
}
