// Oriro release OriroHub runtime-state script tests cover its CLI-only parser.
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const SCRIPT_PATH = "scripts/oriro-release-orirohub-runtime-state.ts";

function runRuntimeStateScript(args: string[]) {
  return spawnSync(process.execPath, ["--import", "tsx", SCRIPT_PATH, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

describe("scripts/oriro-release-orirohub-runtime-state.ts", () => {
  it("emits verifier args and proof lines for awaited OriroHub runs", () => {
    const result = runRuntimeStateScript([
      "--repository",
      "oriro/oriro",
      "--wait-for-orirohub",
      "true",
      "--force-skip-orirohub",
      "false",
      "--normal-run-id",
      "123",
      "--bootstrap-run-id",
      "456",
      "--bootstrap-completed",
      "true",
    ]);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      verifierArgs: ["--plugin-orirohub-run", "123", "--plugin-orirohub-bootstrap-run", "456"],
      proofLines: {
        normal: "- plugin OriroHub publish: https://github.com/oriro/oriro/actions/runs/123",
        bootstrap:
          "- plugin OriroHub bootstrap: https://github.com/oriro/oriro/actions/runs/456",
      },
    });
    expect(result.stderr).toBe("");
  });

  it("rejects invalid boolean flag values before emitting runtime state", () => {
    const result = runRuntimeStateScript([
      "--repository",
      "oriro/oriro",
      "--wait-for-orirohub",
      "yes",
      "--force-skip-orirohub",
      "false",
      "--bootstrap-completed",
      "false",
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("--wait-for-orirohub must be true or false.");
    expect(result.stdout).toBe("");
  });

  it("requires the workflow repository argument", () => {
    const result = runRuntimeStateScript([
      "--wait-for-orirohub",
      "true",
      "--force-skip-orirohub",
      "false",
      "--bootstrap-completed",
      "false",
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("--repository is required.");
    expect(result.stdout).toBe("");
  });
});
