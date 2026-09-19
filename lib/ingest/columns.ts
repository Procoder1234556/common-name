/**
 * Flexible OGD / Company Master column aliases (BACKEND_STRUCTURE.md §8).
 * Exact headers vary by catalog snapshot — map by normalized header text.
 */

export type IngestField =
  "cin" | "name" | "status" | "company_class" | "state" | "registered_on";

/** Headers that must never be imported (director / PII sheets). */
export const FORBIDDEN_HEADER_PATTERNS = [
  /\bdirector\b/i,
  /\bdin\b/i,
  /\bdpin\b/i,
  /\bemail\b/i,
  /\bmobile\b/i,
  /\bphone\b/i,
  /\bresidential\b/i,
  /\bshareholder\b/i,
  /\bsignatory\b/i,
  /\bpan\b/i,
  /\baadhaar\b/i,
] as const;

const FIELD_ALIASES: Record<IngestField, string[]> = {
  cin: [
    "cin",
    "corporate identification number",
    "corporate_identification_number",
    "company cin",
    "company_cin",
    "llpin",
    "llp identification number",
  ],
  name: [
    "company name",
    "company_name",
    "companyname",
    "name of the company",
    "name",
    "llp name",
    "entity name",
  ],
  status: [
    "company status",
    "company_status",
    "companystatus",
    "status",
    "company status(forefill)",
    "llp status",
  ],
  company_class: [
    "company class",
    "company_class",
    "companyclass",
    "class",
    "class of company",
    "entity class",
  ],
  state: [
    "registered state",
    "registered_state",
    "state",
    "company state",
    "company state code",
    "companystatecode",
    "state code",
  ],
  registered_on: [
    "date of registration",
    "date_of_registration",
    "date of incorporation",
    "date_of_incorporation",
    "registration date",
    "companyregistrationdate date",
    "companyregistrationdate_date",
    "incorporated on",
    "registered_on",
  ],
};

export function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/[^a-z0-9\s()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isForbiddenHeader(header: string): boolean {
  const normalized = normalizeHeader(header);
  return FORBIDDEN_HEADER_PATTERNS.some((pattern) => pattern.test(normalized));
}

export type ColumnMap = Partial<Record<IngestField, number>>;

/**
 * Map CSV header row indexes to ingest fields.
 * First matching alias wins per field; forbidden headers are skipped.
 */
export function mapHeaders(headers: string[]): ColumnMap {
  const map: ColumnMap = {};
  const normalizedHeaders = headers.map((h) => normalizeHeader(h));

  for (let i = 0; i < normalizedHeaders.length; i += 1) {
    const header = normalizedHeaders[i] ?? "";
    if (!header || isForbiddenHeader(headers[i] ?? header)) {
      continue;
    }

    for (const field of Object.keys(FIELD_ALIASES) as IngestField[]) {
      if (map[field] !== undefined) continue;
      const aliases = FIELD_ALIASES[field];
      if (aliases.includes(header)) {
        map[field] = i;
        break;
      }
    }
  }

  return map;
}

export function assertRequiredColumns(map: ColumnMap): void {
  if (map.cin === undefined || map.name === undefined) {
    throw new Error(
      "CSV missing required columns (need CIN + Company Name). " +
        `Resolved map: ${JSON.stringify(map)}`,
    );
  }
}
