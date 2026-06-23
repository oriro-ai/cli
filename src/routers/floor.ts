// ORIRO Step 0 — the KEYLESS FLOOR. Providers that never need a paid key, so the CLI
// always has a brain. The Mux fails over across these; Ollama is the on-device last
// resort ($0, fully offline). Built fresh on Pi (no OpenClaw); openai-completions shape.
import type { Model } from "@earendil-works/pi-ai";

export interface KeylessRouter {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string; // sentinel — keyless endpoints ignore it; never a paid key
}

// The default keyless floor. Order = preferred-first before any latency is learned.
export const KEYLESS_FLOOR: KeylessRouter[] = [
  {
    id: "pollinations",
    name: "Pollinations (free)",
    baseUrl: "https://text.pollinations.ai/openai",
    model: "openai",
    apiKey: "oriro-keyless",
  },
  {
    id: "ollama-local",
    name: "Ollama (on-device)",
    baseUrl: "http://localhost:11434/v1",
    model: "llama3.2",
    apiKey: "ollama",
  },
];

/** Build a pi-ai openai-completions Model from a keyless router entry. */
export function routerModel(r: KeylessRouter): Model<"openai-completions"> {
  return {
    id: r.model,
    name: r.name,
    api: "openai-completions",
    provider: r.id,
    baseUrl: r.baseUrl,
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 4096,
  };
}
