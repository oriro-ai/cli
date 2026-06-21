// Qqbot API module exposes the plugin public contract.
export type { ChannelPlugin, OriroPluginApi, PluginRuntime } from "oriro/plugin-sdk/core";
export type { OriroConfig } from "oriro/plugin-sdk/config-contracts";
export type {
  OriroPluginService,
  OriroPluginServiceContext,
  PluginLogger,
} from "oriro/plugin-sdk/core";
export type { ResolvedQQBotAccount, QQBotAccountConfig } from "./src/types.js";
export { getQQBotRuntime, setQQBotRuntime } from "./src/bridge/runtime.js";
