export {
  assertIngestAllowed,
  IngestGateError,
  type IngestGateResult,
  type IngestMode,
} from "@/lib/ingest/gate";
export {
  resolveArtifact,
  sha256File,
  selectCsvEntriesFromZip,
  type ResolvedArtifact,
} from "@/lib/ingest/artifact";
export {
  mapHeaders,
  normalizeHeader,
  isForbiddenHeader,
  assertRequiredColumns,
  type ColumnMap,
  type IngestField,
} from "@/lib/ingest/columns";
export { parseCsv, stripControlChars } from "@/lib/ingest/csv";
export {
  parseCompaniesCsv,
  type ParseCompaniesResult,
} from "@/lib/ingest/parse-companies";
export {
  buildCompaniesIndex,
  atomicReplaceDb,
  SCHEMA_SQL,
  type BuildIndexOptions,
  type BuildIndexResult,
} from "@/lib/ingest/build-db";
export {
  buildCompaniesIndexFromApi,
  type BuildApiIndexOptions,
  type BuildApiIndexResult,
} from "@/lib/ingest/build-api-index";
export {
  mapOgdApiRecord,
  fetchOgdApiPage,
  DEFAULT_OGD_RESOURCE_ID,
  OGD_API_SOURCE_URL,
} from "@/lib/ingest/ogd-api";
