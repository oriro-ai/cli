// ORIRO Head model adapter — REWIRED onto the ORIRO keyless Mux (replaces the donor's
// OpenClaw-coupled completion-runtime version). Head's injected CoderModel
// (`(prompt) => Promise<string>`) is backed by our FREE routers with invisible failover,
// so url→code / video→code work with NO BYOK key (OR-FREE). Zero OpenClaw footprint.
import { register as registerOpenAICompletions } from "@earendil-works/pi-ai/openai-completions";
import type { Context } from "@earendil-works/pi-ai";
import { RouterMux } from "../routers/mux.js";
import { KEYLESS_FLOOR, type KeylessRouter } from "../routers/floor.js";
import { completeViaRouter } from "../routers/keyless-complete.js";
import type { CoderModel, HtmlToCodeModels, VideoToCodeModels, WatchModel } from "./video-to-code.js";

const HEAD_CODER_SYSTEM =
  "You are ORIRO Head's senior front-end engineer. Reproduce UIs faithfully and output exactly " +
  "what the instruction asks for (clean, working code or a structured spec). No preamble.";

/** A CoderModel backed by the ORIRO keyless Mux (free routers, invisible failover). */
export function buildHeadCoderModel(routers: KeylessRouter[] = KEYLESS_FLOOR): CoderModel {
  registerOpenAICompletions();
  const byId = new Map(routers.map((r) => [r.id, r]));
  const mux = new RouterMux(routers.map((r) => r.id));
  return async (prompt: string): Promise<string> => {
    const context: Context = {
      systemPrompt: HEAD_CODER_SYSTEM,
      messages: [{ role: "user", content: prompt, timestamp: Date.now() }],
    };
    const { result } = await mux.run(async (id) => {
      const r = byId.get(id);
      if (!r) throw new Error(`unknown router ${id}`);
      return completeViaRouter(r, context, 8192);
    });
    return result;
  };
}

/** The models bundle Head's urlToCode consume — keyless by default (coder only). */
export function headModels(routers: KeylessRouter[] = KEYLESS_FLOOR): HtmlToCodeModels {
  return { code: buildHeadCoderModel(routers) };
}

const HEAD_WATCH_SYSTEM =
  "You are ORIRO Head's UI analyst. From the described/attached media, produce a precise, " +
  "build-ready specification of the interface. Be concrete and exhaustive. No preamble.";

/**
 * A WatchModel backed by the ORIRO keyless Mux. NOTE: the keyless floor is a TEXT model, so it
 * reasons from the prompt/goal rather than truly SEEING pixels — video→code is therefore
 * EXPERIMENTAL on the free floor and gives its best results when a vision-capable router is
 * configured (BYOK). The pipeline itself is model-agnostic: swap in a multimodal router and it
 * "watches" for real, no code change.
 */
export function buildHeadWatchModel(routers: KeylessRouter[] = KEYLESS_FLOOR): WatchModel {
  registerOpenAICompletions();
  const byId = new Map(routers.map((r) => [r.id, r]));
  const mux = new RouterMux(routers.map((r) => r.id));
  return async ({ prompt }): Promise<string> => {
    const context: Context = {
      systemPrompt: HEAD_WATCH_SYSTEM,
      messages: [{ role: "user", content: prompt, timestamp: Date.now() }],
    };
    const { result } = await mux.run(async (id) => {
      const r = byId.get(id);
      if (!r) throw new Error(`unknown router ${id}`);
      return completeViaRouter(r, context, 8192);
    });
    return result;
  };
}

/** Models bundle Head's videoToCode consumes: a watcher + the coder — both keyless. */
export function headVideoModels(routers: KeylessRouter[] = KEYLESS_FLOOR): VideoToCodeModels {
  return { watch: buildHeadWatchModel(routers), code: buildHeadCoderModel(routers) };
}
