#!/usr/bin/env -S node --import tsx
// Oriro release OriroHub plan CLI emits release workflow routing as JSON.

import { pathToFileURL } from "node:url";
import {
  buildOriroReleaseOriroHubPlan,
  parseOriroReleaseOriroHubPlanArgs,
} from "./lib/oriro-release-orirohub-plan.ts";

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const args = parseOriroReleaseOriroHubPlanArgs(process.argv.slice(2));
  const plan = await buildOriroReleaseOriroHubPlan(args);
  console.log(JSON.stringify(plan, null, 2));
}
