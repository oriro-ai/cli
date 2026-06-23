// ORIRO Head model adapter — REWIRED onto the ORIRO keyless Mux (replaces the donor's
// OpenClaw-coupled completion-runtime version). Head's injected CoderModel
// (`(prompt) => Promise<string>`) is backed by our FREE routers with invisible failover,
// so url→code / video→code work with NO BYOK key (OR-FREE). Zero OpenClaw footprint.
import { register as registerOpenAICompletions } from "@earendil-works/pi-ai/openai-completions";
import type { Context } from "@earendil-works/pi-ai";
import { RouterMux } from "../routers/mux.js";
import { KEYLESS_FLOOR, type KeylessRouter } from "../routers/floor.js";
import { completeViaRouter } from "../routers/keyless-complete.js";
import type { CoderModel, HtmlToCodeModels } from "./video-to-code.js";

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

/** The models bundle Head's urlToCode/videoToCode consume — keyless by default. */
export function headModels(routers: KeylessRouter[] = KEYLESS_FLOOR): HtmlToCodeModels {
  return { code: buildHeadCoderModel(routers) };
}
