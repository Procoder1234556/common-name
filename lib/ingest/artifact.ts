/**
 * Resolve OGD artifact: local file or confirmed HTTPS download into data/raw/.
 */

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { unzipSync } from "fflate";
import type { IngestGateResult } from "@/lib/ingest/gate";

const DIRECTOR_SHEET_NAME =
  /director|signatory|din|dpin|shareholder|charge.?detail/i;

export interface ResolvedArtifact {
  /** Path to a single CSV ready to parse (may be extracted under data/raw/). */
  csvPath: string;
  /** Path of the original ZIP/CSV used for checksum. */
  sourcePath: string;
  checksumSha256: string;
  sourceLabel: string;
}

export function sha256File(filePath: string): string {
  const hash = createHash("sha256");
  const fd = fs.openSync(filePath, "r");
  try {
    const buf = Buffer.alloc(1024 * 1024);
    let bytes = 0;
    while ((bytes = fs.readSync(fd, buf, 0, buf.length, null)) > 0) {
      hash.update(buf.subarray(0, bytes));
    }
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest("hex");
}

function ensureRawDir(): string {
  const rawDir = path.resolve(process.cwd(), "data", "raw");
  fs.mkdirSync(rawDir, { recursive: true });
  return rawDir;
}

async function downloadToRaw(url: string): Promise<string> {
  const rawDir = ensureRawDir();
  const urlPath = new URL(url).pathname;
  const base =
    path.basename(urlPath).replace(/[^\w.-]+/g, "_") || "ogd-download.bin";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = path.join(rawDir, `${stamp}-${base}`);

  const response = await fetch(url, {
    redirect: "follow",
    headers: { Accept: "application/zip,text/csv,*/*" },
  });
  if (!response.ok) {
    throw new Error(
      `OGD download failed: HTTP ${response.status} ${response.statusText}`,
    );
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) {
    throw new Error("OGD download returned empty body");
  }
  fs.writeFileSync(outPath, buffer);
  return outPath;
}

function isCsvPath(filePath: string): boolean {
  return /\.csv$/i.test(filePath);
}

function isZipPath(filePath: string): boolean {
  return /\.zip$/i.test(filePath);
}

/**
 * Pick company-master CSV entries; skip director / PII sheet names.
 */
export function selectCsvEntriesFromZip(
  entries: Record<string, Uint8Array>,
): { name: string; data: Uint8Array }[] {
  const csvEntries = Object.entries(entries)
    .filter(([name]) => isCsvPath(name) && !name.endsWith("/"))
    .filter(([name]) => !DIRECTOR_SHEET_NAME.test(name))
    .map(([name, data]) => ({ name, data }));

  if (csvEntries.length === 0) {
    throw new Error(
      "ZIP contains no usable company-master CSV (director sheets skipped).",
    );
  }

  // Prefer filenames that look like company master.
  const preferred = csvEntries.filter((e) =>
    /company|master|mca|ogd/i.test(e.name),
  );
  return preferred.length > 0 ? preferred : csvEntries;
}

function extractZipToCsv(zipPath: string): string {
  const rawDir = ensureRawDir();
  const zipBytes = new Uint8Array(fs.readFileSync(zipPath));
  const unzipped = unzipSync(zipBytes, {
    filter: (file) =>
      isCsvPath(file.name) &&
      !DIRECTOR_SHEET_NAME.test(file.name) &&
      file.originalSize <= 2_000_000_000,
  });

  const selected = selectCsvEntriesFromZip(unzipped);
  const first = selected[0]!;
  const base = path.basename(first.name).replace(/[^\w.-]+/g, "_");
  const outPath = path.join(
    rawDir,
    `${path.basename(zipPath, path.extname(zipPath))}-${base}`,
  );
  fs.writeFileSync(outPath, Buffer.from(first.data));

  if (selected.length > 1) {
    console.warn(
      JSON.stringify({
        level: "warn",
        msg: "Multiple CSVs in ZIP; using first preferred entry",
        chosen: first.name,
        count: selected.length,
      }),
    );
  }

  return outPath;
}

export async function resolveArtifact(
  gate: IngestGateResult,
): Promise<ResolvedArtifact> {
  let sourcePath: string;
  let sourceLabel: string;

  if (gate.mode === "local") {
    sourcePath = gate.localPath!;
    sourceLabel = `local:${path.basename(sourcePath)}`;
  } else {
    console.log(
      JSON.stringify({
        level: "info",
        msg: "Downloading OGD artifact (confirmed)",
        url: gate.downloadUrl,
      }),
    );
    sourcePath = await downloadToRaw(gate.downloadUrl!);
    sourceLabel = `download:${gate.downloadUrl}`;
  }

  const checksumSha256 = sha256File(sourcePath);
  let csvPath: string;

  if (isCsvPath(sourcePath)) {
    csvPath = sourcePath;
  } else if (isZipPath(sourcePath)) {
    csvPath = extractZipToCsv(sourcePath);
  } else {
    // Peek magic / extension-less: try ZIP then treat as CSV text.
    const head = fs.readFileSync(sourcePath).subarray(0, 4);
    const isZipMagic =
      head[0] === 0x50 &&
      head[1] === 0x4b &&
      head[2] === 0x03 &&
      head[3] === 0x04;
    if (isZipMagic) {
      csvPath = extractZipToCsv(sourcePath);
    } else {
      csvPath = sourcePath;
    }
  }

  return { csvPath, sourcePath, checksumSha256, sourceLabel };
}
