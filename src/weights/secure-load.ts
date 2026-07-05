// Ephemeral, device-bound decrypt bridge (moat posture "Ephemeral + binding", Vinay 2026-07-04).
//
// WHY A FILE AT ALL: the engine (node-llama-cpp) can only load a model from a FILE PATH — llama.cpp has no
// public load-from-memory API — so the decrypted GGUF must exist as a file for the load window. We keep
// that exposure minimal and the moat intact:
//   • decrypt the .orx into a 0600 file inside ORIRO's PRIVATE dir (never a world-readable temp),
//   • hand the path to the engine to mmap,
//   • SHRED (overwrite with random) + unlink on dispose AND on process exit / signal (even on crash),
//   • the moat is the .orx itself being device+license-bound (a copied file is DEAD on any other machine —
//     see binding.ts::deriveKek) + watermarked. The cleartext is useless off this machine and gone the
//     moment the app closes.
// Pure fs → the lifecycle is unit-tested without a model or the native runtime.

import { unpackOrxToFile } from "./container-stream.js";
import { deriveKek } from "./binding.js";
import { ensureOriroDir } from "../config/paths.js";
import {
  chmodSync, mkdirSync, writeFileSync, existsSync, statSync, openSync, writeSync, closeSync, unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

export interface SecureModel {
  path: string; // the 0600 cleartext GGUF path to load (valid until dispose)
  modelId: string;
  dispose(): void; // shred + unlink; idempotent
}

function secureDir(): string {
  const d = join(ensureOriroDir(), "weights", "run");
  mkdirSync(d, { recursive: true });
  try { chmodSync(d, 0o700); } catch { /* non-POSIX filesystem (Windows) */ }
  return d;
}

// Overwrite the file with random bytes before unlinking so the cleartext can't be trivially recovered from
// freed blocks (best-effort — SSD wear-levelling may remap; this defeats casual recovery, and the .orx
// binding already makes a recovered copy useless off this machine).
function shredAndUnlink(path: string): void {
  try {
    if (!existsSync(path)) return;
    const size = statSync(path).size;
    const fd = openSync(path, "r+");
    try {
      const chunk = randomBytes(1024 * 1024);
      for (let off = 0; off < size; off += chunk.length) {
        writeSync(fd, chunk, 0, Math.min(chunk.length, size - off), off);
      }
    } finally {
      closeSync(fd);
    }
    unlinkSync(path);
  } catch {
    /* best-effort — never throw from cleanup */
  }
}

// Every live cleartext file, so a crash/SIGINT still shreds them. One exit hook for the whole process.
const live = new Set<string>();
let exitHooked = false;
function hookExit(): void {
  if (exitHooked) return;
  exitHooked = true;
  const cleanup = (): void => {
    for (const p of live) shredAndUnlink(p);
    live.clear();
  };
  process.once("exit", cleanup);
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
    process.once(sig, () => {
      cleanup();
      process.exit(130);
    });
  }
}

/**
 * Write already-decrypted GGUF bytes to a locked cleartext file the engine can load. Split out from the
 * decrypt so the file lifecycle is unit-testable without a real device-bound .orx. Caller MUST dispose().
 */
export function writeSecureFile(gguf: Buffer, modelId: string): SecureModel {
  hookExit();
  const path = join(secureDir(), `${modelId}-${randomBytes(6).toString("hex")}.gguf`);
  writeFileSync(path, gguf);
  try { chmodSync(path, 0o600); } catch { /* non-POSIX filesystem (Windows) */ }
  live.add(path);
  let disposed = false;
  return {
    path,
    modelId,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      live.delete(path);
      shredAndUnlink(path);
    },
  };
}

/**
 * Decrypt an .orx STRAIGHT to a locked cleartext file (streaming — never holds the 8 GB in a Buffer) for
 * the engine to load. Registers it for shred-on-exit. Caller MUST call dispose().
 */
export async function decryptToSecureFile(orxPath: string, licenseKey: string): Promise<SecureModel> {
  hookExit();
  const path = join(secureDir(), `run-${randomBytes(6).toString("hex")}.gguf`);
  live.add(path); // register BEFORE writing so a crash mid-decrypt still shreds the partial cleartext
  let header;
  try {
    header = await unpackOrxToFile(orxPath, path, deriveKek(licenseKey));
  } catch (e) {
    live.delete(path);
    shredAndUnlink(path);
    throw e;
  }
  try { chmodSync(path, 0o600); } catch { /* non-POSIX filesystem (Windows) */ }
  let disposed = false;
  return {
    path,
    modelId: header.modelId,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      live.delete(path);
      shredAndUnlink(path);
    },
  };
}
