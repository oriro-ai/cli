// Env deprecation tests ensure legacy prefixed variables warn once without
// leaking secret-shaped names or values.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureEnv, deleteTestEnvValue, withEnv } from "../test-utils/env.js";
import { resetLegacyOriroEnvWarningForTest, warnLegacyOriroEnvVars } from "./env-deprecation.js";

describe("warnLegacyOriroEnvVars", () => {
  let envSnapshot: ReturnType<typeof captureEnv>;
  let emitWarning: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    envSnapshot = captureEnv(["NODE_ENV", "VITEST"]);
    resetLegacyOriroEnvWarningForTest();
    emitWarning = vi.spyOn(process, "emitWarning").mockImplementation(() => {});
    deleteTestEnvValue("NODE_ENV");
    deleteTestEnvValue("VITEST");
  });

  afterEach(() => {
    emitWarning.mockRestore();
    resetLegacyOriroEnvWarningForTest();
    envSnapshot.restore();
  });

  it("warns with counts and prefixes instead of secret-shaped env names", () => {
    warnLegacyOriroEnvVars({
      CLAWDBOT_GATEWAY_TOKEN: "old-token",
      ORIRO_GATEWAY_PASSWORD: "old-password", // pragma: allowlist secret
      "CLAWDBOT_MALICIOUS\nforged": "old-value",
    });

    expect(emitWarning).toHaveBeenCalledOnce();
    const [message, options] = emitWarning.mock.calls.at(0) as [
      string,
      { code: string; type: string },
    ];
    expect(message).toContain("Legacy environment variables");
    expect(message).toContain("3 total");
    expect(message).not.toContain("CLAWDBOT");
    expect(message).toContain("replacing the legacy prefix with ORIRO_");
    expect(message).not.toContain("GATEWAY_TOKEN");
    expect(message).not.toContain("GATEWAY_PASSWORD");
    expect(message).not.toContain("forged");
    expect(options).toEqual({
      code: "ORIRO_LEGACY_ENV_VARS",
      type: "DeprecationWarning",
    });
  });

  it("does not warn for current ORIRO names", () => {
    warnLegacyOriroEnvVars({ ORIRO_GATEWAY_TOKEN: "token" });

    expect(emitWarning).not.toHaveBeenCalled();
  });

  it("warns only once after a successful emit", () => {
    warnLegacyOriroEnvVars({ CLAWDBOT_GATEWAY_TOKEN: "old-token" });
    warnLegacyOriroEnvVars({ ORIRO_GATEWAY_TOKEN: "old-token" });

    expect(emitWarning).toHaveBeenCalledOnce();
  });

  it("retries if emitWarning throws before the warning is emitted", () => {
    emitWarning
      .mockImplementationOnce(() => {
        throw new Error("warning sink failed");
      })
      .mockImplementationOnce(() => {});

    expect(() => warnLegacyOriroEnvVars({ CLAWDBOT_GATEWAY_TOKEN: "old-token" })).toThrow(
      "warning sink failed",
    );
    warnLegacyOriroEnvVars({ CLAWDBOT_GATEWAY_TOKEN: "old-token" });

    expect(emitWarning).toHaveBeenCalledTimes(2);
  });

  it("suppresses warning noise based on the passed env", () => {
    warnLegacyOriroEnvVars({
      CLAWDBOT_GATEWAY_TOKEN: "old-token",
      VITEST: "true",
    });

    expect(emitWarning).not.toHaveBeenCalled();
  });

  it("does not let process.env test flags suppress a synthetic env", () => {
    withEnv({ VITEST: "true" }, () => {
      warnLegacyOriroEnvVars({ CLAWDBOT_GATEWAY_TOKEN: "old-token" });

      expect(emitWarning).toHaveBeenCalledOnce();
    });
  });
});
