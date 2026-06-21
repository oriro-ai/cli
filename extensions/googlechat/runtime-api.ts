// Private runtime barrel for the bundled Google Chat extension.
// Keep this barrel thin and avoid broad plugin-sdk surfaces during bootstrap.

export { DEFAULT_ACCOUNT_ID } from "oriro/plugin-sdk/account-id";
export {
  createActionGate,
  jsonResult,
  readNumberParam,
  readReactionParams,
  readStringParam,
} from "oriro/plugin-sdk/channel-actions";
export { buildChannelConfigSchema } from "oriro/plugin-sdk/channel-config-primitives";
export type {
  ChannelMessageActionAdapter,
  ChannelMessageActionName,
  ChannelStatusIssue,
} from "oriro/plugin-sdk/channel-contract";
export { missingTargetError } from "oriro/plugin-sdk/channel-feedback";
export {
  createAccountStatusSink,
  runPassiveAccountLifecycle,
} from "oriro/plugin-sdk/channel-outbound";
export { createChannelPairingController } from "oriro/plugin-sdk/channel-pairing";
export { createChannelMessageReplyPipeline } from "oriro/plugin-sdk/channel-outbound";
export { PAIRING_APPROVED_MESSAGE } from "oriro/plugin-sdk/channel-status";
export { chunkTextForOutbound } from "oriro/plugin-sdk/text-chunking";
export type { OriroConfig } from "oriro/plugin-sdk/config-contracts";
export { GoogleChatConfigSchema } from "oriro/plugin-sdk/bundled-channel-config-schema";
export {
  GROUP_POLICY_BLOCKED_LABEL,
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "oriro/plugin-sdk/runtime-group-policy";
export { isDangerousNameMatchingEnabled } from "oriro/plugin-sdk/dangerous-name-runtime";
export {
  readRemoteMediaBuffer,
  resolveChannelMediaMaxBytes,
} from "oriro/plugin-sdk/media-runtime";
export { loadOutboundMediaFromUrl } from "oriro/plugin-sdk/outbound-media";
export type { PluginRuntime } from "oriro/plugin-sdk/runtime-store";
export { fetchWithSsrFGuard } from "oriro/plugin-sdk/ssrf-runtime";
export type {
  GoogleChatAccountConfig,
  GoogleChatConfig,
} from "oriro/plugin-sdk/config-contracts";
export { extractToolSend } from "oriro/plugin-sdk/tool-send";
export { resolveInboundMentionDecision } from "oriro/plugin-sdk/channel-inbound";
export { resolveInboundRouteEnvelopeBuilderWithRuntime } from "oriro/plugin-sdk/inbound-envelope";
export { resolveWebhookPath } from "oriro/plugin-sdk/webhook-ingress";
export {
  registerWebhookTargetWithPluginRoute,
  resolveWebhookTargetWithAuthOrReject,
  withResolvedWebhookRequestPipeline,
} from "oriro/plugin-sdk/webhook-targets";
export {
  createWebhookInFlightLimiter,
  readJsonWebhookBodyOrReject,
  type WebhookInFlightLimiter,
} from "oriro/plugin-sdk/webhook-request-guards";
export { setGoogleChatRuntime } from "./src/runtime.js";
