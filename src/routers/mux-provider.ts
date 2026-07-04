// ORIRO Step 0 — wrap the Best-Router Mux as ONE keyless Pi provider.
// The Pi agent loop sees a single model ("oriro-free"); underneath, this streamSimple runs
// the RouterMux over the keyless floor with INVISIBLE failover. Failover strategy:
// the dominant failure (dead host / connection / immediate 429) surfaces as an `error` event
// before any content, so we PEEK the first event — error-before-content → try the next router;
// first real event → commit and stream live. Identity is enforced (system-prompt + final scrub).
import { streamSimple as piStreamSimple, createAssistantMessageEventStream } from "@earendil-works/pi-ai";
import { register as registerOpenAICompletions } from "@earendil-works/pi-ai/openai-completions";
import type {
  AssistantMessage,
  AssistantMessageEventStream,
  Context,
  Model,
  SimpleStreamOptions,
} from "@earendil-works/pi-ai";
import type { ModelRegistry } from "@earendil-works/pi-coding-agent";
import { RouterMux, saveMuxState, loadMuxState, type CallError } from "./mux.js";
import { KEYLESS_FLOOR, routerModel, type KeylessRouter } from "./floor.js";
import { resolvePool } from "./router-pool.js";
import { oriroDir } from "../config/paths.js";
import { applyIdentity, scrubMessageIdentity } from "../identity/filter.js";
import { sanitizeMessageToolCalls, sanitizeEventToolCalls } from "./tool-sanitize.js";
import { buildScribeContext } from "../scribe/scribe-pi.js";
import { MUX_PROVIDER, MUX_MODEL, errToCallError, buildErrorMessage } from "./mux-helpers.js";
import { raceMux } from "./race.js";

export { MUX_PROVIDER, MUX_MODEL };

async function driveMux(
  out: AssistantMessageEventStream,
  mux: RouterMux,
  byId: Map<string, KeylessRouter>,
  context: Context,
  options: SimpleStreamOptions | undefined,
): Promise<void> {
  let lastError: AssistantMessage | undefined;
  for (const id of mux.ranked()) {
    const router = byId.get(id);
    if (!router) continue;
    const t0 = Date.now();
    let committed = false;
    let lastPartial: AssistantMessage | undefined;
    try {
      const inner = piStreamSimple(routerModel(router), context, {
        ...(options ?? {}),
        apiKey: router.apiKey,
      } as SimpleStreamOptions);
      let failedBeforeContent = false;
      for await (const ev of inner) {
        if (ev.type === "error") {
          mux.recordFailure(id, errToCallError(ev.error));
          if (!committed) {
            lastError = ev.error;
            failedBeforeContent = true;
            break; // invisible failover to the next router
          }
          out.push(ev); // mid-stream error after commit — surface it (can't un-stream)
          out.end(ev.error);
          return;
        }
        committed = true;
        if (ev.type === "done") {
          mux.recordSuccess(id, Date.now() - t0);
          // Identity scrub + tool-name sanitize: free endpoints can leak Harmony control
          // tokens into tool names (`bash<|channel|>commentary`) — normalize before dispatch.
          const clean = sanitizeMessageToolCalls(scrubMessageIdentity(ev.message));
          out.push({ type: "done", reason: ev.reason, message: clean });
          out.end(clean);
          return;
        }
        lastPartial = ev.partial; // remaining event types all carry a partial
        out.push(sanitizeEventToolCalls(ev)); // live stream + tool-name sanitize on partials/toolcall_end
      }
      if (failedBeforeContent) continue; // try next router
      if (!committed) {
        // The stream ended with NO events at all (e.g. an endpoint returns 200 with an empty body):
        // that's not a success — record a failure and fail over instead of surfacing an empty reply.
        mux.recordFailure(id, {});
        lastError ??= buildErrorMessage("Router returned no output.");
        continue;
      }
      // committed but stream ended without an explicit done — close with last known message
      mux.recordSuccess(id, Date.now() - t0);
      out.end(lastPartial ? sanitizeMessageToolCalls(scrubMessageIdentity(lastPartial)) : undefined);
      return;
    } catch (e) {
      mux.recordFailure(id, e as CallError);
    }
  }
  const msg =
    lastError ??
    buildErrorMessage(
      "All keyless routers are unavailable. Add a BYOK key, select more free routers, or retry shortly.",
    );
  out.push({ type: "error", reason: "error", error: msg });
  out.end(msg);
}

export interface OriroMuxOptions {
  routers?: KeylessRouter[];
}

/**
 * Register the ORIRO keyless Mux as a single provider/model on the given ModelRegistry.
 * Returns the registered Model so the caller can set it as the session default.
 */
export function registerOriroMux(
  registry: ModelRegistry,
  opts: OriroMuxOptions = {},
): Model<"openai-completions"> | undefined {
  registerOpenAICompletions();

  // LIVE POOL (2026-07-04): resolve the routers FRESH on every request so an in-REPL
  // `/routers add|use` (or `oriro routers …`) takes effect on the very next prompt — no restart.
  // Health (EWMA latency / cooldowns) persists across requests via the on-disk mux state, so
  // re-resolving per request costs nothing but picks up pool edits. Falls back to the keyless
  // floor when the pool is empty — the Mux never has zero routers.
  function resolveNow(): { routers: KeylessRouter[]; byId: Map<string, KeylessRouter>; mux: RouterMux } {
    const pooled = resolvePool();
    const routers = opts.routers ?? (pooled.length > 0 ? pooled : KEYLESS_FLOOR);
    const byId = new Map(routers.map((r) => [r.id, r]));
    const mux = new RouterMux(routers.map((r) => r.id));
    try { mux.load(loadMuxState(oriroDir())); } catch { /* fresh state if unreadable */ }
    return { routers, byId, mux };
  }

  registry.registerProvider(MUX_PROVIDER, {
    name: "ORIRO Free (keyless Mux)",
    api: "openai-completions",
    apiKey: "oriro-keyless",
    // Placeholder — required by registry validation but never used: our custom streamSimple
    // routes to the real keyless floor endpoints itself (see driveMux).
    baseUrl: "http://oriro-mux.local",
    models: [
      {
        id: MUX_MODEL,
        name: "ORIRO Free (best-router)",
        api: "openai-completions",
        baseUrl: "http://oriro-mux.local",
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128000,
        maxTokens: 4096,
      },
    ],
    streamSimple: (_model, context, options) => {
      const out = createAssistantMessageEventStream();
      const { routers, byId, mux } = resolveNow(); // fresh pool every request (see resolveNow)
      // Harness-layer context: ORIRO identity + (if Scriber is on) the cross-session work history,
      // injected into the system prompt so recall works inline — not dependent on the model
      // choosing to call scribe_recall (weak free models often don't). Empty when Scriber is off.
      const ctx = applyIdentity(context);
      const memory = buildScribeContext();
      const withMemory = memory ? { ...ctx, systemPrompt: `${ctx.systemPrompt}\n\n${memory}` } : ctx;
      // >1 router → PARALLEL RACE (first to answer wins, losers aborted, names shown live).
      // 1 router → the proven sequential failover. Both share identity-scrub + tool-sanitize + health.
      const drive = routers.length > 1
        ? raceMux(out, mux, byId, withMemory, options)
        : driveMux(out, mux, byId, withMemory, options);
      void drive.finally(() => {
        try { saveMuxState(oriroDir(), mux.snapshot()); } catch { /* best-effort persistence */ }
      });
      return out;
    },
  });

  return registry.find(MUX_PROVIDER, MUX_MODEL) as Model<"openai-completions"> | undefined;
}
