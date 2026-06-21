// Verifies the `Agent` on-device orchestration tool maps onto the spawn engine
// and enforces OR-FREE routing (no paid model override, no ACP runtime).
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  spawnSubagentDirect: vi.fn(),
}));

vi.mock("../subagent-spawn.js", () => ({
  spawnSubagentDirect: hoisted.spawnSubagentDirect,
}));

import { createAgentTool, __testing } from "./agent-tool.js";

function lastSpawnCall() {
  const call = hoisted.spawnSubagentDirect.mock.calls.at(-1);
  if (!call) {
    throw new Error("spawnSubagentDirect was not called");
  }
  return { params: call[0] as Record<string, unknown>, ctx: call[1] as Record<string, unknown> };
}

describe("Agent on-device orchestration tool", () => {
  beforeEach(() => {
    hoisted.spawnSubagentDirect.mockReset();
    hoisted.spawnSubagentDirect.mockResolvedValue({ status: "accepted", runId: "run-1" });
  });

  it("maps onto spawnSubagentDirect with the role scoped allowlist", async () => {
    const tool = createAgentTool({ agentSessionKey: "agent:main:main" });
    await tool.execute("call-1", {
      subagent_type: "coder",
      prompt: "implement the feature",
      description: "feature work",
    });

    const { params, ctx } = lastSpawnCall();
    expect(params.task).toBe("implement the feature");
    expect(params.label).toBe("feature work");
    expect(params.mode).toBe("run");
    expect(ctx.agentSessionKey).toBe("agent:main:main");
    expect(ctx.inheritedToolAllowlist).toEqual(__testing.AGENT_ROLE_TOOL_ALLOWLIST.coder);
  });

  it("enforces OR-FREE: never passes a model override or ACP runtime", async () => {
    const tool = createAgentTool({ agentSessionKey: "agent:main:main" });
    await tool.execute("call-1", { subagent_type: "explore", prompt: "search the repo" });

    const { params } = lastSpawnCall();
    // No paid external escape hatches: no model override, no runtime selection.
    expect(params).not.toHaveProperty("model");
    expect(params).not.toHaveProperty("runtime");
    expect(params.model).toBeUndefined();
  });

  it("read-only roles get a read-only allowlist (no write/exec)", async () => {
    const tool = createAgentTool({ agentSessionKey: "agent:main:main" });
    for (const role of ["explore", "plan"] as const) {
      const allow = __testing.AGENT_ROLE_TOOL_ALLOWLIST[role];
      expect(allow).not.toContain("write");
      expect(allow).not.toContain("edit");
      expect(allow).not.toContain("exec");
      expect(allow).not.toContain("apply_patch");
    }
    // coder is the only role permitted to mutate / run shells.
    expect(__testing.AGENT_ROLE_TOOL_ALLOWLIST.coder).toContain("apply_patch");
    expect(__testing.AGENT_ROLE_TOOL_ALLOWLIST.coder).toContain("exec");
  });

  it("run_in_background drops the completion-message expectation", async () => {
    const tool = createAgentTool({ agentSessionKey: "agent:main:main" });
    await tool.execute("call-1", {
      subagent_type: "plan",
      prompt: "plan the work",
      run_in_background: true,
    });

    const { params } = lastSpawnCall();
    expect(params.expectsCompletionMessage).toBe(false);
  });

  it("intersects the role allowlist with a restricted inherited allowlist", async () => {
    // A restricted parent must not be widened by the role allowlist.
    const tool = createAgentTool({
      agentSessionKey: "agent:main:main",
      inheritedToolAllowlist: ["read"],
    });
    await tool.execute("call-1", { subagent_type: "coder", prompt: "do thing" });

    const { ctx } = lastSpawnCall();
    expect(ctx.inheritedToolAllowlist).toEqual(["read"]);
  });

  it("rejects unknown roles", async () => {
    const tool = createAgentTool({ agentSessionKey: "agent:main:main" });
    await expect(tool.execute("call-1", { subagent_type: "hacker", prompt: "x" })).rejects.toThrow(
      /Unknown subagent_type/,
    );
  });
});
