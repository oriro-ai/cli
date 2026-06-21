// Private runtime barrel for the bundled Nextcloud Talk extension.
// Keep this barrel thin and aligned with the local extension surface.

export type { AllowlistMatch } from "oriro/plugin-sdk/allow-from";
export type { ChannelGroupContext } from "oriro/plugin-sdk/channel-contract";
export { logInboundDrop } from "oriro/plugin-sdk/channel-inbound";
export { createChannelPairingController } from "oriro/plugin-sdk/channel-pairing";
export type {
  BlockStreamingCoalesceConfig,
  DmConfig,
  DmPolicy,
  GroupPolicy,
  GroupToolPolicyConfig,
  OriroConfig,
} from "oriro/plugin-sdk/config-contracts";
export {
  GROUP_POLICY_BLOCKED_LABEL,
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "oriro/plugin-sdk/runtime-group-policy";
export { createChannelMessageReplyPipeline } from "oriro/plugin-sdk/channel-outbound";
export type { OutboundReplyPayload } from "oriro/plugin-sdk/reply-payload";
export { deliverFormattedTextWithAttachments } from "oriro/plugin-sdk/reply-payload";
export type { PluginRuntime } from "oriro/plugin-sdk/runtime-store";
export type { RuntimeEnv } from "oriro/plugin-sdk/runtime";
export type { SecretInput } from "oriro/plugin-sdk/secret-input";
export { fetchWithSsrFGuard } from "oriro/plugin-sdk/ssrf-runtime";
export { setNextcloudTalkRuntime } from "./src/runtime.js";
