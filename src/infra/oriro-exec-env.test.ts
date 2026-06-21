// Tests Oriro execution environment construction.
import { describe, expect, it } from "vitest";
import {
  ensureOriroExecMarkerOnProcess,
  markOriroExecEnv,
  ORIRO_CLI_ENV_VALUE,
  ORIRO_CLI_ENV_VAR,
} from "./oriro-exec-env.js";

describe("markOriroExecEnv", () => {
  it("returns a cloned env object with the exec marker set", () => {
    const env = { PATH: "/usr/bin", ORIRO_CLI: "0" };
    const marked = markOriroExecEnv(env);

    expect(marked).toEqual({
      PATH: "/usr/bin",
      ORIRO_CLI: ORIRO_CLI_ENV_VALUE,
    });
    expect(marked).not.toBe(env);
    expect(env.ORIRO_CLI).toBe("0");
  });
});

describe("ensureOriroExecMarkerOnProcess", () => {
  it.each([
    {
      name: "mutates and returns the provided process env",
      env: { PATH: "/usr/bin" } as NodeJS.ProcessEnv,
    },
    {
      name: "overwrites an existing marker on the provided process env",
      env: { PATH: "/usr/bin", [ORIRO_CLI_ENV_VAR]: "0" } as NodeJS.ProcessEnv,
    },
  ])("$name", ({ env }) => {
    expect(ensureOriroExecMarkerOnProcess(env)).toBe(env);
    expect(env[ORIRO_CLI_ENV_VAR]).toBe(ORIRO_CLI_ENV_VALUE);
  });

  it("defaults to mutating process.env when no env object is provided", () => {
    const previous = process.env[ORIRO_CLI_ENV_VAR];
    delete process.env[ORIRO_CLI_ENV_VAR];

    try {
      expect(ensureOriroExecMarkerOnProcess()).toBe(process.env);
      expect(process.env[ORIRO_CLI_ENV_VAR]).toBe(ORIRO_CLI_ENV_VALUE);
    } finally {
      if (previous === undefined) {
        delete process.env[ORIRO_CLI_ENV_VAR];
      } else {
        process.env[ORIRO_CLI_ENV_VAR] = previous;
      }
    }
  });
});
