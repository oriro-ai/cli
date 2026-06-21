#!/usr/bin/env -S node --import tsx
// Plugin Orirohub Release Check script supports Oriro repository automation.

import { pathToFileURL } from "node:url";
import {
  collectOriroHubPublishablePluginPackages,
  collectOriroHubVersionGateErrors,
  assertPluginReleaseVersionFloors,
  parsePluginReleaseArgs,
  resolveSelectedOriroHubPublishablePluginPackages,
} from "./lib/plugin-orirohub-release.ts";

export async function runPluginOriroHubReleaseCheck(argv: string[]) {
  const { selection, selectionMode, baseRef, headRef } = parsePluginReleaseArgs(argv);
  const publishable = collectOriroHubPublishablePluginPackages(".", {
    packageNames:
      selectionMode === "all-publishable" || selection.length === 0 ? undefined : selection,
  });
  const gitRange = baseRef && headRef ? { baseRef, headRef } : undefined;
  const selected = resolveSelectedOriroHubPublishablePluginPackages({
    plugins: publishable,
    selection,
    selectionMode,
    gitRange,
  });

  if (selectionMode !== undefined || selection.length > 0) {
    assertPluginReleaseVersionFloors(selected, "plugin-orirohub-release-check");
  }

  if (gitRange) {
    const errors = collectOriroHubVersionGateErrors({
      plugins: publishable,
      gitRange,
    });
    if (errors.length > 0) {
      throw new Error(
        `plugin-orirohub-release-check: version bumps required before OriroHub publish:\n${errors
          .map((error) => `  - ${error}`)
          .join("\n")}`,
      );
    }
  }

  console.log("plugin-orirohub-release-check: publishable plugin metadata looks OK.");
  if (gitRange && selected.length === 0) {
    console.log(
      `  - no publishable plugin package changes detected between ${gitRange.baseRef} and ${gitRange.headRef}`,
    );
  }
  for (const plugin of selected) {
    console.log(
      `  - ${plugin.packageName}@${plugin.version} (${plugin.channel}, ${plugin.extensionId})`,
    );
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await runPluginOriroHubReleaseCheck(process.argv.slice(2));
}
