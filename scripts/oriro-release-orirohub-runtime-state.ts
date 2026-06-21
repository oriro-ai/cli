#!/usr/bin/env -S node --import tsx
import { buildOriroReleaseOriroHubRuntimeState } from "./lib/oriro-release-orirohub-plan.ts";

function parseBoolean(value: string, label: string): boolean {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new Error(`${label} must be true or false.`);
}

function parseArgs(argv: string[]) {
  const values = [...argv];
  if (values[0] === "--") {
    values.shift();
  }

  let repository: string | undefined;
  let waitForOriroHub: boolean | undefined;
  let forceSkipOriroHub: boolean | undefined;
  let normalRunId: string | undefined;
  let bootstrapRunId: string | undefined;
  let bootstrapCompleted: boolean | undefined;

  for (let index = 0; index < values.length; index += 1) {
    const arg = values[index];
    const next = () => {
      const value = values[index + 1];
      if (value === undefined || value.startsWith("-")) {
        throw new Error(`${arg} requires a value.`);
      }
      index += 1;
      return value;
    };

    switch (arg) {
      case "--repository":
        repository = next();
        break;
      case "--wait-for-orirohub":
        waitForOriroHub = parseBoolean(next(), "--wait-for-orirohub");
        break;
      case "--force-skip-orirohub":
        forceSkipOriroHub = parseBoolean(next(), "--force-skip-orirohub");
        break;
      case "--normal-run-id":
        normalRunId = next();
        break;
      case "--bootstrap-run-id":
        bootstrapRunId = next();
        break;
      case "--bootstrap-completed":
        bootstrapCompleted = parseBoolean(next(), "--bootstrap-completed");
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!repository?.trim()) {
    throw new Error("--repository is required.");
  }
  if (waitForOriroHub === undefined) {
    throw new Error("--wait-for-orirohub is required.");
  }
  if (forceSkipOriroHub === undefined) {
    throw new Error("--force-skip-orirohub is required.");
  }
  if (bootstrapCompleted === undefined) {
    throw new Error("--bootstrap-completed is required.");
  }

  return {
    repository,
    waitForOriroHub,
    forceSkipOriroHub,
    normalRunId,
    bootstrapRunId,
    bootstrapCompleted,
  };
}

try {
  const state = buildOriroReleaseOriroHubRuntimeState(parseArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
