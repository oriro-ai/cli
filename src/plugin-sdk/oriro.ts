// Private Oriro plugin helpers for bundled extensions.
// Keep this surface narrow and limited to the Oriro workflow/tool contract.

export { definePluginEntry } from "./plugin-entry.js";
export {
  applyWindowsSpawnProgramPolicy,
  materializeWindowsSpawnProgram,
  resolveWindowsSpawnProgramCandidate,
} from "./windows-spawn.js";
export type {
  AnyAgentTool,
  OriroPluginApi,
  OriroPluginToolContext,
  OriroPluginToolFactory,
} from "../plugins/types.js";
