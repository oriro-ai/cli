// Qa Channel API module exposes the plugin public contract.
export type {
  ChannelMessageActionAdapter,
  ChannelMessageActionName,
  ChannelGatewayContext,
} from "oriro/plugin-sdk/channel-contract";
export type { ChannelPlugin } from "oriro/plugin-sdk/channel-core";
export type { OriroConfig } from "oriro/plugin-sdk/config-contracts";
export type { RuntimeEnv } from "oriro/plugin-sdk/runtime";
export type { PluginRuntime } from "oriro/plugin-sdk/runtime-store";
export {
  buildChannelConfigSchema,
  buildChannelOutboundSessionRoute,
  createChatChannelPlugin,
  defineChannelPluginEntry,
} from "oriro/plugin-sdk/channel-core";
export { jsonResult, readStringParam } from "oriro/plugin-sdk/channel-actions";
export { getChatChannelMeta } from "oriro/plugin-sdk/channel-plugin-common";
export {
  createComputedAccountStatusAdapter,
  createDefaultChannelRuntimeState,
} from "oriro/plugin-sdk/status-helpers";
export { createPluginRuntimeStore } from "oriro/plugin-sdk/runtime-store";
export { createChannelMessageReplyPipeline } from "oriro/plugin-sdk/channel-outbound";
