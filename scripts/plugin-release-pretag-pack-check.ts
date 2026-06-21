#!/usr/bin/env -S node --import tsx

import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { collectOriroHubPublishablePluginPackages } from "./lib/plugin-orirohub-release.ts";
import { collectPublishablePluginPackages } from "./lib/plugin-npm-release.ts";

const DEFAULT_ORIROHUB_CLI_PACKAGE = "orirohub@0.21.0";

export type PluginReleasePretagPackTarget = {
  packageDir: string;
  packageName: string;
  packOriroHub: boolean;
  packNpm: boolean;
};

export function collectPluginReleasePretagPackTargets(
  rootDir = resolve("."),
): PluginReleasePretagPackTarget[] {
  const targets = new Map<string, PluginReleasePretagPackTarget>();

  for (const plugin of collectPublishablePluginPackages(rootDir)) {
    targets.set(plugin.packageDir, {
      packageDir: plugin.packageDir,
      packageName: plugin.packageName,
      packOriroHub: false,
      packNpm: true,
    });
  }
  for (const plugin of collectOriroHubPublishablePluginPackages(rootDir)) {
    const existing = targets.get(plugin.packageDir);
    targets.set(plugin.packageDir, {
      packageDir: plugin.packageDir,
      packageName: plugin.packageName,
      packOriroHub: true,
      packNpm: existing?.packNpm ?? false,
    });
  }

  return [...targets.values()].toSorted((left, right) =>
    left.packageName.localeCompare(right.packageName),
  );
}

function runCommand(
  command: string,
  args: string[],
  params: { cwd: string; env?: NodeJS.ProcessEnv; quietStdout?: boolean },
) {
  execFileSync(command, args, {
    cwd: params.cwd,
    env: params.env ?? process.env,
    stdio: params.quietStdout ? ["inherit", "ignore", "inherit"] : "inherit",
  });
}

export function runPluginReleasePretagPackCheck(rootDir = resolve(".")) {
  const targets = collectPluginReleasePretagPackTargets(rootDir);
  const tempRoot = mkdtempSync(join(tmpdir(), "oriro-plugin-pretag-pack-"));
  const wrapperDir = join(tempRoot, "bin");
  mkdirSync(wrapperDir);
  const oriroHubWrapper = join(wrapperDir, "orirohub");
  writeFileSync(
    oriroHubWrapper,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      'exec npm exec --yes --package "${ORIROHUB_CLI_PACKAGE}" -- orirohub "$@"',
      "",
    ].join("\n"),
  );
  chmodSync(oriroHubWrapper, 0o755);

  try {
    runCommand(
      process.execPath,
      [
        "scripts/check-plugin-npm-runtime-builds.mjs",
        ...targets.flatMap((target) => ["--package", target.packageDir]),
      ],
      {
        cwd: rootDir,
      },
    );

    const packEnv = {
      ...process.env,
      ORIROHUB_CLI_PACKAGE: process.env.ORIROHUB_CLI_PACKAGE?.trim() || DEFAULT_ORIROHUB_CLI_PACKAGE,
      PATH: `${wrapperDir}:${process.env.PATH ?? ""}`,
    };
    const prebuiltPackEnv = {
      ...packEnv,
      ORIRO_PLUGIN_NPM_RUNTIME_BUILD: "0",
    };
    for (const [index, target] of targets.entries()) {
      if (target.packNpm) {
        console.log(`npm pack: ${target.packageName}`);
        runCommand("bash", ["scripts/plugin-npm-publish.sh", "--pack-dry-run", target.packageDir], {
          cwd: rootDir,
          env: prebuiltPackEnv,
          quietStdout: true,
        });
      }
      if (target.packOriroHub) {
        const outputDir = join(tempRoot, `orirohub-${index}`);
        console.log(`OriroHub pack: ${target.packageName}`);
        runCommand("bash", ["scripts/plugin-orirohub-publish.sh", "--pack", target.packageDir], {
          cwd: rootDir,
          env: {
            ...prebuiltPackEnv,
            ORIRO_ORIROHUB_PACK_OUTPUT_DIR: outputDir,
          },
          quietStdout: true,
        });
      }
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }

  console.log(`plugin-release-pretag-pack-check: packed ${targets.length} publishable plugins.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runPluginReleasePretagPackCheck();
}
