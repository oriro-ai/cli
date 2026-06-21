// Private runtime barrel for the bundled Mattermost extension.
// Keep this barrel thin and generic-only.

export type {
  BaseProbeResult,
  ChannelAccountSnapshot,
  ChannelDirectoryEntry,
  ChannelGroupContext,
  ChannelMessageActionName,
  ChannelPlugin,
  ChatType,
  HistoryEntry,
  OriroConfig,
  OriroPluginApi,
  PluginRuntime,
} from "oriro/plugin-sdk/core";
export type { RuntimeEnv } from "oriro/plugin-sdk/runtime";
export type { ReplyPayload } from "oriro/plugin-sdk/reply-runtime";
export type { ModelsProviderData } from "oriro/plugin-sdk/models-provider-runtime";
export type {
  BlockStreamingCoalesceConfig,
  DmPolicy,
  GroupPolicy,
} from "oriro/plugin-sdk/config-contracts";
export {
  DEFAULT_ACCOUNT_ID,
  buildChannelConfigSchema,
  createDedupeCache,
  parseStrictPositiveInteger,
  resolveClientIp,
  isTrustedProxyAddress,
} from "oriro/plugin-sdk/core";
export { buildComputedAccountStatusSnapshot } from "oriro/plugin-sdk/channel-status";
export { createAccountStatusSink } from "oriro/plugin-sdk/channel-outbound";
export { buildAgentMediaPayload } from "oriro/plugin-sdk/agent-media-payload";
export {
  listSkillCommandsForAgents,
  resolveControlCommandGate,
  resolveStoredModelOverride,
} from "oriro/plugin-sdk/command-auth-native";
export { buildModelsProviderData } from "oriro/plugin-sdk/models-provider-runtime";
export {
  GROUP_POLICY_BLOCKED_LABEL,
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "oriro/plugin-sdk/runtime-group-policy";
export { isDangerousNameMatchingEnabled } from "oriro/plugin-sdk/dangerous-name-runtime";
export { loadSessionStore, resolveStorePath } from "oriro/plugin-sdk/session-store-runtime";
export { formatInboundFromLabel } from "oriro/plugin-sdk/channel-inbound";
export { logInboundDrop } from "oriro/plugin-sdk/channel-inbound";
export { createChannelPairingController } from "oriro/plugin-sdk/channel-pairing";
export { createChannelMessageReplyPipeline } from "oriro/plugin-sdk/channel-outbound";
export { logTypingFailure } from "oriro/plugin-sdk/channel-feedback";
export { loadOutboundMediaFromUrl } from "oriro/plugin-sdk/outbound-media";
export { rawDataToString } from "oriro/plugin-sdk/webhook-ingress";
export { chunkTextForOutbound } from "oriro/plugin-sdk/text-chunking";
// Legacy map-helper exports stay for older plugin consumers. New message-turn
// code should use createChannelHistoryWindow.
export {
  DEFAULT_GROUP_HISTORY_LIMIT,
  createChannelHistoryWindow,
  buildPendingHistoryContextFromMap,
  clearHistoryEntriesIfEnabled,
  recordPendingHistoryEntryIfEnabled,
} from "oriro/plugin-sdk/reply-history";
export { normalizeAccountId, resolveThreadSessionKeys } from "oriro/plugin-sdk/routing";
export { resolveAllowlistMatchSimple } from "oriro/plugin-sdk/allow-from";
export { registerPluginHttpRoute } from "oriro/plugin-sdk/webhook-targets";
export {
  isRequestBodyLimitError,
  readRequestBodyWithLimit,
} from "oriro/plugin-sdk/webhook-ingress";
export {
  applyAccountNameToChannelSection,
  applySetupAccountConfigPatch,
  migrateBaseNameToDefaultAccount,
} from "oriro/plugin-sdk/setup";
export {
  getAgentScopedMediaLocalRoots,
  resolveChannelMediaMaxBytes,
} from "oriro/plugin-sdk/media-runtime";
export { normalizeProviderId } from "oriro/plugin-sdk/provider-model-shared";
export { setMattermostRuntime } from "./src/runtime.js";
