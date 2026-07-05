// The on-device model orchestrator — the one public entry point that turns a protected .orx on disk into a
// running, chattable local model. It composes the pieces in a straight line (FOCUS SIMPLIFY):
//
//   decrypt (.orx → locked cleartext file)  →  preflight (cap context to free RAM)  →  load engine  →  chat
//
// Every failure mode is explicit and detected: a wrong device/license throws at decrypt; too little RAM
// REFUSES at preflight (never OOM); a missing native engine throws a clear message at load. On any error
// the cleartext file is shredded before the error propagates — no leak on the failure path. This is the
// "no Ollama" runtime: ORIRO runs Gauss/Avila itself, weights stay device-bound, nothing leaves the machine.

import { decryptToSecureFile, type SecureModel } from "./secure-load.js";
import { loadEngine, type LoadedEngine } from "./engine.js";
import { planContext, type ContextPlan } from "./preflight.js";
import type { ChatMessage } from "./template.js";
import type { CaptureHook } from "./runtime.js";
import { statSync } from "node:fs";

export interface LocalModel {
  modelId: string;
  plan: ContextPlan; // what context we loaded with (and why, if reduced)
  chat(messages: ChatMessage[], onToken: (t: string) => void, opts?: { signal?: AbortSignal }): Promise<string>;
  dispose(): Promise<void>; // free the engine, then shred the cleartext file
}

export interface StartOptions {
  requestedCtx?: number; // desired context length; capped to free RAM by preflight
  capture?: CaptureHook; // optional consented learning-capture (prompt/response → local flywheel)
  mmprojOrxPath?: string; // optional vision projector (.orx) — enables image input (V2.4 is vision-capable)
}

/**
 * Start a local model from a protected `.orx`. `paramsB` is the model size in billions (for the RAM plan).
 * Throws (after shredding any cleartext) on wrong device/license, insufficient memory, or a missing engine.
 */
export async function startLocalModel(
  orxPath: string,
  licenseKey: string,
  paramsB: number,
  opts: StartOptions = {},
): Promise<LocalModel> {
  // 1) Decrypt (streaming) to a locked, device-bound cleartext file (shredded on dispose/exit).
  const secure: SecureModel = await decryptToSecureFile(orxPath, licenseKey);
  let mmproj: SecureModel | null = null;
  try {
    // 1b) If a vision projector is provided, decrypt it too (same device-bound + shred lifecycle).
    if (opts.mmprojOrxPath) mmproj = await decryptToSecureFile(opts.mmprojOrxPath, licenseKey);

    // 2) Preflight: size context to free RAM; refuse cleanly rather than OOM.
    const plan = planContext({ paramsB, fileBytes: statSync(secure.path).size }, opts.requestedCtx ?? 0);
    if (plan.decision === "refuse") throw new Error(plan.reason);

    // 3) Load the engine on the capped context (+ the vision projector, if any).
    const engine: LoadedEngine = await loadEngine(secure.path, secure.modelId, plan.nCtx, mmproj?.path);

    let disposed = false;
    return {
      modelId: secure.modelId,
      plan,
      async chat(messages, onToken, o) {
        const last = messages[messages.length - 1];
        const answer = await engine.chat(messages, onToken, { signal: o?.signal });
        // Consented learning-capture (Cardinal Rule: content stays local unless the user opted in).
        if (opts.capture && last?.role === "user") {
          opts.capture.captureConsentedTurn(secure.modelId, last.content, answer);
        }
        return answer;
      },
      async dispose() {
        if (disposed) return;
        disposed = true;
        await engine.dispose();
        mmproj?.dispose();
        secure.dispose();
      },
    };
  } catch (e) {
    mmproj?.dispose();
    secure.dispose(); // never leave cleartext on the failure path
    throw e;
  }
}
