// Phase 4 — the on-device weights pull. Downloads a model from R2 (via the gated Worker stream) in small
// resumable Range chunks, verifies the whole-file sha256 (the REAL digest = manifest customMetadata.sha256,
// NOT the multipart composite — Coder-2 2026-07-04), then packs it into a device-bound .orx and deletes
// the cleartext staging file. Memory-bounded (streams to/from disk). Models are pulled ONE AT A TIME by
// the caller (Gauss fully, then Avila) so a drop never loses a finished model and the 8.29 GB transfer
// can't time out as one giant stream (the "stopped at 50%" failure).

import { packOrxToFile } from "./container-stream.js";
import { deriveKek } from "./binding.js";
import { oriroDir } from "../config/paths.js";
import { createHash } from "node:crypto";
import { open, stat, mkdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

export interface PullSpec {
  modelId: string;            // 'gauss' | 'avila'
  url: string;                // signed, Range-capable stream URL
  sizeBytes: number;          // expected total (e.g. 8,291,098,944)
  sha256: string;             // expected whole-file digest (manifest customMetadata.sha256)
  licenseKey: string;         // device-binding for the .orx pack
  createdTs: number;          // stamp (caller passes Date.now())
  version?: string;           // model version, default "2.4"
  watermark?: string;
  refresh?: () => Promise<string>; // re-mint the URL on a 401 (token expiry mid-download)
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
  chunkBytes?: number;        // Range window (default 16 MiB)
  retries?: number;           // per-chunk attempts (default 5)
}

export interface PullResult {
  orxPath: string;
  modelId: string;
  bytes: number;
}

/** The next Range to fetch given how much is already on disk. null when complete. Pure → unit-tested. */
export function nextRange(offset: number, total: number, chunk: number): { start: number; end: number } | null {
  if (offset >= total) return null;
  return { start: offset, end: Math.min(offset + chunk, total) - 1 };
}

/** Discover the full object size from a 1-byte Range (Content-Range: "bytes 0-0/<total>"). */
export async function probeSize(url: string, signal?: AbortSignal): Promise<number> {
  const r = await fetch(url, { headers: { Range: "bytes=0-0" }, signal });
  const cr = r.headers.get("content-range");
  await r.arrayBuffer().catch(() => undefined); // drain
  if (!r.ok && r.status !== 206) throw new Error(`size probe HTTP ${r.status}`);
  if (!cr) throw new Error("server did not return a byte range — cannot size the model");
  const total = Number(cr.split("/")[1]);
  if (!Number.isFinite(total) || total <= 1) throw new Error("could not determine model size");
  return total;
}

async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  const fh = await open(path, "r");
  try {
    const b = Buffer.alloc(4 * 1024 * 1024);
    let pos = 0;
    for (;;) {
      const { bytesRead } = await fh.read(b, 0, b.length, pos);
      if (!bytesRead) break;
      hash.update(b.subarray(0, bytesRead));
      pos += bytesRead;
    }
  } finally {
    await fh.close();
  }
  return hash.digest("hex");
}

async function fetchRange(
  urlRef: { url: string },
  range: { start: number; end: number },
  spec: PullSpec,
  retries: number,
): Promise<Buffer> {
  let attempt = 0;
  let refreshes = 0;
  for (;;) {
    if (spec.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    try {
      const r = await fetch(urlRef.url, { headers: { Range: `bytes=${range.start}-${range.end}` }, signal: spec.signal });
      // Token/URL expired mid-download → re-mint a fresh URL and retry the SAME chunk (not counted as a
      // retry). 401 = worker-stream token expiry; 403 = presigned-R2 URL expiry (the form used once the
      // R2_S3 keys are live) — handle BOTH so a long multi-GB pull never dies at 95% on an expired link.
      if ((r.status === 401 || r.status === 403) && spec.refresh && refreshes < 5) { refreshes++; urlRef.url = await spec.refresh(); continue; }
      if (r.status === 200) throw new Error("server ignored Range (200) — refusing to write a full body at an offset");
      if (r.status !== 206) throw new Error(`chunk HTTP ${r.status}`);
      const ab = await r.arrayBuffer();
      const want = range.end - range.start + 1;
      if (ab.byteLength !== want) throw new Error(`short chunk (${ab.byteLength}/${want})`);
      return Buffer.from(ab);
    } catch (e) {
      attempt++;
      if (spec.signal?.aborted || attempt >= retries) throw e;
      await new Promise((res) => setTimeout(res, Math.min(500 * 2 ** (attempt - 1), 4000)));
    }
  }
}

/** Download one model to a device-bound .orx. Resumes from a partial staging file if present. */
export async function pullModelToOrx(spec: PullSpec): Promise<PullResult> {
  const stageDir = join(oriroDir(), "weights", "staging");
  await mkdir(stageDir, { recursive: true });
  const part = join(stageDir, `${spec.modelId}.gguf.part`);
  const chunk = spec.chunkBytes ?? 16 * 1024 * 1024;
  const retries = spec.retries ?? 5;
  const urlRef = { url: spec.url };

  // Resume from whatever is already on disk (a partial .part), or start fresh.
  let offset = existsSync(part) ? (await stat(part)).size : 0;
  if (offset > spec.sizeBytes) { await unlink(part); offset = 0; } // corrupt/oversized → restart
  spec.onProgress?.(offset, spec.sizeBytes);

  const fh = await open(part, offset > 0 ? "r+" : "w");
  try {
    let cursor = offset;
    for (let range = nextRange(cursor, spec.sizeBytes, chunk); range; range = nextRange(cursor, spec.sizeBytes, chunk)) {
      const buf = await fetchRange(urlRef, range, spec, retries);
      await fh.write(buf, 0, buf.length, cursor);
      cursor += buf.length;
      spec.onProgress?.(cursor, spec.sizeBytes);
    }
  } finally {
    await fh.close();
  }

  // Verify the whole-file digest BEFORE packing — a corrupt download must never become a model.
  const actual = await sha256File(part);
  if (spec.sha256 && actual !== spec.sha256) {
    await unlink(part);
    throw new Error(`${spec.modelId}: download failed the integrity check (sha256 mismatch) — please retry`);
  }

  // Pack into a device-bound, watermarked .orx, then remove the cleartext staging file.
  const orxPath = join(oriroDir(), "weights", `${spec.modelId}.orx`);
  await packOrxToFile(part, orxPath, {
    kek: deriveKek(spec.licenseKey),
    watermark: spec.watermark ?? `orx:${spec.modelId}-v${spec.version ?? "2.4"}:${actual.slice(0, 12)}`,
    meta: { modelId: spec.modelId, version: spec.version ?? "2.4", createdTs: spec.createdTs },
  });
  await unlink(part);
  return { orxPath, modelId: spec.modelId, bytes: spec.sizeBytes };
}
