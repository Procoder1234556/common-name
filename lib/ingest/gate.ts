/**
 * Confirm-before-download / local-path gate (RESEARCH_MCA.md §5; BACKEND_STRUCTURE §12).
 */

import fs from "node:fs";
import path from "node:path";

export type IngestMode = "local" | "download";

export interface IngestGateResult {
  mode: IngestMode;
  /** Absolute path for local mode. */
  localPath?: string;
  /** Direct artifact URL for download mode (never MCA portal scrape). */
  downloadUrl?: string;
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
  const downloadUrl = env.OGD_DOWNLOAD_URL?.trim() ?? "";

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
    if (!downloadUrl) {
      throw new IngestGateError(
        "CONFIRM_OGD_DOWNLOAD=yes but OGD_DOWNLOAD_URL is empty. " +
          "Set OGD_LOCAL_PATH to an already-obtained ZIP/CSV, or set OGD_DOWNLOAD_URL " +
          "to the official OGD resource URL (not an MCA portal scrape).",
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
    "Refusing OGD ingest. Set CONFIRM_OGD_DOWNLOAD=yes (with OGD_DOWNLOAD_URL) " +
      "or OGD_LOCAL_PATH to a local official ZIP/CSV.",
  );
}
