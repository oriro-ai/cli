// Run-main profile env tests cover profile environment handling in the CLI entrypoint.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureEnv, deleteTestEnvValue, setTestEnvValue } from "../test-utils/env.js";

const fileState = vi.hoisted(() => ({
  hasCliDotEnv: false,
}));

const dotenvState = vi.hoisted(() => {
  const state = {
    profileAtDotenvLoad: undefined as string | undefined,
    containerAtDotenvLoad: undefined as string | undefined,
  };
  return {
    state,
    loadDotEnv: vi.fn(() => {
      state.profileAtDotenvLoad = process.env.ORIRO_PROFILE;
      state.containerAtDotenvLoad = process.env.ORIRO_CONTAINER;
    }),
  };
});

const maybeRunCliInContainerMock = vi.hoisted(() =>
  vi.fn((argv: string[]) => ({ handled: false, argv })),
);

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  type ExistsSyncPath = Parameters<typeof actual.existsSync>[0];
  return {
    ...actual,
    existsSync: vi.fn((target: ExistsSyncPath) => {
      if (typeof target === "string" && target.endsWith(".env")) {
        return fileState.hasCliDotEnv;
      }
      return actual.existsSync(target);
    }),
  };
});

vi.mock("./dotenv.js", () => ({
  loadCliDotEnv: dotenvState.loadDotEnv,
}));

vi.mock("../infra/env.js", () => ({
  isTruthyEnvValue: (value?: string) =>
    typeof value === "string" && ["1", "on", "true", "yes"].includes(value.trim().toLowerCase()),
  normalizeEnv: vi.fn(),
}));

vi.mock("../infra/runtime-guard.js", () => ({
  assertSupportedRuntime: vi.fn(),
}));

vi.mock("../infra/path-env.js", () => ({
  ensureOriroCliOnPath: vi.fn(),
}));

vi.mock("./route.js", () => ({
  tryRouteCli: vi.fn(async () => true),
}));

vi.mock("./windows-argv.js", () => ({
  normalizeWindowsArgv: (argv: string[]) => argv,
}));

vi.mock("./container-target.js", async () => {
  const actual =
    await vi.importActual<typeof import("./container-target.js")>("./container-target.js");
  return {
    ...actual,
    maybeRunCliInContainer: maybeRunCliInContainerMock,
  };
});

import { runCli } from "./run-main.js";

describe("runCli profile env bootstrap", () => {
  const envSnapshot = captureEnv([
    "ORIRO_PROFILE",
    "ORIRO_STATE_DIR",
    "ORIRO_CONFIG_PATH",
    "ORIRO_CONTAINER",
    "ORIRO_GATEWAY_PORT",
    "ORIRO_GATEWAY_URL",
    "ORIRO_GATEWAY_TOKEN",
    "ORIRO_GATEWAY_PASSWORD",
  ]);

  beforeEach(() => {
    deleteTestEnvValue("ORIRO_PROFILE");
    deleteTestEnvValue("ORIRO_STATE_DIR");
    deleteTestEnvValue("ORIRO_CONFIG_PATH");
    deleteTestEnvValue("ORIRO_CONTAINER");
    deleteTestEnvValue("ORIRO_GATEWAY_PORT");
    deleteTestEnvValue("ORIRO_GATEWAY_URL");
    deleteTestEnvValue("ORIRO_GATEWAY_TOKEN");
    deleteTestEnvValue("ORIRO_GATEWAY_PASSWORD");
    dotenvState.state.profileAtDotenvLoad = undefined;
    dotenvState.state.containerAtDotenvLoad = undefined;
    dotenvState.loadDotEnv.mockClear();
    maybeRunCliInContainerMock.mockClear();
    fileState.hasCliDotEnv = false;
  });

  afterEach(() => {
    envSnapshot.restore();
  });

  it("applies --profile before dotenv loading", async () => {
    fileState.hasCliDotEnv = true;
    await runCli(["node", "oriro", "--profile", "rawdog", "status"]);

    expect(dotenvState.loadDotEnv).toHaveBeenCalledOnce();
    expect(dotenvState.state.profileAtDotenvLoad).toBe("rawdog");
    expect(process.env.ORIRO_PROFILE).toBe("rawdog");
  });

  it("rejects --container combined with --profile", async () => {
    await expect(
      runCli(["node", "oriro", "--container", "demo", "--profile", "rawdog", "status"]),
    ).rejects.toThrow("--container cannot be combined with --profile/--dev");

    expect(dotenvState.loadDotEnv).not.toHaveBeenCalled();
    expect(process.env.ORIRO_PROFILE).toBe("rawdog");
  });

  it("rejects --container combined with interleaved --profile", async () => {
    await expect(
      runCli(["node", "oriro", "status", "--container", "demo", "--profile", "rawdog"]),
    ).rejects.toThrow("--container cannot be combined with --profile/--dev");
  });

  it("rejects --container combined with interleaved --dev", async () => {
    await expect(
      runCli(["node", "oriro", "status", "--container", "demo", "--dev"]),
    ).rejects.toThrow("--container cannot be combined with --profile/--dev");
  });

  it("does not let dotenv change container target resolution", async () => {
    fileState.hasCliDotEnv = true;
    dotenvState.loadDotEnv.mockImplementationOnce(() => {
      process.env.ORIRO_CONTAINER = "demo";
      dotenvState.state.profileAtDotenvLoad = process.env.ORIRO_PROFILE;
      dotenvState.state.containerAtDotenvLoad = process.env.ORIRO_CONTAINER;
    });

    await runCli(["node", "oriro", "status"]);

    expect(dotenvState.loadDotEnv).toHaveBeenCalledOnce();
    expect(process.env.ORIRO_CONTAINER).toBe("demo");
    expect(dotenvState.state.containerAtDotenvLoad).toBe("demo");
    expect(maybeRunCliInContainerMock).toHaveBeenCalledWith(["node", "oriro", "status"]);
    expect(maybeRunCliInContainerMock).toHaveReturnedWith({
      handled: false,
      argv: ["node", "oriro", "status"],
    });
  });

  it("allows container mode when ORIRO_PROFILE is already set in env", async () => {
    setTestEnvValue("ORIRO_PROFILE", "work");

    await expect(
      runCli(["node", "oriro", "--container", "demo", "status"]),
    ).resolves.toBeUndefined();
  });

  it.each([
    ["ORIRO_GATEWAY_PORT", "19001"],
    ["ORIRO_GATEWAY_URL", "ws://127.0.0.1:18789"],
    ["ORIRO_GATEWAY_TOKEN", "demo-token"],
    ["ORIRO_GATEWAY_PASSWORD", "demo-password"],
  ])("allows container mode when %s is set in env", async (key, value) => {
    setTestEnvValue(key, value);

    await expect(
      runCli(["node", "oriro", "--container", "demo", "status"]),
    ).resolves.toBeUndefined();
  });

  it("allows container mode when only ORIRO_STATE_DIR is set in env", async () => {
    setTestEnvValue("ORIRO_STATE_DIR", "/tmp/oriro-host-state");

    await expect(
      runCli(["node", "oriro", "--container", "demo", "status"]),
    ).resolves.toBeUndefined();
  });

  it("allows container mode when only ORIRO_CONFIG_PATH is set in env", async () => {
    setTestEnvValue("ORIRO_CONFIG_PATH", "/tmp/oriro-host-state/oriro.json");

    await expect(
      runCli(["node", "oriro", "--container", "demo", "status"]),
    ).resolves.toBeUndefined();
  });
});
