// ORIRO Step 0 — the bridge between a keyless router and the Mux.
// CRITICAL: pi-ai's complete() does NOT throw on failure — it returns an AssistantMessage
// with stopReason:"error" + errorMessage (content:[]). The Mux only fails over when the
// call THROWS, so this helper converts an error-reply (or empty reply) into a thrown
// CallError (with 429 detection). Built fresh on Pi; reused by the spike and the real provider.
import { complete } from "@earendil-works/pi-ai";
import type { AssistantMessage, Context } from "@earendil-works/pi-ai";
import { routerModel, type KeylessRouter } from "./floor.js";
import type { CallError } from "./mux.js";

type Replyish = AssistantMessage & { stopReason?: string; errorMessage?: string };

/** Complete one turn against a keyless router; THROW (so the Mux fails over) on any failure. */
export async function completeViaRouter(
  router: KeylessRouter,
  context: Context,
  maxTokens = 1024,
): Promise<string> {
  const reply = (await complete(routerModel(router), context, {
    apiKey: router.apiKey,
    maxTokens,
  })) as Replyish;

  if (reply.stopReason === "error") {
    const msg = reply.errorMessage ?? "router error";
    const err = new Error(msg) as Error & CallError;
    if (/\b429\b|rate.?limit|too many requests/i.test(msg)) err.status = 429;
    throw err;
  }

  const text = reply.content
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map((c) => c.text)
    .join("");
  if (!text.trim()) throw new Error("empty completion");
  return text;
}
