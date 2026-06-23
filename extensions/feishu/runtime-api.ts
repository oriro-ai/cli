// Private runtime barrel for the bundled Feishu extension.
// Keep this barrel thin and generic-only.

export type {
  AllowlistMatch,
  AnyAgentTool,
  BaseProbeResult,
  ChannelGroupContext,
  ChannelMessageActionName,
  ChannelMeta,
  ChannelOutboundAdapter,
  ChannelPlugin,
  HistoryEntry,
  OriroConfig,
  OriroPluginApi,
  OutboundIdentity,
  PluginRuntime,
  ReplyPayload,
} from "oriro/plugin-sdk/core";
export type { OriroConfig as OriroConfig } from "oriro/plugin-sdk/core";
export type RuntimeEnv = {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  exit: (code: number) => void;
};
export type { GroupToolPolicyConfig } from "oriro/plugin-sdk/config-contracts";
export {
  DEFAULT_ACCOUNT_ID,
  buildChannelConfigSchema,
  createActionGate,
  createDedupeCache,
} from "oriro/plugin-sdk/core";
export {
  PAIRING_APPROVED_MESSAGE,
  buildProbeChannelStatusSummary,
  createDefaultChannelRuntimeState,
} from "oriro/plugin-sdk/channel-status";
export { buildAgentMediaPayload } from "oriro/plugin-sdk/agent-media-payload";
export { createChannelPairingController } from "oriro/plugin-sdk/channel-pairing";
export { createReplyPrefixContext } from "oriro/plugin-sdk/channel-outbound";
export {
  evaluateSupplementalContextVisibility,
  filterSupplementalContextItems,
  resolveChannelContextVisibilityMode,
} from "oriro/plugin-sdk/context-visibility-runtime";
export {
  loadSessionStore,
  resolveSessionStoreEntry,
} from "oriro/plugin-sdk/session-store-runtime";
export { readJsonFileWithFallback } from "oriro/plugin-sdk/json-store";
export { normalizeAgentId } from "oriro/plugin-sdk/routing";
export { chunkTextForOutbound } from "oriro/plugin-sdk/text-chunking";
export {
  isRequestBodyLimitError,
  readRequestBodyWithLimit,
  requestBodyErrorToText,
} from "oriro/plugin-sdk/webhook-ingress";
export { setFeishuRuntime } from "./src/runtime.js";
