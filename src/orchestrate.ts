// ORIRO Step 7 — OR-FREE multi-agent orchestration. BUILT FRESH on Pi (Pi has no native
// sub-agents — there is nothing inherited/OpenClaw to disturb). The router can fan work out to
// isolated child agents — "deploy 4 QA + 2 coders, run the tests" — each spawned as its own
// createAgentSession on the keyless Mux. OR-FREE by construction: every child uses the free
// pool/floor, so a sub-agent can never silently need a paid key. Purely additive; zero footprint.
import { createAgentSession, AuthStorage, ModelRegistry, SessionManager } from "@earendil-works/pi-coding-agent";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { registerOriroMux } from "./routers/mux-provider.js";

export interface AgentSpec {
  role: string;
  task: string;
}
export interface AgentResult {
  role: string;
  task: string;
  ok: boolean;
  output: string;
}

const MAX_AGENTS = 8;
const MAX_CONCURRENCY = 4;

/** One child-agent attempt on the FREE pool (OR-FREE): role + task → output. Never throws. */
async function runOnce(spec: AgentSpec): Promise<AgentResult> {
  const authStorage = AuthStorage.inMemory();
  const modelRegistry = ModelRegistry.inMemory(authStorage);
  const model = registerOriroMux(modelRegistry); // free pool/floor — never a paid key
  if (!model) return { ...spec, ok: false, output: "no free model available" };
  const { session } = await createAgentSession({
    model,
    authStorage,
    modelRegistry,
    sessionManager: SessionManager.inMemory(),
    noTools: "all",
  });
  let out = "";
  const unsub = session.subscribe((e: { type: string; assistantMessageEvent?: { type: string; delta?: string } }) => {
    if (e.type === "message_update" && e.assistantMessageEvent?.type === "text_delta") out += e.assistantMessageEvent.delta ?? "";
  });
  try {
    await session.prompt(`You are the ${spec.role} sub-agent. ${spec.task}`);
  } catch (e) {
    return { ...spec, ok: false, output: e instanceof Error ? e.message : String(e) };
  } finally {
    unsub();
    session.dispose();
  }
  return { ...spec, ok: out.trim().length > 0, output: out.trim() };
}

/** Spawn a child agent with one retry — free routers occasionally return empty under concurrent load. */
async function runAgent(spec: AgentSpec): Promise<AgentResult> {
  let last = await runOnce(spec);
  if (!last.ok) last = await runOnce(spec);
  return last;
}

/** Bounded-concurrency map. */
async function runPool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  async function worker(): Promise<void> {
    while (i < items.length) {
      const idx = i++;
      const item = items[idx];
      if (item === undefined) continue;
      results[idx] = await fn(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, () => worker()));
  return results;
}

/** OR-FREE orchestration: spawn agents on the free pool — parallel (default) or chained. */
export async function orchestrate(opts: { agents: AgentSpec[]; mode?: "parallel" | "chain" }): Promise<AgentResult[]> {
  const agents = opts.agents.slice(0, MAX_AGENTS);
  if ((opts.mode ?? "parallel") === "chain") {
    const results: AgentResult[] = [];
    let prev = "";
    for (const a of agents) {
      const r = await runAgent({ role: a.role, task: prev ? `${a.task}\n\nPrevious result:\n${prev}` : a.task });
      results.push(r);
      prev = r.output;
    }
    return results;
  }
  return runPool(agents, MAX_CONCURRENCY, runAgent);
}

/** Register the orchestrator tool — the router calls it on NL like "deploy 4 QA + 2 coders". */
export function registerOrchestrator(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "deploy_agents",
    label: "ORIRO Orchestrator",
    description:
      "Deploy multiple sub-agents in parallel (or chained) to do work — e.g. 'spawn 4 QA + 2 coders, " +
      "run the tests'. Each sub-agent runs FREE on the router pool. Give each agent a role and a task.",
    parameters: Type.Object({
      agents: Type.Array(Type.Object({ role: Type.String(), task: Type.String() }), {
        description: "The sub-agents to deploy (max 8).",
      }),
      mode: Type.Optional(Type.Union([Type.Literal("parallel"), Type.Literal("chain")])),
    }),
    async execute(_id, params) {
      const results = await orchestrate({ agents: params.agents, mode: params.mode });
      const text = results.map((r) => `[${r.role}] ${r.ok ? "✓" : "✗"} ${r.output.slice(0, 300)}`).join("\n");
      return { content: [{ type: "text" as const, text }], details: { results } };
    },
  });
}
