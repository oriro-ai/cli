// Covers process respawn behavior across supervisors.
import { afterEach, describe, expect, it, vi } from "vitest";
import { captureFullEnv, deleteTestEnvValue } from "../test-utils/env.js";
import { mockProcessPlatform } from "../test-utils/vitest-spies.js";
import { SUPERVISOR_HINT_ENV_VARS } from "./supervisor-markers.js";

const spawnMock = vi.hoisted(() => vi.fn());
const triggerOriroRestartMock = vi.hoisted(() => vi.fn());
const isContainerEnvironmentMock = vi.hoisted(() => vi.fn(() => false));

vi.mock("node:child_process", async () => {
  const { mockNodeBuiltinModule } = await import("oriro/plugin-sdk/test-node-mocks");
  return mockNodeBuiltinModule(
    () => vi.importActual<typeof import("node:child_process")>("node:child_process"),
    {
      spawn: (...args: unknown[]) => spawnMock(...args),
    },
  );
});
vi.mock("./restart.js", () => ({
  triggerOriroRestart: (...args: unknown[]) => triggerOriroRestartMock(...args),
}));
vi.mock("./container-environment.js", () => ({
  isContainerEnvironment: () => isContainerEnvironmentMock(),
}));

import {
  respawnGatewayProcessForUpdate,
  restartGatewayProcessWithFreshPid,
} from "./process-respawn.js";

const originalArgv = [...process.argv];
const originalExecArgv = [...process.execArgv];
const envSnapshot = captureFullEnv();

function setPlatform(platform: NodeJS.Platform) {
  mockProcessPlatform(platform);
}

afterEach(() => {
  envSnapshot.restore();
  process.argv = [...originalArgv];
  process.execArgv = [...originalExecArgv];
  spawnMock.mockClear();
  triggerOriroRestartMock.mockClear();
  isContainerEnvironmentMock.mockReset();
  isContainerEnvironmentMock.mockReturnValue(false);
  vi.restoreAllMocks();
});

function clearSupervisorHints() {
  for (const key of SUPERVISOR_HINT_ENV_VARS) {
    deleteTestEnvValue(key);
  }
}

function expectLaunchdSupervisedWithoutKickstart(params?: { launchJobLabel?: string }) {
  setPlatform("darwin");
  if (params?.launchJobLabel) {
    process.env.LAUNCH_JOB_LABEL = params.launchJobLabel;
  }
  process.env.ORIRO_LAUNCHD_LABEL = "ai.oriro.gateway";
  const result = restartGatewayProcessWithFreshPid();
  expect(result).toEqual({ mode: "supervised" });
  expect(triggerOriroRestartMock).not.toHaveBeenCalled();
  expect(spawnMock).not.toHaveBeenCalled();
}

