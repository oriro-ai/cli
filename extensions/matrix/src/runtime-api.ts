// Matrix API module exposes the plugin public contract.
export {
  DEFAULT_ACCOUNT_ID,
  normalizeAccountId,
  normalizeOptionalAccountId,
} from "oriro/plugin-sdk/account-id";
export {
  createActionGate,
  jsonResult,
  readNumberParam,
  readPositiveIntegerParam,
  readReactionParams,
  readStringArrayParam,
  readStringParam,
  ToolAuthorizationError,
} from "oriro/plugin-sdk/channel-actions";
export { buildChannelConfigSchema } from "oriro/plugin-sdk/channel-config-primitives";
export type { ChannelPlugin } from "oriro/plugin-sdk/channel-core";
export type {
  BaseProbeResult,
  ChannelDirectoryEntry,
  ChannelGroupContext,
  ChannelMessageActionAdapter,
  ChannelMessageActionContext,
  ChannelMessageActionName,
  ChannelMessageToolDiscovery,
  ChannelOutboundAdapter,
  ChannelResolveKind,
  ChannelResolveResult,
  ChannelToolSend,
} from "oriro/plugin-sdk/channel-contract";
export {
  formatLocationText,
  toLocationContext,
  type NormalizedLocation,
} from "oriro/plugin-sdk/channel-inbound";
export { logInboundDrop } from "oriro/plugin-sdk/channel-inbound";
export { logTypingFailure } from "oriro/plugin-sdk/channel-outbound";
export { resolveAckReaction } from "oriro/plugin-sdk/channel-feedback";
export type { ChannelSetupInput } from "oriro/plugin-sdk/setup";
export type {
  OriroConfig,
  ContextVisibilityMode,
  DmPolicy,
  GroupPolicy,
} from "oriro/plugin-sdk/config-contracts";
export type { GroupToolPolicyConfig } from "oriro/plugin-sdk/config-contracts";
export type { WizardPrompter } from "oriro/plugin-sdk/setup";
export type { SecretInput } from "oriro/plugin-sdk/secret-input";
export {
  GROUP_POLICY_BLOCKED_LABEL,
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "oriro/plugin-sdk/runtime-group-policy";
export {
  addWildcardAllowFrom,
  formatDocsLink,
  hasConfiguredSecretInput,
  mergeAllowFromEntries,
  moveSingleAccountChannelSectionToDefaultAccount,
  promptAccountId,
  promptChannelAccessConfig,
  splitSetupEntries,
} from "oriro/plugin-sdk/setup";
export type { RuntimeEnv } from "oriro/plugin-sdk/runtime";
export {
  assertHttpUrlTargetsPrivateNetwork,
  closeDispatcher,
  createPinnedDispatcher,
  isPrivateOrLoopbackHost,
  resolvePinnedHostnameWithPolicy,
  ssrfPolicyFromDangerouslyAllowPrivateNetwork,
  ssrfPolicyFromAllowPrivateNetwork,
  type LookupFn,
  type SsrFPolicy,
} from "oriro/plugin-sdk/ssrf-runtime";
export { dispatchReplyFromConfigWithSettledDispatcher } from "oriro/plugin-sdk/channel-inbound";
export {
  ensureConfiguredAcpBindingReady,
  resolveConfiguredAcpBindingRecord,
} from "oriro/plugin-sdk/acp-binding-runtime";
export {
  buildProbeChannelStatusSummary,
  collectStatusIssuesFromLastError,
  PAIRING_APPROVED_MESSAGE,
} from "oriro/plugin-sdk/channel-status";
export {
  getSessionBindingService,
  resolveThreadBindingIdleTimeoutMsForChannel,
  resolveThreadBindingMaxAgeMsForChannel,
} from "oriro/plugin-sdk/conversation-runtime";
export { resolveOutboundSendDep } from "oriro/plugin-sdk/channel-outbound";
export { resolveAgentIdFromSessionKey } from "oriro/plugin-sdk/routing";
export { chunkTextForOutbound } from "oriro/plugin-sdk/text-chunking";
export { createChannelMessageReplyPipeline } from "oriro/plugin-sdk/channel-outbound";
export { loadOutboundMediaFromUrl } from "oriro/plugin-sdk/outbound-media";
export { normalizePollInput, type PollInput } from "oriro/plugin-sdk/poll-runtime";
export { writeJsonFileAtomically } from "oriro/plugin-sdk/json-store";
export {
  buildChannelKeyCandidates,
  resolveChannelEntryMatch,
} from "oriro/plugin-sdk/channel-targets";
export { buildTimeoutAbortSignal } from "./matrix/sdk/timeout-abort-signal.js";
export { formatZonedTimestamp } from "oriro/plugin-sdk/time-runtime";
export type { PluginRuntime, RuntimeLogger } from "oriro/plugin-sdk/plugin-runtime";
export type { ReplyPayload } from "oriro/plugin-sdk/reply-runtime";
// resolveMatrixAccountStringValues already comes from the Matrix API barrel.
// Re-exporting auth-precedence here makes TS source loaders define the export twice.
