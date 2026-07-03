// ORIRO Agents — the RUNNER. This is where a "dead" agent comes alive: we assemble a FULL ORIRO
// session (all tools + skills + connectors, every tool_call gated by Guardian) bound to the agent's
// router (its brain), then drive it with the agent's task. Full tools behind Guardian by construction
// — Guardian is default-on and fails CLOSED on "ask" when there's no UI, so unattended automation
// can only take allow-listed actions. Never a paid key (the session runs on the keyless Mux/pool).
import type { AgentSession } from "@earendil-works/pi-coding-agent";
import { assembleOriroSession } from "../onboarding/assemble.js";
import { registeredRouters } from "../routers/router-pool.js";
import { scrubOutput } from "../identity/filter.js";
import type { KeylessRouter } from "../routers/floor.js";
import type { AgentDef } from "./store.js";

export interface AgentRunResult {
  ok: boolean;
  output: string;
}

// Hard cap on a single agent run so a slow/hanging router can never wedge `tick`/`daemon`
// automation. Override with ORIRO_AGENT_TIMEOUT_MS. Unattended runs must always terminate.
const DEFAULT_TIMEOUT_MS = 300_000;
function runTimeoutMs(): number {
  const v = Number(process.env.ORIRO_AGENT_TIMEOUT_MS);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_TIMEOUT_MS;
}

/** Resolve a bound router id to the single router the session should run on. Unknown id → undefined
 *  (the caller falls back to the user's active pool / keyless floor, and warns). */
export function resolveBoundRouter(id: string): KeylessRouter | undefined {
  return registeredRouters().find((r) => r.id === id);
}

/** Run an agent once. Returns its final text. Never throws — a failed run is `{ ok:false, output }`.
 *  `depth` guards against agents recursively spawning agents (see the agent-runner chat tool). */
export async function runAgent(
  def: AgentDef,
  opts: { cwd?: string; input?: string } = {},
): Promise<AgentRunResult> {
  const bound = def.router ? resolveBoundRouter(def.router) : undefined;
  const routers = bound ? [bound] : undefined; // undefined → assembler uses the active pool / floor
  const cwd = opts.cwd ?? def.cwd ?? process.cwd();

  let session: AgentSession;
  try {
    ({ session } = await assembleOriroSession({ cwd, ...(routers ? { routers } : {}) }));
  } catch (e) {
    return { ok: false, output: e instanceof Error ? e.message : String(e) };
  }

  let out = "";
  const unsub = session.subscribe(
    (e: { type: string; assistantMessageEvent?: { type: string; delta?: string } }) => {
      if (e.type === "message_update" && e.assistantMessageEvent?.type === "text_delta") {
        out += e.assistantMessageEvent.delta ?? "";
      }
    },
  );

  const prompt = opts.input ? `${def.task}\n\nInput:\n${opts.input}` : def.task;
  // Mark that we're one level deeper so a saved-agent chat tool can refuse to recurse.
  const prevDepth = process.env.ORIRO_AGENT_DEPTH;
  process.env.ORIRO_AGENT_DEPTH = String((Number(prevDepth) || 0) + 1);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // Race the run against a hard timeout — a wedged router must never hang an unattended run.
    const timedOut = await Promise.race([
      session.prompt(prompt).then(() => false),
      new Promise<boolean>((res) => { timer = setTimeout(() => res(true), runTimeoutMs()); }),
    ]);
    if (timedOut) {
      const partial = scrubOutput(out).trim();
      return { ok: false, output: partial || `agent timed out after ${Math.round(runTimeoutMs() / 1000)}s` };
    }
  } catch (e) {
    return { ok: false, output: e instanceof Error ? e.message : String(e) };
  } finally {
    if (timer) clearTimeout(timer);
    unsub();
    try { session.dispose(); } catch { /* best-effort — also cancels an in-flight prompt on timeout */ }
    if (prevDepth === undefined) delete process.env.ORIRO_AGENT_DEPTH;
    else process.env.ORIRO_AGENT_DEPTH = prevDepth;
  }

  const cleaned = scrubOutput(out).trim();
  return { ok: cleaned.length > 0, output: cleaned };
}