describe("restartGatewayProcessWithFreshPid", () => {
  it("returns disabled when ORIRO_NO_RESPAWN is set", () => {
    process.env.ORIRO_NO_RESPAWN = "1";
    const result = restartGatewayProcessWithFreshPid();
    expect(result.mode).toBe("disabled");
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("keeps ORIRO_NO_RESPAWN ahead of inherited supervisor hints", () => {
    clearSupervisorHints();
    setPlatform("darwin");
    process.env.ORIRO_NO_RESPAWN = "1";
    process.env.LAUNCH_JOB_LABEL = "ai.oriro.gateway";

    const result = restartGatewayProcessWithFreshPid();

    expect(result).toEqual({ mode: "disabled" });
    expect(triggerOriroRestartMock).not.toHaveBeenCalled();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("returns supervised when Oriro launchd markers are present on macOS (no kickstart)", () => {
    clearSupervisorHints();
    expectLaunchdSupervisedWithoutKickstart({ launchJobLabel: "ai.oriro.gateway" });
  });

  it("returns supervised for a real gateway launchd job without the injected marker", () => {
    clearSupervisorHints();
    setPlatform("darwin");
    process.env.LAUNCH_JOB_LABEL = "ai.oriro.gateway";

    const result = restartGatewayProcessWithFreshPid();

    expect(result.mode).toBe("supervised");
    expect(triggerOriroRestartMock).not.toHaveBeenCalled();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("returns supervised for a real gateway XPC launchd job without the injected marker", () => {
    clearSupervisorHints();
    setPlatform("darwin");
    process.env.XPC_SERVICE_NAME = "ai.oriro.gateway";

    const result = restartGatewayProcessWithFreshPid();

    expect(result.mode).toBe("supervised");
    expect(triggerOriroRestartMock).not.toHaveBeenCalled();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("returns supervised on macOS when launchd label is set (no kickstart)", () => {
    expectLaunchdSupervisedWithoutKickstart({ launchJobLabel: "ai.oriro.gateway" });
  });

  it("launchd supervisor never returns failed regardless of triggerOriroRestart outcome", () => {
    clearSupervisorHints();
    setPlatform("darwin");
    process.env.ORIRO_LAUNCHD_LABEL = "ai.oriro.gateway";
    // Even if triggerOriroRestart *would* fail, launchd path must not call it.
    triggerOriroRestartMock.mockReturnValue({
      ok: false,
      method: "launchctl",
      detail: "Bootstrap failed: 5: Input/output error",
    });
    const result = restartGatewayProcessWithFreshPid();
    expect(result.mode).toBe("supervised");
    expect(result.mode).not.toBe("failed");
    expect(triggerOriroRestartMock).not.toHaveBeenCalled();
  });

  it("does not schedule kickstart on non-darwin platforms", () => {
    setPlatform("linux");
    process.env.INVOCATION_ID = "abc123";
    process.env.ORIRO_LAUNCHD_LABEL = "ai.oriro.gateway";

    const result = restartGatewayProcessWithFreshPid();

    expect(result.mode).toBe("supervised");
    expect(triggerOriroRestartMock).not.toHaveBeenCalled();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("does not treat inherited XPC_SERVICE_NAME as launchd supervision", () => {
    clearSupervisorHints();
    setPlatform("darwin");
    process.env.XPC_SERVICE_NAME = "ai.oriro.mac";
    process.env.ORIRO_PROFILE = "mac";

    const result = restartGatewayProcessWithFreshPid();

    expect(result).toEqual({
      mode: "disabled",
      detail: "unmanaged: use in-process restart to keep custom supervisor PID tracking stable",
    });
    expect(triggerOriroRestartMock).not.toHaveBeenCalled();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("uses in-process restart on unmanaged Unix so custom supervisors keep the tracked PID", () => {
    delete process.env.ORIRO_NO_RESPAWN;
    clearSupervisorHints();
    setPlatform("linux");
    process.execArgv = ["--import", "tsx"];
    process.argv = ["/usr/local/bin/node", "/repo/dist/index.js", "gateway", "run"];
    spawnMock.mockReturnValue({ pid: 4242, unref: vi.fn() });

    const result = restartGatewayProcessWithFreshPid();

    expect(result).toEqual({
      mode: "disabled",
      detail: "unmanaged: use in-process restart to keep custom supervisor PID tracking stable",
    });
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("returns supervised when ORIRO_LAUNCHD_LABEL is set (stock launchd plist)", () => {
    clearSupervisorHints();
    expectLaunchdSupervisedWithoutKickstart();
  });

  it("returns supervised when ORIRO_SYSTEMD_UNIT is set", () => {
    clearSupervisorHints();
    setPlatform("linux");
    process.env.ORIRO_SYSTEMD_UNIT = "oriro-gateway.service";
    const result = restartGatewayProcessWithFreshPid();
    expect(result.mode).toBe("supervised");
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("returns supervised when Oriro gateway task markers are set on Windows", () => {
    clearSupervisorHints();
    setPlatform("win32");
    process.env.ORIRO_SERVICE_MARKER = "oriro";
    process.env.ORIRO_SERVICE_KIND = "gateway";
    triggerOriroRestartMock.mockReturnValue({ ok: true, method: "schtasks" });
    const result = restartGatewayProcessWithFreshPid();
    expect(result.mode).toBe("supervised");
    expect(triggerOriroRestartMock).toHaveBeenCalledOnce();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("keeps generic service markers out of non-Windows supervisor detection", () => {
    clearSupervisorHints();
    setPlatform("linux");
    process.env.ORIRO_SERVICE_MARKER = "oriro";
    process.env.ORIRO_SERVICE_KIND = "gateway";

    const result = restartGatewayProcessWithFreshPid();

    expect(result).toEqual({
      mode: "disabled",
      detail: "unmanaged: use in-process restart to keep custom supervisor PID tracking stable",
    });
    expect(triggerOriroRestartMock).not.toHaveBeenCalled();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("returns disabled on Windows without Scheduled Task markers", () => {
    clearSupervisorHints();
    setPlatform("win32");

    const result = restartGatewayProcessWithFreshPid();

    expect(result.mode).toBe("disabled");
    expect(result.detail).toContain("Scheduled Task");
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("returns disabled in containers so PID 1 stays alive for in-process restart", () => {
    delete process.env.ORIRO_NO_RESPAWN;
    clearSupervisorHints();
    setPlatform("linux");
    isContainerEnvironmentMock.mockReturnValue(true);

    const result = restartGatewayProcessWithFreshPid();

    expect(result).toEqual({
      mode: "disabled",
      detail: "container: use in-process restart to keep PID 1 alive",
    });
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("ignores node task script hints for gateway restart detection on Windows", () => {
    clearSupervisorHints();
    setPlatform("win32");
    process.env.ORIRO_TASK_SCRIPT = "C:\\oriro\\node.cmd";
    process.env.ORIRO_TASK_SCRIPT_NAME = "node.cmd";
    process.env.ORIRO_SERVICE_MARKER = "oriro";
    process.env.ORIRO_SERVICE_KIND = "node";

    const result = restartGatewayProcessWithFreshPid();

    expect(result.mode).toBe("disabled");
    expect(triggerOriroRestartMock).not.toHaveBeenCalled();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("does not attempt detached spawn on unmanaged Unix even if spawn would throw", () => {
    delete process.env.ORIRO_NO_RESPAWN;
    clearSupervisorHints();
    setPlatform("linux");

    spawnMock.mockImplementation(() => {
      throw new Error("spawn failed");
    });
    const result = restartGatewayProcessWithFreshPid();
    expect(result).toEqual({
      mode: "disabled",
      detail: "unmanaged: use in-process restart to keep custom supervisor PID tracking stable",
    });
    expect(spawnMock).not.toHaveBeenCalled();
  });
});

describe("respawnGatewayProcessForUpdate", () => {
  it("keeps ORIRO_NO_RESPAWN semantics for update restarts", () => {
    clearSupervisorHints();
    process.env.ORIRO_NO_RESPAWN = "1";

    const result = respawnGatewayProcessForUpdate();

    expect(result).toEqual({ mode: "disabled", detail: "ORIRO_NO_RESPAWN" });
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("allows detached respawn on unmanaged Windows during updates", () => {
    clearSupervisorHints();
    setPlatform("win32");
    process.execArgv = [];
    process.argv = [
      "C:\\Program Files\\node.exe",
      "C:\\oriro\\node_modules\\.pnpm\\oriro@2026.6.5\\node_modules\\oriro\\dist\\index.js",
      "gateway",
      "run",
    ];
    spawnMock.mockReturnValue({ pid: 5151, unref: vi.fn(), kill: vi.fn() });

    const result = respawnGatewayProcessForUpdate();

    expect(result.mode).toBe("spawned");
    expect(result.pid).toBe(5151);
    expect(spawnMock).toHaveBeenCalledWith(
      process.execPath,
      ["C:\\oriro\\node_modules\\oriro\\oriro.mjs", "gateway", "run"],
      {
        detached: true,
        env: process.env,
        stdio: "inherit",
      },
    );
  });

  it("rewrites a pnpm-versioned Oriro entry before detached update respawn", () => {
    clearSupervisorHints();
    setPlatform("linux");
    process.execArgv = [];
    process.argv = [
      "/usr/local/bin/node",
      "/app/node_modules/.pnpm/oriro@2026.6.5/node_modules/oriro/dist/entry.js",
      "gateway",
      "run",
    ];
    spawnMock.mockReturnValue({ pid: 7171, unref: vi.fn(), kill: vi.fn() });

    const result = respawnGatewayProcessForUpdate();

    expect(result.mode).toBe("spawned");
    expect(spawnMock).toHaveBeenCalledWith(
      process.execPath,
      ["/app/node_modules/oriro-ai/cli.mjs", "gateway", "run"],
      {
        detached: true,
        env: process.env,
        stdio: "inherit",
      },
    );
  });

  it("does not rewrite another package's pnpm-versioned entry", () => {
    clearSupervisorHints();
    setPlatform("linux");
    process.execArgv = [];
    const entry =
      "/app/node_modules/.pnpm/@anthropic+sdk@1.0.0/node_modules/@anthropic/sdk/dist/index.js";
    process.argv = ["/usr/local/bin/node", entry, "gateway", "run"];
    spawnMock.mockReturnValue({ pid: 8181, unref: vi.fn(), kill: vi.fn() });

    respawnGatewayProcessForUpdate();

    expect(spawnMock).toHaveBeenCalledWith(process.execPath, [entry, "gateway", "run"], {
      detached: true,
      env: process.env,
      stdio: "inherit",
    });
  });

  it("spawns a detached update process when macOS only has inherited XPC state", () => {
    clearSupervisorHints();
    setPlatform("darwin");
    process.env.XPC_SERVICE_NAME = "ai.oriro.mac";
    process.execArgv = [];
    process.argv = ["/usr/local/bin/node", "/repo/dist/index.js", "gateway", "run"];
    spawnMock.mockReturnValue({ pid: 6161, unref: vi.fn(), kill: vi.fn() });

    const result = respawnGatewayProcessForUpdate();

    expect(result.mode).toBe("spawned");
    expect(result.pid).toBe(6161);
    expect(spawnMock).toHaveBeenCalledWith(
      process.execPath,
      ["/repo/dist/index.js", "gateway", "run"],
      {
        detached: true,
        env: process.env,
        stdio: "inherit",
      },
    );
  });

  it("treats Linux Oriro gateway service markers as supervised for update restarts", () => {
    clearSupervisorHints();
    setPlatform("linux");
    process.env.ORIRO_SERVICE_MARKER = "oriro";
    process.env.ORIRO_SERVICE_KIND = "gateway";

    const result = respawnGatewayProcessForUpdate();

    expect(result).toEqual({ mode: "supervised" });
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("returns failed when update detached respawn throws", () => {
    delete process.env.ORIRO_NO_RESPAWN;
    clearSupervisorHints();
    setPlatform("linux");

    spawnMock.mockImplementation(() => {
      throw new Error("spawn failed");
    });

    const result = respawnGatewayProcessForUpdate();

    expect(result.mode).toBe("failed");
    expect(result.detail).toContain("spawn failed");
  });
});
