/**
 * Official data.gov.in Company Master resource API (NDSAP).
 * Name-level fields only — skips Registered_Office_Address and director/PII.
 * Never hits mca.gov.in.
 */

import { normalizeCompanyName } from "@/lib/normalize";
import type { CompanyInsert } from "@/lib/db";

export const DEFAULT_OGD_RESOURCE_ID = "4dbe5667-7b6b-41d7-82af-211562424d9a";

export const OGD_API_SOURCE_URL =
  "https://data.gov.in/resource/registrars-companies-roc-wise-company-master-data";

export interface OgdApiRecord {
  CIN?: string;
  CompanyName?: string;
  CompanyStatus?: string;
  CompanyClass?: string;
  CompanyStateCode?: string;
  CompanyRegistrationdate_date?: string;
  Registered_Office_Address?: string;
  [key: string]: string | undefined;
}

export interface OgdApiPage {
  total: number;
  count: number;
  offset: number;
  records: OgdApiRecord[];
}

export interface FetchOgdPageOptions {
  apiKey: string;
  resourceId?: string;
  offset: number;
  limit: number;
  fetchImpl?: typeof fetch;
}

function cell(value: string | undefined): string {
  return (value ?? "").replace(/[\u0000-\u001f]/g, " ").trim();
}

/** Map one API record → company insert (or null if unusable). */
export function mapOgdApiRecord(record: OgdApiRecord): CompanyInsert | null {
  const cin = cell(record.CIN).toUpperCase();
  const name = cell(record.CompanyName);
  if (!cin || !name) return null;

  const normalized = normalizeCompanyName(name);
  if (!normalized) return null;

  return {
    cin,
    name,
    normalized_name: normalized,
    status: cell(record.CompanyStatus) || null,
    company_class: cell(record.CompanyClass) || null,
    state: cell(record.CompanyStateCode) || null,
    registered_on: cell(record.CompanyRegistrationdate_date) || null,
  };
}

export async function fetchOgdApiPage(
  options: FetchOgdPageOptions,
): Promise<OgdApiPage> {
  const resourceId = options.resourceId?.trim() || DEFAULT_OGD_RESOURCE_ID;
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = new URL(`https://api.data.gov.in/resource/${resourceId}`);
  url.searchParams.set("api-key", options.apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("offset", String(options.offset));
  url.searchParams.set("limit", String(options.limit));

  const response = await fetchImpl(url, {
    headers: { Accept: "application/json" },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(
      `OGD API HTTP ${response.status} ${response.statusText} @ offset ${options.offset}`,
    );
  }

  const body = (await response.json()) as {
    total?: number | string;
    count?: number | string;
    records?: OgdApiRecord[];
    status?: string;
    message?: string;
  };

  if (body.status && body.status !== "ok") {
    throw new Error(
      `OGD API status=${body.status} message=${body.message ?? "unknown"}`,
    );
  }

  const records = Array.isArray(body.records) ? body.records : [];
  return {
    total: Number(body.total ?? 0),
    count: Number(body.count ?? records.length),
    offset: options.offset,
    records,
  };
}
