// Shared Mux constants + tiny helpers, factored out of mux-provider.ts so both the sequential
// driveMux (mux-provider) AND the parallel raceMux (race.ts) use identical error shapes — and so
// race.ts never has to import mux-provider (no import cycle).
import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { CallError } from "./mux.js";

export const MUX_PROVIDER = "oriro-mux";
export const MUX_MODEL = "oriro-free";

/** Classify a router's error message → a CallError (429 drives the Mux cooldown). */
export function errToCallError(msg: AssistantMessage & { errorMessage?: string }): CallError {
  const text = msg.errorMessage ?? "";
  return /\b429\b|rate.?limit|too many requests/i.test(text) ? { status: 429 } : {};
}

/** A synthetic assistant error message in the Mux provider's shape. */
export function buildErrorMessage(message: string): AssistantMessage {
  return {
    role: "assistant",
    content: [],
    api: "openai-completions",
    provider: MUX_PROVIDER,
    model: MUX_MODEL,
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
    stopReason: "error",
    timestamp: Date.now(),
    errorMessage: message,
  } as AssistantMessage;
}
