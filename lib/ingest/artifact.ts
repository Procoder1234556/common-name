/**
 * Resolve OGD artifact: local file, local directory merge, or confirmed HTTPS download.
 */

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { unzipSync } from "fflate";
import type { IngestGateResult } from "@/lib/ingest/gate";

const DIRECTOR_SHEET_NAME =
  /director|signatory|din|dpin|shareholder|charge.?detail/i;

export interface ResolvedArtifact {
  /** One or more CSV paths ready to parse (may be extracted under data/raw/). */
  csvPaths: string[];
  /** Path of the original ZIP/CSV/dir used for checksum labelling. */
  sourcePath: string;
  checksumSha256: string;
  sourceLabel: string;
  fileCount: number;
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

function sha256Files(filePaths: string[]): string {
  const hash = createHash("sha256");
  for (const filePath of [...filePaths].sort()) {
    hash.update(path.basename(filePath));
    hash.update("\0");
    hash.update(sha256File(filePath));
    hash.update("\0");
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

  const preferred = csvEntries.filter((e) =>
    /company|master|mca|ogd/i.test(e.name),
  );
  return preferred.length > 0 ? preferred : csvEntries;
}

/** Extract all preferred company-master CSVs from a ZIP onto disk. */
export function extractZipToCsvPaths(zipPath: string): string[] {
  const rawDir = ensureRawDir();
  const zipBytes = new Uint8Array(fs.readFileSync(zipPath));
  const unzipped = unzipSync(zipBytes, {
    filter: (file) =>
      isCsvPath(file.name) &&
      !DIRECTOR_SHEET_NAME.test(file.name) &&
      file.originalSize <= 2_000_000_000,
  });

  const selected = selectCsvEntriesFromZip(unzipped);
  const outPaths: string[] = [];
  const zipBase = path.basename(zipPath, path.extname(zipPath));

  for (const entry of selected) {
    const base = path.basename(entry.name).replace(/[^\w.-]+/g, "_");
    const outPath = path.join(rawDir, `${zipBase}-${base}`);
    fs.writeFileSync(outPath, Buffer.from(entry.data));
    outPaths.push(outPath);
  }

  if (selected.length > 1) {
    console.info(
      JSON.stringify({
        level: "info",
        msg: "Multiple CSVs in ZIP; merging all preferred entries",
        count: selected.length,
        names: selected.map((e) => e.name),
      }),
    );
  }

  return outPaths;
}

function resolveFileToCsvPaths(sourcePath: string): string[] {
  if (isCsvPath(sourcePath)) {
    return [sourcePath];
  }
  if (isZipPath(sourcePath)) {
    return extractZipToCsvPaths(sourcePath);
  }

  const head = fs.readFileSync(sourcePath).subarray(0, 4);
  const isZipMagic =
    head[0] === 0x50 &&
    head[1] === 0x4b &&
    head[2] === 0x03 &&
    head[3] === 0x04;
  if (isZipMagic) {
    return extractZipToCsvPaths(sourcePath);
  }
  return [sourcePath];
}

function listDirArtifacts(dirPath: string): string[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile())
    .map((e) => path.join(dirPath, e.name))
    .filter((p) => isCsvPath(p) || isZipPath(p))
    .sort();

  if (files.length === 0) {
    throw new Error(`OGD_LOCAL_DIR has no .csv or .zip files: ${dirPath}`);
  }
  return files;
}

export async function resolveArtifact(
  gate: IngestGateResult,
): Promise<ResolvedArtifact> {
  if (gate.mode === "local-dir") {
    const dirPath = gate.localDir!;
    const sources = listDirArtifacts(dirPath);
    const csvPaths: string[] = [];
    for (const source of sources) {
      csvPaths.push(...resolveFileToCsvPaths(source));
    }
    if (csvPaths.length === 0) {
      throw new Error(`No CSV extracted from OGD_LOCAL_DIR: ${dirPath}`);
    }
    return {
      csvPaths,
      sourcePath: dirPath,
      checksumSha256: sha256Files(csvPaths),
      sourceLabel: `local-dir:${path.basename(dirPath)}:${csvPaths.length}files`,
      fileCount: csvPaths.length,
    };
  }

  let sourcePath: string;
  let sourceLabel: string;

  if (gate.mode === "local") {
    sourcePath = gate.localPath!;
    sourceLabel = `local:${path.basename(sourcePath)}`;
  } else if (gate.mode === "download") {
    console.log(
      JSON.stringify({
        level: "info",
        msg: "Downloading OGD artifact (confirmed)",
        url: gate.downloadUrl,
      }),
    );
    sourcePath = await downloadToRaw(gate.downloadUrl!);
    sourceLabel = `download:${gate.downloadUrl}`;
  } else {
    throw new Error(
      `resolveArtifact does not handle mode=${gate.mode} — use ingest-ogd-api for API mode`,
    );
  }

  const csvPaths = resolveFileToCsvPaths(sourcePath);
  const checksumSha256 =
    csvPaths.length === 1 ? sha256File(sourcePath) : sha256Files(csvPaths);

  return {
    csvPaths,
    sourcePath,
    checksumSha256,
    sourceLabel,
    fileCount: csvPaths.length,
  };
}
