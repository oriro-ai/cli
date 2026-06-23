// ORIRO Step 7 — OR-FREE orchestration verification (read-only; zero engine change).
// The base orchestrator/subagents are inherited from OpenClaw. This test PROVES the
// ORIRO guarantee: any spawned sub-agent with no explicit model inherits
// agents.defaults.model — which Step 6 sets to the FREE router pool. So multi-agent
// orchestration is OR-FREE by inheritance; spawning helpers never needs a paid key.
import { describe, expect, it } from "vitest";
import { resolveAgentEffectiveModelPrimary } from "./agent-scope.js";

describe("Step 7 — OR-FREE orchestration (sub-agents inherit the free pool)", () => {
  const freePoolCfg = {
    agents: {
      defaults: {
        model: { primary: "google/gemini-2.5-flash", fallbacks: ["llm7/codestral-latest"] },
      },
    },
  } as never;

  it("a freshly spawned sub-agent (no override) routes through the free pool", () => {
    expect(resolveAgentEffectiveModelPrimary(freePoolCfg, "spawned-helper-1")).toBe(
      "google/gemini-2.5-flash",
    );
    expect(resolveAgentEffectiveModelPrimary(freePoolCfg, "qa-subagent")).toBe(
      "google/gemini-2.5-flash",
    );
  });

  it("respects an explicit per-agent model, but everything else stays on the free pool", () => {
    const cfg = {
      agents: {
        defaults: { model: { primary: "google/gemini-2.5-flash" } },
        list: [{ id: "special", model: { primary: "groq/llama-3.3-70b-versatile" } }],
      },
    } as never;
    expect(resolveAgentEffectiveModelPrimary(cfg, "special")).toBe("groq/llama-3.3-70b-versatile");
    expect(resolveAgentEffectiveModelPrimary(cfg, "any-other-subagent")).toBe(
      "google/gemini-2.5-flash",
    );
  });

  it("no pool configured → no forced paid model (returns undefined, base decides)", () => {
    expect(resolveAgentEffectiveModelPrimary({ agents: {} } as never, "x")).toBeUndefined();
  });
});
