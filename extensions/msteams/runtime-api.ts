// Private runtime barrel for the bundled Microsoft Teams extension.
// Keep this barrel thin and aligned with the local extension surface.

export { DEFAULT_ACCOUNT_ID } from "oriro/plugin-sdk/account-id";
export type { AllowlistMatch } from "oriro/plugin-sdk/allow-from";
export {
  mergeAllowlist,
  resolveAllowlistMatchSimple,
  summarizeMapping,
} from "oriro/plugin-sdk/allow-from";
export type {
  BaseProbeResult,
  ChannelDirectoryEntry,
  ChannelGroupContext,
  ChannelMessageActionName,
  ChannelOutboundAdapter,
} from "oriro/plugin-sdk/channel-contract";
export type { ChannelPlugin } from "oriro/plugin-sdk/channel-core";
export { logTypingFailure } from "oriro/plugin-sdk/channel-outbound";
export { createChannelPairingController } from "oriro/plugin-sdk/channel-pairing";
export { resolveToolsBySender } from "oriro/plugin-sdk/channel-policy";
export { createChannelMessageReplyPipeline } from "oriro/plugin-sdk/channel-outbound";
export {
  PAIRING_APPROVED_MESSAGE,
  buildProbeChannelStatusSummary,
  createDefaultChannelRuntimeState,
} from "oriro/plugin-sdk/channel-status";
export {
  buildChannelKeyCandidates,
  normalizeChannelSlug,
  resolveChannelEntryMatchWithFallback,
  resolveNestedAllowlistDecision,
} from "oriro/plugin-sdk/channel-targets";
export type {
  GroupPolicy,
  GroupToolPolicyConfig,
  MSTeamsChannelConfig,
  MSTeamsCloudName,
  MSTeamsConfig,
  MSTeamsReplyStyle,
  MSTeamsTeamConfig,
  MarkdownTableMode,
  OriroConfig,
} from "oriro/plugin-sdk/config-contracts";
export { isDangerousNameMatchingEnabled } from "oriro/plugin-sdk/dangerous-name-runtime";
export { resolveDefaultGroupPolicy } from "oriro/plugin-sdk/runtime-group-policy";
export { withFileLock } from "oriro/plugin-sdk/file-lock";
export { keepHttpServerTaskAlive } from "oriro/plugin-sdk/channel-outbound";
export {
  detectMime,
  extensionForMime,
  extractOriginalFilename,
  getFileExtension,
  resolveChannelMediaMaxBytes,
} from "oriro/plugin-sdk/media-runtime";
export { dispatchReplyFromConfigWithSettledDispatcher } from "oriro/plugin-sdk/channel-inbound";
export { loadOutboundMediaFromUrl } from "oriro/plugin-sdk/outbound-media";
export { buildMediaPayload } from "oriro/plugin-sdk/reply-payload";
export type { ReplyPayload } from "oriro/plugin-sdk/reply-payload";
export type { PluginRuntime } from "oriro/plugin-sdk/runtime-store";
export type { RuntimeEnv } from "oriro/plugin-sdk/runtime";
export type { SsrFPolicy } from "oriro/plugin-sdk/ssrf-runtime";
export { fetchWithSsrFGuard } from "oriro/plugin-sdk/ssrf-runtime";
export { normalizeStringEntries } from "oriro/plugin-sdk/string-normalization-runtime";
export { chunkTextForOutbound } from "oriro/plugin-sdk/text-chunking";
export { DEFAULT_WEBHOOK_MAX_BODY_BYTES } from "oriro/plugin-sdk/webhook-ingress";
export { setMSTeamsRuntime } from "./src/runtime.js";
