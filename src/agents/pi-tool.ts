// ORIRO Agents — the CHAT tool. Exposes the user's saved agents to the running ORIRO session so the
// model can invoke one on natural language ("run my daily-digest agent"). Registered as a Pi
// extension factory alongside Guardian/Head/Scriber. Recursion-guarded: an agent run cannot itself
// spawn more agent runs (ORIRO_AGENT_DEPTH), so automations can't fork-bomb.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { listAgents, loadAgent, markRun } from "./store.js";
import { runAgent } from "./run.js";

export function registerAgentRunner(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "run_saved_agent",
    label: "ORIRO Agent",
    description:
      "Run one of the user's SAVED automation agents by name (list them first if unsure). Each agent " +
      "is a stored workflow that runs on its own router with full tools behind Guardian. Optionally " +
      "pass `input` to feed the agent. Use this when the user asks to run/trigger a named agent.",
    parameters: Type.Object({
      name: Type.String({ description: "the saved agent's name" }),
      input: Type.Optional(Type.String({ description: "optional input to pass to the agent" })),
    }),
    async execute(_id, params) {
      // Refuse to recurse — an agent run must not spawn further agent runs.
      if (process.env.ORIRO_AGENT_DEPTH) {
        return { content: [{ type: "text" as const, text: "Nested agent runs are disabled." }], details: { ok: false } };
      }
      const def = loadAgent(params.name);
      if (!def) {
        const names = listAgents().map((a) => a.name);
        const hint = names.length ? ` Saved agents: ${names.join(", ")}.` : " No agents saved yet.";
        return { content: [{ type: "text" as const, text: `No agent named '${params.name}'.${hint}` }], details: { ok: false } };
      }
      const result = await runAgent(def, params.input ? { input: params.input } : {});
      markRun(def.name, result.ok, Date.now());
      const status = result.ok ? "✓" : "✗";
      return {
        content: [{ type: "text" as const, text: `[${def.name}] ${status}\n${result.output.slice(0, 4000)}` }],
        details: { ok: result.ok },
      };
    },
  });
}
