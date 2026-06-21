// Private runtime barrel for the bundled IRC extension.
// Keep this barrel thin and generic-only.

export type { BaseProbeResult } from "oriro/plugin-sdk/channel-contract";
export type { ChannelPlugin } from "oriro/plugin-sdk/channel-core";
export type { OriroConfig } from "oriro/plugin-sdk/config-contracts";
export type { PluginRuntime } from "oriro/plugin-sdk/runtime-store";
export type { RuntimeEnv } from "oriro/plugin-sdk/runtime";
export type {
  BlockStreamingCoalesceConfig,
  DmConfig,
  DmPolicy,
  GroupPolicy,
  GroupToolPolicyBySenderConfig,
  GroupToolPolicyConfig,
  MarkdownConfig,
} from "oriro/plugin-sdk/config-contracts";
export type { OutboundReplyPayload } from "oriro/plugin-sdk/reply-payload";
export { DEFAULT_ACCOUNT_ID } from "oriro/plugin-sdk/account-id";
export { buildChannelConfigSchema } from "oriro/plugin-sdk/channel-config-primitives";
export {
  PAIRING_APPROVED_MESSAGE,
  buildBaseChannelStatusSummary,
} from "oriro/plugin-sdk/channel-status";
export { createChannelPairingController } from "oriro/plugin-sdk/channel-pairing";
export { createAccountStatusSink } from "oriro/plugin-sdk/channel-outbound";
export { resolveControlCommandGate } from "oriro/plugin-sdk/command-auth-native";
export { createChannelMessageReplyPipeline } from "oriro/plugin-sdk/channel-outbound";
export { chunkTextForOutbound } from "oriro/plugin-sdk/text-chunking";
export {
  deliverFormattedTextWithAttachments,
  formatTextWithAttachmentLinks,
  resolveOutboundMediaUrls,
} from "oriro/plugin-sdk/reply-payload";
export {
  GROUP_POLICY_BLOCKED_LABEL,
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "oriro/plugin-sdk/runtime-group-policy";
export { isDangerousNameMatchingEnabled } from "oriro/plugin-sdk/dangerous-name-runtime";
export { logInboundDrop } from "oriro/plugin-sdk/channel-inbound";
