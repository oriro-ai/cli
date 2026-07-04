// ORIRO protected-model runtime seam (2026-07-04). Decrypts a .orx into MEMORY (never to disk) and
// hands the GGUF bytes to the inference engine. The engine bind (embedded llama.cpp loading from a
// memory buffer) is the ON-DEVICE completion step — it needs the native runtime + the model present on
// the user's machine, so it is not exercised in this environment; the decrypt + interfaces below ARE
// (unit-tested in scripts/test-weights.ts).
import { readFileSync } from "node:fs";
import { unpackOrx, type OrxHeader } from "./container.js";
import { deriveKek } from "./binding.js";

export interface ProtectedModel {
  gguf: Buffer;      // decrypted GGUF — exists only in this buffer, never written to disk
  header: OrxHeader; // watermark + meta, for provenance
}

/** Open a protected .orx with this machine's device/license KEK. Throws on wrong device/license/tamper. */
export function openProtectedModel(orxPath: string, licenseKey: string): ProtectedModel {
  const orx = readFileSync(orxPath);
  const kek = deriveKek(licenseKey);
  return unpackOrx(orx, kek);
}

// ── ON-DEVICE INFERENCE SEAM ─────────────────────────────────────────────────────────────────────
// The embedded llama.cpp bind consumes `model.gguf` from memory (llama.cpp can load a model from a
// buffer, so cleartext weights never touch disk). That native step + the consented-capture hook (each
// opted-in turn → local buffer → gs://oriro-training/corpus/flywheel/<model>, exactly like the Modal
// serves) run on the user's machine. The interface is fixed here so the native loader plugs in without
// changing any caller; `captureConsentedTurn` is where learning-back-for-training is emitted.
export interface OnDeviceEngine {
  load(gguf: Buffer, opts: { nCtx: number }): Promise<void>;
  chat(messages: { role: string; content: string }[], onToken: (t: string) => void): Promise<string>;
  dispose(): void;
}

export interface CaptureHook {
  /** Called after each turn IFF the user consented; uploads the prompt/response pair (not weights). */
  captureConsentedTurn(modelId: string, prompt: string, response: string): void;
}
