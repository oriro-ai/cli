// Oriro API module exposes the plugin public contract.
export { definePluginEntry } from "oriro/plugin-sdk/core";
export type {
  AnyAgentTool,
  OriroPluginApi,
  OriroPluginToolContext,
  OriroPluginToolFactory,
} from "oriro/plugin-sdk/core";
export {
  applyWindowsSpawnProgramPolicy,
  materializeWindowsSpawnProgram,
  resolveWindowsSpawnProgramCandidate,
} from "oriro/plugin-sdk/windows-spawn";
