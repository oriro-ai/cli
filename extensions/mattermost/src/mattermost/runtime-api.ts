// Mattermost API module exposes the plugin public contract.
export type {
  BaseProbeResult,
  ChannelAccountSnapshot,
  ChannelDirectoryEntry,
  ChatType,
  HistoryEntry,
  OriroConfig,
  OriroPluginApi,
  ReplyPayload,
} from "oriro/plugin-sdk/core";
export type { RuntimeEnv } from "oriro/plugin-sdk/runtime";
export { buildAgentMediaPayload } from "oriro/plugin-sdk/agent-media-payload";
export { resolveAllowlistMatchSimple } from "oriro/plugin-sdk/allow-from";
export { logInboundDrop } from "oriro/plugin-sdk/channel-inbound";
export { createChannelPairingController } from "oriro/plugin-sdk/channel-pairing";
export { createChannelMessageReplyPipeline } from "oriro/plugin-sdk/channel-outbound";
export { logTypingFailure } from "oriro/plugin-sdk/channel-feedback";
export {
  listSkillCommandsForAgents,
  resolveControlCommandGate,
} from "oriro/plugin-sdk/command-auth-native";
export { buildModelsProviderData } from "oriro/plugin-sdk/models-provider-runtime";
export { isDangerousNameMatchingEnabled } from "oriro/plugin-sdk/dangerous-name-runtime";
export {
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "oriro/plugin-sdk/runtime-group-policy";
export { resolveChannelMediaMaxBytes } from "oriro/plugin-sdk/media-runtime";
export { loadOutboundMediaFromUrl } from "oriro/plugin-sdk/outbound-media";
// Legacy map-helper exports stay for older plugin consumers. New message-turn
// code should use createChannelHistoryWindow.
export {
  DEFAULT_GROUP_HISTORY_LIMIT,
  createChannelHistoryWindow,
  buildInboundHistoryFromMap,
  buildPendingHistoryContextFromMap,
  recordPendingHistoryEntryIfEnabled,
} from "oriro/plugin-sdk/reply-history";
export { registerPluginHttpRoute } from "oriro/plugin-sdk/webhook-targets";
export {
  isRequestBodyLimitError,
  readRequestBodyWithLimit,
} from "oriro/plugin-sdk/webhook-ingress";
export {
  isTrustedProxyAddress,
  parseStrictPositiveInteger,
  resolveClientIp,
} from "oriro/plugin-sdk/core";
export { parseTcpPort } from "oriro/plugin-sdk/number-runtime";
