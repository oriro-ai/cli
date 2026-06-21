// Daemon runtime hint tests cover platform-specific daemon guidance.
import { describe, expect, it } from "vitest";
import { buildPlatformRuntimeLogHints, buildPlatformServiceStartHints } from "./runtime-hints.js";

describe("buildPlatformRuntimeLogHints", () => {
  it("renders launchd log hints on darwin", () => {
    expect(
      buildPlatformRuntimeLogHints({
        platform: "darwin",
        env: {
          HOME: "/Users/test",
          ORIRO_STATE_DIR: "/tmp/oriro-state",
          ORIRO_LOG_PREFIX: "gateway",
        },
        systemdServiceName: "oriro-gateway",
        windowsTaskName: "Oriro Gateway",
      }),
    ).toEqual([
      "Launchd stdout (if installed): /Users/test/Library/Logs/oriro/gateway.log",
      "Launchd stderr (if installed): suppressed",
      "Restart attempts: /tmp/oriro-state/logs/gateway-restart.log",
    ]);
  });

  it("renders systemd and windows hints by platform", () => {
    expect(
      buildPlatformRuntimeLogHints({
        platform: "linux",
        env: {
          ORIRO_STATE_DIR: "/tmp/oriro-state",
        },
        systemdServiceName: "oriro-gateway",
        windowsTaskName: "Oriro Gateway",
      }),
    ).toEqual([
      "Logs: journalctl --user -u oriro-gateway.service -n 200 --no-pager",
      "Restart attempts: /tmp/oriro-state/logs/gateway-restart.log",
    ]);
    expect(
      buildPlatformRuntimeLogHints({
        platform: "win32",
        env: {
          ORIRO_STATE_DIR: "/tmp/oriro-state",
        },
        systemdServiceName: "oriro-gateway",
        windowsTaskName: "Oriro Gateway",
      }),
    ).toEqual([
      'Logs: schtasks /Query /TN "Oriro Gateway" /V /FO LIST',
      "Restart attempts: /tmp/oriro-state/logs/gateway-restart.log",
    ]);
  });
});

describe("buildPlatformServiceStartHints", () => {
  it("builds platform-specific service start hints", () => {
    expect(
      buildPlatformServiceStartHints({
        platform: "darwin",
        installCommand: "oriro gateway install",
        startCommand: "oriro gateway",
        launchAgentPlistPath: "~/Library/LaunchAgents/com.oriro.gateway.plist",
        systemdServiceName: "oriro-gateway",
        windowsTaskName: "Oriro Gateway",
      }),
    ).toEqual([
      "oriro gateway install",
      "oriro gateway",
      "launchctl bootstrap gui/$UID ~/Library/LaunchAgents/com.oriro.gateway.plist",
    ]);
    expect(
      buildPlatformServiceStartHints({
        platform: "linux",
        installCommand: "oriro gateway install",
        startCommand: "oriro gateway",
        launchAgentPlistPath: "~/Library/LaunchAgents/com.oriro.gateway.plist",
        systemdServiceName: "oriro-gateway",
        windowsTaskName: "Oriro Gateway",
      }),
    ).toEqual([
      "oriro gateway install",
      "oriro gateway",
      "systemctl --user start oriro-gateway.service",
    ]);
  });
});
