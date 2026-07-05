// The on-device inference engine — the embedded llama.cpp binding (node-llama-cpp, MIT). This is the ONLY
// module that touches the native runtime; everything around it (decrypt, preflight, template) is pure and
// unit-tested. node-llama-cpp is an OPTIONAL dependency, dynamically imported, so the CLI never hard-fails
// when the native binary is absent — load() throws a clear, actionable error instead.
//
// node-llama-cpp loads from a FILE PATH (llama.cpp has no load-from-memory), so the caller passes the path
// from decryptToSecureFile(). GPU (Metal / CUDA / Vulkan) is auto-detected by getLlama() with CPU fallback.
//
// INTEGRATION NOTE: the exact node-llama-cpp v3 call surface (getLlama → loadModel → createContext →
// LlamaCompletion.generateCompletion) is exercised only in the packaged app where the native binary is
// present; this environment has no native runtime, so this boundary is validated at app-integration time.
// It is intentionally thin so any v3 API drift is a one-file fix.

import { buildPrompt, type ChatMessage } from "./template.js";
import { thinkFilter } from "./think-strip.js";

export interface LoadedEngine {
  chat(
    messages: ChatMessage[],
    onToken: (t: string) => void,
    opts?: { systemOverride?: string; signal?: AbortSignal; maxTokens?: number },
  ): Promise<string>;
  dispose(): Promise<void>;
}

async function importLlama(): Promise<Record<string, unknown>> {
  try {
    return (await import("node-llama-cpp")) as Record<string, unknown>;
  } catch {
    throw new Error(
      "The on-device engine isn't available. The ORIRO app ships it prebuilt; from source, install the optional dependency with: npm i node-llama-cpp",
    );
  }
}

/**
 * Load a GGUF from `modelPath` into an engine bound to `nCtx` tokens of context. `mmprojPath` (optional)
 * is the vision projector — when present the model can take image input (V2.4 is vision-capable). The
 * multimodal image-message wiring is validated at app-integration alongside the rest of the native surface.
 */
export async function loadEngine(modelPath: string, modelId: string, nCtx: number, mmprojPath?: string): Promise<LoadedEngine> {
  const mod = await importLlama();
  const getLlama = mod.getLlama as unknown as (opts?: unknown) => Promise<unknown>;
  const LlamaCompletion = mod.LlamaCompletion as unknown as new (opts: unknown) => {
    generateCompletion(prompt: string, opts: unknown): Promise<string>;
    dispose?(): void;
  };

  const llama = (await getLlama()) as {
    loadModel(opts: { modelPath: string; mmproj?: string }): Promise<{
      createContext(opts: { contextSize: number }): Promise<{
        getSequence(): unknown;
        dispose(): Promise<void>;
      }>;
      dispose(): Promise<void>;
    }>;
  };

  const model = await llama.loadModel(mmprojPath ? { modelPath, mmproj: mmprojPath } : { modelPath });
  const context = await model.createContext({ contextSize: nCtx });

  return {
    async chat(messages, onToken, opts) {
      const { prompt, stops } = buildPrompt(modelId, messages, opts?.systemOverride);
      const completion = new LlamaCompletion({ contextSequence: context.getSequence() });
      // We own the chat template (ChatML), so this is a RAW completion of the formatted prompt.
      // customStopTriggers enforces the stop sequences; the think-filter strips the model's internal
      // <think>…</think> reasoning so only the answer streams out (V2.4 is a thinking model).
      const filter = thinkFilter();
      let visible = "";
      await completion.generateCompletion(prompt, {
        onTextChunk: (t: string) => {
          const v = filter.push(t);
          if (v) { visible += v; onToken(v); }
        },
        customStopTriggers: stops,
        maxTokens: opts?.maxTokens,
        signal: opts?.signal,
      });
      const tail = filter.end();
      if (tail) { visible += tail; onToken(tail); }
      completion.dispose?.();
      return visible;
    },
    async dispose() {
      await context.dispose();
      await model.dispose();
    },
  };
}
