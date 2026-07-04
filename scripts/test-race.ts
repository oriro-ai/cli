// Unit test for the parallel race (src/routers/race.ts). Plain tsx assertions (repo convention).
// Fakes the stream factory so the concurrent winner-selection / abort / all-fail logic is exercised
// with zero network. Run: tsx scripts/test-race.ts
import { createAssistantMessageEventStream } from "@earendil-works/pi-ai";
import { RouterMux } from "../src/routers/mux.js";
import type { KeylessRouter } from "../src/routers/floor.js";
import { raceMux, type StreamEvent, type StreamFactory } from "../src/routers/race.js";
import { getRaceStatus } from "../src/routers/race-status.js";

let fails = 0;
function ok(cond: boolean, label: string): void {
  process.stdout.write(`${cond ? "✅" : "❌"} ${label}\n`);
  if (!cond) fails++;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function router(id: string): KeylessRouter {
  return { id, name: id, baseUrl: `http://${id}.local`, model: "m", apiKey: "k" };
}

/** A fake stream: yields `content` after `delay` ms (respecting abort), then a done. */
function fakeContent(id: string, delay: number, text: string): StreamFactory {
  return async function* (_r, _c, _o, signal): AsyncGenerator<StreamEvent> {
    await sleep(delay);
    if (signal.aborted) { const e = new Error("aborted"); e.name = "AbortError"; throw e; }
    yield { type: "text_delta", partial: { content: [{ type: "text", text }] } as never };
    yield { type: "done", reason: "stop", message: { role: "assistant", content: [{ type: "text", text }] } as never };
  };
}

/** A fake stream that errors before any content (immediate). */
function fakeError(): StreamFactory {
  return async function* (): AsyncGenerator<StreamEvent> {
    yield { type: "error", error: { errorMessage: "boom" } as never };
  };
}

async function collect(out: ReturnType<typeof createAssistantMessageEventStream>): Promise<StreamEvent[]> {
  const evs: StreamEvent[] = [];
  for await (const ev of out as AsyncIterable<StreamEvent>) evs.push(ev);
  return evs;
}

/** Per-router factory dispatcher. */
function byRouter(map: Record<string, StreamFactory>): StreamFactory {
  return (r, c, o, s) => (map[r.id] ?? fakeError())(r, c, o, s);
}

async function run(): Promise<void> {
  // ── Test 1: fast router beats slow router; winner streams; slow one is aborted. ──
  {
    const ids = ["slow", "fast"];
    const mux = new RouterMux(ids);
    const byId = new Map(ids.map((i) => [i, router(i)]));
    const out = createAssistantMessageEventStream();
    const aborted = { slow: false };
    const slowFactory: StreamFactory = async function* (_r, _c, _o, signal) {
      await sleep(60);
      if (signal.aborted) { aborted.slow = true; const e = new Error("aborted"); e.name = "AbortError"; throw e; }
      yield { type: "done", reason: "stop", message: { role: "assistant", content: [] } as never };
    };
    const p = collect(out);
    await raceMux(out, mux, byId, {} as never, undefined, {
      width: 2,
      streamFactory: byRouter({ slow: slowFactory, fast: fakeContent("fast", 5, "hi from fast") }),
    });
    const evs = await p;
    const doneEv = evs.find((e) => e.type === "done");
    ok(getRaceStatus().winner === "fast", "T1 fast router wins");
    ok(!!doneEv, "T1 a done event reached the output");
    await sleep(80); // let the slow one hit its abort check
    ok(aborted.slow === true, "T1 slow (losing) router was aborted");
  }

  // ── Test 2: first racer errors before content → the other one wins. ──
  {
    const ids = ["bad", "good"];
    const mux = new RouterMux(ids);
    const byId = new Map(ids.map((i) => [i, router(i)]));
    const out = createAssistantMessageEventStream();
    const p = collect(out);
    await raceMux(out, mux, byId, {} as never, undefined, {
      width: 2,
      streamFactory: byRouter({ bad: fakeError(), good: fakeContent("good", 10, "ok") }),
    });
    const evs = await p;
    ok(getRaceStatus().winner === "good", "T2 healthy router wins after the other errors");
    ok(evs.some((e) => e.type === "done"), "T2 output completed with a done");
    ok(!evs.some((e) => e.type === "error"), "T2 no error surfaced (a racer recovered)");
  }

  // ── Test 3: every racer errors → an error is surfaced. ──
  {
    const ids = ["a", "b"];
    const mux = new RouterMux(ids);
    const byId = new Map(ids.map((i) => [i, router(i)]));
    const out = createAssistantMessageEventStream();
    const p = collect(out);
    await raceMux(out, mux, byId, {} as never, undefined, {
      width: 2,
      streamFactory: byRouter({ a: fakeError(), b: fakeError() }),
    });
    const evs = await p;
    ok(evs.some((e) => e.type === "error"), "T3 all-fail surfaces an error");
    ok(getRaceStatus().phase === "failed", "T3 race status = failed");
  }

  // ── Test 4: empty pool → error, never hangs. ──
  {
    const mux = new RouterMux([]);
    const out = createAssistantMessageEventStream();
    const p = collect(out);
    await raceMux(out, mux, new Map(), {} as never, undefined, { width: 3 });
    const evs = await p;
    ok(evs.some((e) => e.type === "error"), "T4 empty pool surfaces an error (no hang)");
  }

  process.stdout.write(fails === 0 ? "\nrace: ALL PASS\n" : `\nrace: ${fails} FAILED\n`);
  process.exit(fails === 0 ? 0 : 1);
}

void run();
