// ORIRO parallel race (P0-4, 2026-07-04). The oriro.ai web race runs the router pool CONCURRENTLY
// and the first to answer wins; this brings that to the CLI. driveMux (sequential failover) stays as
// the single-router / fallback path — this is the multi-router path.
//
// Contract, identical to driveMux where it matters: the WINNER's stream is identity-scrubbed +
// tool-name-sanitized before it reaches `out`; a router that errors before any content just drops;
// if every racer fails, the error is surfaced. New here: top-`width` routers are dispatched at once,
// the first to emit real content COMMITS and the losers are aborted (so cost is bounded to ~first
// token), and the racing names + winner are published via race-status for the TUI to render.
import { streamSimple as piStreamSimple } from "@earendil-works/pi-ai";
import type { AssistantMessage, AssistantMessageEventStream, Context, SimpleStreamOptions } from "@earendil-works/pi-ai";
import { RouterMux } from "./mux.js";
import { routerModel, type KeylessRouter } from "./floor.js";
import { scrubMessageIdentity } from "../identity/filter.js";
import { sanitizeMessageToolCalls, sanitizeEventToolCalls } from "./tool-sanitize.js";
import { errToCallError, buildErrorMessage } from "./mux-helpers.js";
import { emitRaceStatus } from "./race-status.js";

export const DEFAULT_RACE_WIDTH = 3;

/** Structural event shape (matches the pi-ai assistant-message events driveMux consumes). */
export interface StreamEvent {
  type: string;
  error?: AssistantMessage & { errorMessage?: string };
  message?: AssistantMessage;
  reason?: unknown;
  partial?: AssistantMessage;
}

/** Injectable so the race is unit-testable with fake streams; production wraps piStreamSimple. */
export type StreamFactory = (
  router: KeylessRouter,
  context: Context,
  options: SimpleStreamOptions | undefined,
  signal: AbortSignal,
) => AsyncIterable<StreamEvent>;

export const realStreamFactory: StreamFactory = (router, context, options, signal) =>
  // A router with a custom transport (e.g. Ornith's keyless proxy) streams itself; others go through
  // pi's openai-completions HTTP. The custom streamer receives the abort signal so it drops on a loss.
  (router.stream
    ? router.stream(context, options, signal)
    : piStreamSimple(routerModel(router), context, {
        ...(options ?? {}),
        apiKey: router.apiKey,
        signal,
      } as SimpleStreamOptions)) as unknown as AsyncIterable<StreamEvent>;

export interface RaceOpts {
  width?: number;
  streamFactory?: StreamFactory;
}

export async function raceMux(
  out: AssistantMessageEventStream,
  mux: RouterMux,
  byId: Map<string, KeylessRouter>,
  context: Context,
  options: SimpleStreamOptions | undefined,
  opts: RaceOpts = {},
): Promise<void> {
  const width = opts.width ?? DEFAULT_RACE_WIDTH;
  const streamFactory = opts.streamFactory ?? realStreamFactory;
  const push = (ev: unknown): void => out.push(ev as never);

  const ranked = mux.ranked().filter((id) => byId.has(id));
  if (ranked.length === 0) {
    const msg = buildErrorMessage("All selected routers are unavailable. Add a BYOK key, select more free routers, or retry shortly.");
    push({ type: "error", reason: "error", error: msg });
    out.end(msg);
    emitRaceStatus({ phase: "failed", racers: [], winner: null });
    return;
  }
  const racers = ranked.slice(0, Math.max(1, Math.min(width, ranked.length)));
  emitRaceStatus({ phase: "racing", racers, winner: null });

  const controllers = new Map<string, AbortController>();
  for (const id of racers) controllers.set(id, new AbortController());
  const abortLosers = (keep: string): void => {
    for (const [id, c] of controllers) if (id !== keep) { try { c.abort(); } catch { /* */ } }
  };

  let winner: string | null = null;
  let settled = false;
  let lastError: (AssistantMessage & { errorMessage?: string }) | undefined;
  let remaining = racers.length;

  return await new Promise<void>((resolve) => {
    const failAll = (): void => {
      if (settled) return;
      settled = true;
      const msg = lastError ?? buildErrorMessage("All racers failed this request.");
      push({ type: "error", reason: "error", error: msg });
      out.end(msg);
      emitRaceStatus({ phase: "failed", racers, winner: null });
      resolve();
    };

    for (const id of racers) {
      const router = byId.get(id) as KeylessRouter;
      const ctrl = controllers.get(id) as AbortController;
      const t0 = Date.now();
      void (async () => {
        let iAmWinner = false;
        let lastPartial: AssistantMessage | undefined;
        try {
          for await (const ev of streamFactory(router, context, options, ctrl.signal)) {
            if (settled && !iAmWinner) return; // another racer already won or the turn failed

            if (ev.type === "error") {
              mux.recordFailure(id, ev.error ? errToCallError(ev.error) : {});
              if (iAmWinner && !settled) { settled = true; push(ev); out.end(ev.error); resolve(); return; }
              lastError = ev.error ?? lastError;
              return; // this racer is out; the others keep going
            }

            // First non-error event is a bid to WIN — claim synchronously (no await between test+set).
            if (!iAmWinner) {
              if (winner !== null || settled) return; // lost the race → drop
              winner = id;
              iAmWinner = true;
              mux.recordSuccess(id, Date.now() - t0);
              emitRaceStatus({ phase: "won", racers, winner: id });
              abortLosers(id);
            }

            if (ev.type === "done") {
              if (!settled) {
                settled = true;
                const clean = sanitizeMessageToolCalls(scrubMessageIdentity(ev.message as AssistantMessage));
                push({ type: "done", reason: ev.reason, message: clean });
                out.end(clean);
                resolve();
              }
              return;
            }
            lastPartial = ev.partial ?? lastPartial;
            push(sanitizeEventToolCalls(ev as never));
          }
          // stream ended without an explicit "done"
          if (iAmWinner && !settled) {
            settled = true;
            out.end(lastPartial ? sanitizeMessageToolCalls(scrubMessageIdentity(lastPartial)) : undefined);
            resolve();
          } else if (!iAmWinner) {
            mux.recordFailure(id, {}); // ended with no content = a failure to fail over from
          }
        } catch (e) {
          if ((e as { name?: string })?.name === "AbortError") return; // an aborted loser — expected, not a failure
          mux.recordFailure(id, e as never);
          if (!iAmWinner) lastError ??= buildErrorMessage(e instanceof Error ? e.message : String(e));
        } finally {
          remaining -= 1;
          if (remaining === 0 && !settled) failAll();
        }
      })();
    }
  });
}
