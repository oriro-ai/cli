/**
 * Tests cron-triggered tool assembly.
 * Ensures cron runs scope cron tool behavior to self-removal of the current
 * job only.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnyAgentTool } from "./tools/common.js";

const mocks = vi.hoisted(() => {
  const stubTool = (name: string) =>
    ({
      name,
      label: name,
      displaySummary: name,
      description: name,
      parameters: { type: "object", properties: {} },
      execute: vi.fn(),
    }) satisfies AnyAgentTool;

  return {
    createOriroToolsOptions: vi.fn(),
    stubTool,
  };
});

vi.mock("./oriro-tools.js", () => ({
  createOriroTools: (options: unknown) => {
    mocks.createOriroToolsOptions(options);
    return [mocks.stubTool("cron")];
  },
}));

import "./test-helpers/fast-bash-tools.js";
import "./test-helpers/fast-coding-tools.js";
import { createOriroCodingTools } from "./agent-tools.js";

function firstOriroToolsOptions(): { cronSelfRemoveOnlyJobId?: string } | undefined {
  return mocks.createOriroToolsOptions.mock.calls[0]?.[0] as
    | { cronSelfRemoveOnlyJobId?: string }
    | undefined;
}

describe("createOriroCodingTools cron scope", () => {
  beforeEach(() => {
    mocks.createOriroToolsOptions.mockClear();
  });

  it("scopes cron-triggered jobs to self-removal", () => {
    const tools = createOriroCodingTools({
      trigger: "cron",
      jobId: "job-current",
    });

    expect(tools.map((tool) => tool.name)).toContain("cron");
    expect(firstOriroToolsOptions()?.cronSelfRemoveOnlyJobId).toBe("job-current");
  });

  it("does not scope non-cron sessions", () => {
    createOriroCodingTools({
      trigger: "user",
      jobId: "job-current",
    });

    expect(firstOriroToolsOptions()?.cronSelfRemoveOnlyJobId).toBeUndefined();
  });
});
