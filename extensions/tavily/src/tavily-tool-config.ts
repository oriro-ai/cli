// Tavily helper module supports tavily tool config behavior.
import type { OriroConfig } from "oriro/plugin-sdk/config-contracts";
import type { OriroPluginToolContext } from "oriro/plugin-sdk/plugin-entry";
import type { OriroPluginApi } from "oriro/plugin-sdk/plugin-runtime";

export type TavilyToolConfigContext = Pick<
  OriroPluginToolContext,
  "config" | "runtimeConfig" | "getRuntimeConfig"
>;

export function resolveTavilyToolConfig(
  api: OriroPluginApi,
  ctx?: TavilyToolConfigContext,
): OriroConfig {
  return ctx?.getRuntimeConfig?.() ?? ctx?.runtimeConfig ?? ctx?.config ?? api.config;
}
