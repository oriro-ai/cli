// ORIRO Step 6 — live router validation. A tiny real request confirms the endpoint
// works + the chosen free model returns. Used at add-time with whatever key the user
// supplies (we ship none); keyless routers (e.g. local) probe without a key. Never throws.
import type { RouterEntry } from "./catalog.js";

export interface ValidateResult {
  ok: boolean;
  latencyMs: number;
  model: string;
  error?: string;
}

const PROBE_TIMEOUT_MS = 12_000;

export async function validateRouter(
  entry: RouterEntry,
  key: string | undefined,
  modelId?: string,
): Promise<ValidateResult> {
  const model = modelId ?? entry.freeModels[0] ?? "";
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    let res: Response;
    if (entry.api === "google-generative-ai") {
      const url = `${entry.baseUrl.replace(/\/$/, "")}/models/${model}:generateContent${key ? `?key=${key}` : ""}`;
      res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] }),
        signal: controller.signal,
      });
    } else {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (key) headers.authorization = `Bearer ${key}`;
      // Same URL the real transport builds: baseUrl + "/chat/completions". No special-casing.
      res = await fetch(`${entry.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
        }),
        signal: controller.signal,
      });
    }
    return {
      ok: res.ok,
      latencyMs: Date.now() - t0,
      model,
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (e) {
    return {
      ok: false,
      latencyMs: Date.now() - t0,
      model,
      error: e instanceof Error ? e.message : String(e),
    };
  } finally {
    clearTimeout(timer);
  }
}
