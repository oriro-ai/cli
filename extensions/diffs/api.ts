// Diffs API module exposes the plugin public contract.
export type { OriroConfig } from "oriro/plugin-sdk/config-contracts";
export {
  definePluginEntry,
  type AnyAgentTool,
  type OriroPluginApi,
  type OriroPluginConfigSchema,
  type OriroPluginToolContext,
  type PluginLogger,
} from "oriro/plugin-sdk/plugin-entry";
export { resolvePreferredOriroTmpDir } from "oriro/plugin-sdk/temp-path";
