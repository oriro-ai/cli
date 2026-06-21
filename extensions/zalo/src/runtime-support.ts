// Zalo plugin module implements runtime support behavior.
export type { ReplyPayload } from "oriro/plugin-sdk/reply-runtime";
export type { OriroConfig, GroupPolicy } from "oriro/plugin-sdk/config-contracts";
export type { MarkdownTableMode } from "oriro/plugin-sdk/config-contracts";
export type { BaseTokenResolution } from "oriro/plugin-sdk/channel-contract";
export type {
  BaseProbeResult,
  ChannelAccountSnapshot,
  ChannelMessageActionAdapter,
  ChannelMessageActionName,
  ChannelStatusIssue,
} from "oriro/plugin-sdk/channel-contract";
export type { SecretInput } from "oriro/plugin-sdk/secret-input";
export type { ChannelPlugin, PluginRuntime, WizardPrompter } from "oriro/plugin-sdk/core";
export type { RuntimeEnv } from "oriro/plugin-sdk/runtime";
export type { OutboundReplyPayload } from "oriro/plugin-sdk/reply-payload";
export {
  DEFAULT_ACCOUNT_ID,
  buildChannelConfigSchema,
  createDedupeCache,
  formatPairingApproveHint,
  jsonResult,
  normalizeAccountId,
  readStringParam,
  resolveClientIp,
} from "oriro/plugin-sdk/core";
export {
  applyAccountNameToChannelSection,
  applySetupAccountConfigPatch,
  buildSingleChannelSecretPromptState,
  mergeAllowFromEntries,
  migrateBaseNameToDefaultAccount,
  promptSingleChannelSecretInput,
  runSingleChannelSecretStep,
  setTopLevelChannelDmPolicyWithAllowFrom,
} from "oriro/plugin-sdk/setup";
export {
  buildSecretInputSchema,
  hasConfiguredSecretInput,
  normalizeResolvedSecretInputString,
  normalizeSecretInputString,
} from "oriro/plugin-sdk/secret-input";
export {
  buildTokenChannelStatusSummary,
  PAIRING_APPROVED_MESSAGE,
} from "oriro/plugin-sdk/channel-status";
export { buildBaseAccountStatusSnapshot } from "oriro/plugin-sdk/status-helpers";
export { chunkTextForOutbound } from "oriro/plugin-sdk/text-chunking";
export {
  formatAllowFromLowercase,
  isNormalizedSenderAllowed,
} from "oriro/plugin-sdk/allow-from";
export { addWildcardAllowFrom } from "oriro/plugin-sdk/setup";
export { resolveOpenProviderRuntimeGroupPolicy } from "oriro/plugin-sdk/runtime-group-policy";
export {
  warnMissingProviderGroupPolicyFallbackOnce,
  resolveDefaultGroupPolicy,
} from "oriro/plugin-sdk/runtime-group-policy";
export { createChannelPairingController } from "oriro/plugin-sdk/channel-pairing";
export { createChannelMessageReplyPipeline } from "oriro/plugin-sdk/channel-outbound";
export { logTypingFailure } from "oriro/plugin-sdk/channel-feedback";
export {
  deliverTextOrMediaReply,
  isNumericTargetId,
  sendPayloadWithChunkedTextAndMedia,
} from "oriro/plugin-sdk/reply-payload";
export { resolveInboundRouteEnvelopeBuilderWithRuntime } from "oriro/plugin-sdk/inbound-envelope";
export { waitForAbortSignal } from "oriro/plugin-sdk/runtime";
export {
  applyBasicWebhookRequestGuards,
  createFixedWindowRateLimiter,
  createWebhookAnomalyTracker,
  readJsonWebhookBodyOrReject,
  registerPluginHttpRoute,
  registerWebhookTarget,
  registerWebhookTargetWithPluginRoute,
  resolveWebhookPath,
  resolveWebhookTargetWithAuthOrRejectSync,
  WEBHOOK_ANOMALY_COUNTER_DEFAULTS,
  WEBHOOK_RATE_LIMIT_DEFAULTS,
  withResolvedWebhookRequestPipeline,
} from "oriro/plugin-sdk/webhook-ingress";
export type {
  RegisterWebhookPluginRouteOptions,
  RegisterWebhookTargetOptions,
} from "oriro/plugin-sdk/webhook-ingress";
