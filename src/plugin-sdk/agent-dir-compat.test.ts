/**
 * Tests agent directory compatibility helpers.
 */
import { describe, expect, it } from "vitest";
import { resolveOriroAgentDir } from "./agent-dir-compat.js";

describe("resolveOriroAgentDir", () => {
  it("keeps the shipped Pi env alias for deprecated plugin SDK callers", () => {
    expect(
      resolveOriroAgentDir({
        PI_CODING_AGENT_DIR: "/tmp/oriro-legacy-agent",
      }),
    ).toBe("/tmp/oriro-legacy-agent");
  });

  it("prefers the Oriro env override over the deprecated Pi alias", () => {
    expect(
      resolveOriroAgentDir({
        ORIRO_AGENT_DIR: "/tmp/oriro-agent",
        PI_CODING_AGENT_DIR: "/tmp/oriro-legacy-agent",
      }),
    ).toBe("/tmp/oriro-agent");
  });
});
