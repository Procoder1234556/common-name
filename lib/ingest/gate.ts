/**
 * Confirm-before-download / local-path gate (RESEARCH_MCA.md §5; BACKEND_STRUCTURE §12).
 */

import fs from "node:fs";
import path from "node:path";

export type IngestMode = "local" | "local-dir" | "download" | "api";

export interface IngestGateResult {
  mode: IngestMode;
  /** Absolute path for local file mode. */
  localPath?: string;
  /** Absolute directory for multi-CSV/ZIP merge. */
  localDir?: string;
  /** Direct artifact URL for download mode (never MCA portal scrape). */
  downloadUrl?: string;
  /** data.gov.in resource API key (NDSAP) — never MCA portal scrape. */
  apiKey?: string;
  /** data.gov.in resource UUID. */
  resourceId?: string;
}

export class IngestGateError extends Error {
  readonly exitCode = 1;

  constructor(message: string) {
    super(message);
    this.name = "IngestGateError";
  }
}

export function assertIngestAllowed(
  env: Record<string, string | undefined> = process.env,
): IngestGateResult {
  const confirm = env.CONFIRM_OGD_DOWNLOAD === "yes";
  const localRaw = env.OGD_LOCAL_PATH?.trim() ?? "";
  const localDirRaw = env.OGD_LOCAL_DIR?.trim() ?? "";
  const downloadUrl = env.OGD_DOWNLOAD_URL?.trim() ?? "";

  // Directory merge takes precedence when both set (nationwide drop-folder).
  if (localDirRaw.length > 0) {
    const localDir = path.resolve(localDirRaw);
    if (!fs.existsSync(localDir)) {
      throw new IngestGateError(`OGD_LOCAL_DIR does not exist: ${localDir}`);
    }
    const stat = fs.statSync(localDir);
    if (!stat.isDirectory()) {
      throw new IngestGateError(
        `OGD_LOCAL_DIR must be a directory of CSV/ZIP files: ${localDir}`,
      );
    }
    return { mode: "local-dir", localDir };
  }

  if (localRaw.length > 0) {
    const localPath = path.resolve(localRaw);
    if (!fs.existsSync(localPath)) {
      throw new IngestGateError(`OGD_LOCAL_PATH does not exist: ${localPath}`);
    }
    const stat = fs.statSync(localPath);
    if (!stat.isFile()) {
      throw new IngestGateError(
        `OGD_LOCAL_PATH must be a file (ZIP or CSV): ${localPath}`,
      );
    }
    return { mode: "local", localPath };
  }

  if (confirm) {
    const apiKey = env.DATA_GOV_IN_API_KEY?.trim() ?? "";
    const resourceId =
      env.OGD_RESOURCE_ID?.trim() || "4dbe5667-7b6b-41d7-82af-211562424d9a";

    if (apiKey.length > 0) {
      return { mode: "api", apiKey, resourceId };
    }

    if (!downloadUrl) {
      throw new IngestGateError(
        "CONFIRM_OGD_DOWNLOAD=yes needs DATA_GOV_IN_API_KEY (preferred), " +
          "OGD_DOWNLOAD_URL (ZIP/CSV HTTPS), OGD_LOCAL_PATH, or OGD_LOCAL_DIR. " +
          "Never scrape the MCA live portal.",
      );
    }
    if (!/^https:\/\//i.test(downloadUrl)) {
      throw new IngestGateError(
        "OGD_DOWNLOAD_URL must be an https:// URL to an official OGD artifact.",
      );
    }
    return { mode: "download", downloadUrl };
  }

  throw new IngestGateError(
    "Refusing OGD ingest. Set CONFIRM_OGD_DOWNLOAD=yes with DATA_GOV_IN_API_KEY " +
      "(or OGD_DOWNLOAD_URL), or set OGD_LOCAL_PATH / OGD_LOCAL_DIR to local official CSV/ZIP.",
  );
}
