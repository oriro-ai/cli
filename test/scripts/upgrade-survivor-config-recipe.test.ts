// Upgrade Survivor Config Recipe tests cover upgrade survivor config recipe script behavior.
import { describe, expect, it } from "vitest";
import {
  CONFIG_COMMAND_MAX_BUFFER_BYTES,
  CONFIG_COMMAND_TIMEOUT_MS,
  isReleaseBefore,
  resolveUpgradeSurvivorOriroCommand,
  runUpgradeSurvivorOriroStep,
} from "../../scripts/e2e/lib/upgrade-survivor/config-recipe.mjs";

describe("upgrade survivor config recipe command resolution", () => {
  it("compares baseline versions with the shared release parser", () => {
    expect(isReleaseBefore("2026.3.31", "2026.4.0")).toBe(true);
    expect(isReleaseBefore("2026.3.31-beta.1", "2026.4.0")).toBe(true);
    expect(isReleaseBefore("2026.4.1", "2026.4.0")).toBe(false);
    expect(isReleaseBefore(null, "2026.4.0")).toBe(false);
    expect(isReleaseBefore("2026.3.31junk", "2026.4.0")).toBe(false);
    expect(isReleaseBefore("2026.3.9007199254740993", "2026.4.0")).toBe(false);
  });

  it("wraps Windows oriro npm shims through cmd.exe", () => {
    expect(
      resolveUpgradeSurvivorOriroCommand(
        ["config", "set", "models.providers.openai", '{"apiKey":"sk test"}', "--strict-json"],
        {
          comSpec: String.raw`C:\Windows\System32\cmd.exe`,
          platform: "win32",
        },
      ),
    ).toEqual({
      args: [
        "/d",
        "/s",
        "/c",
        'oriro.cmd config set models.providers.openai "{""apiKey"":""sk test""}" --strict-json',
      ],
      command: String.raw`C:\Windows\System32\cmd.exe`,
      commandLabel:
        'oriro config set models.providers.openai {"apiKey":"sk test"} --strict-json',
      shell: false,
      windowsVerbatimArguments: true,
    });
  });

  it("keeps POSIX oriro invocations direct", () => {
    expect(
      resolveUpgradeSurvivorOriroCommand(["config", "validate"], {
        platform: "linux",
      }),
    ).toEqual({
      args: ["config", "validate"],
      command: "oriro",
      commandLabel: "oriro config validate",
      shell: false,
    });
  });

  it("bounds baseline config commands and reports spawn errors", () => {
    const calls: unknown[] = [];
    const timeoutError = Object.assign(new Error("spawnSync oriro ETIMEDOUT"), {
      code: "ETIMEDOUT",
    });

    const outcome = runUpgradeSurvivorOriroStep(
      {
        argv: ["config", "validate"],
        id: "validate",
        intent: "validate",
      },
      {
        spawnSyncCommand(command: string, args: string[], options: unknown) {
          calls.push({ args, command, options });
          return {
            error: timeoutError,
            signal: "SIGTERM",
            status: null,
            stderr: "still validating",
            stdout: "partial output",
          };
        },
      },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      args: ["config", "validate"],
      command: "oriro",
      options: {
        killSignal: "SIGTERM",
        maxBuffer: CONFIG_COMMAND_MAX_BUFFER_BYTES,
        timeout: CONFIG_COMMAND_TIMEOUT_MS,
      },
    });
    expect(outcome).toMatchObject({
      command: "oriro config validate",
      errorCode: "ETIMEDOUT",
      errorMessage: "spawnSync oriro ETIMEDOUT",
      ok: false,
      signal: "SIGTERM",
      status: null,
      stderr: "still validating",
      stdout: "partial output",
    });
  });
});
