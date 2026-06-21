#!/usr/bin/env -S node --import tsx
// Plugin Orirohub Release Plan script supports Oriro repository automation.

import { pathToFileURL } from "node:url";
import {
  collectPluginOriroHubReleasePlan,
  parsePluginReleaseArgs,
} from "./lib/plugin-orirohub-release.ts";

export async function collectPluginReleasePlanForOriroHub(argv: string[]) {
  const { selection, selectionMode, baseRef, headRef } = parsePluginReleaseArgs(argv);
  return await collectPluginOriroHubReleasePlan({
    selection,
    selectionMode,
    gitRange: baseRef && headRef ? { baseRef, headRef } : undefined,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const plan = await collectPluginReleasePlanForOriroHub(process.argv.slice(2));
  console.log(JSON.stringify(plan, null, 2));
}
