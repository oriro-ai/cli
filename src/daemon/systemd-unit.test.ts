// Systemd unit tests cover generated systemd unit files.
import { describe, expect, it } from "vitest";
import { buildSystemdUnit } from "./systemd-unit.js";

describe("buildSystemdUnit", () => {
  it("quotes arguments with whitespace", () => {
    const unit = buildSystemdUnit({
      description: "Oriro Gateway",
      programArguments: ["/usr/bin/oriro", "gateway", "--name", "My Bot"],
      environment: {},
    });
    const execStart = unit.split("\n").find((line) => line.startsWith("ExecStart="));
    expect(execStart).toBe('ExecStart=/usr/bin/oriro gateway --name "My Bot"');
  });

  it("renders control-group kill mode for child-process cleanup", () => {
    const unit = buildSystemdUnit({
      description: "Oriro Gateway",
      programArguments: ["/usr/bin/oriro", "gateway", "run"],
      environment: {},
    });
    expect(unit).toContain("KillMode=control-group");
    expect(unit).toContain("TimeoutStopSec=30");
    expect(unit).toContain("TimeoutStartSec=30");
    expect(unit).toContain("SuccessExitStatus=0 143");
    expect(unit).toContain("StartLimitBurst=5");
    expect(unit).toContain("StartLimitIntervalSec=60");
    expect(unit).toContain("RestartPreventExitStatus=78");
  });

  it("rejects environment values with line breaks", () => {
    expect(() =>
      buildSystemdUnit({
        description: "Oriro Gateway",
        programArguments: ["/usr/bin/oriro", "gateway", "start"],
        environment: {
          INJECT: "ok\nExecStartPre=/bin/touch /tmp/oc15789_rce",
        },
      }),
    ).toThrow(/CR or LF/);
  });

  it("renders EnvironmentFile entries before inline Environment values", () => {
    const unit = buildSystemdUnit({
      description: "Oriro Gateway",
      programArguments: ["/usr/bin/oriro", "gateway", "run"],
      environmentFiles: ["/home/test/.oriro/.env"],
      environment: {
        ORIRO_GATEWAY_PORT: "18789",
      },
    });
    expect(unit).toContain("EnvironmentFile=-/home/test/.oriro/.env");
    expect(unit).toContain("Environment=ORIRO_GATEWAY_PORT=18789");
    expect(unit.indexOf("EnvironmentFile=-/home/test/.oriro/.env")).toBeLessThan(
      unit.indexOf("Environment=ORIRO_GATEWAY_PORT=18789"),
    );
  });
});
