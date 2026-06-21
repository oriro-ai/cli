// Slack API module exposes the plugin public contract.
export {
  buildComputedAccountStatusSnapshot,
  PAIRING_APPROVED_MESSAGE,
  projectCredentialSnapshotFields,
  resolveConfiguredFromRequiredCredentialStatuses,
} from "oriro/plugin-sdk/channel-status";
export { buildChannelConfigSchema, SlackConfigSchema } from "../config-api.js";
export type { ChannelMessageActionContext } from "oriro/plugin-sdk/channel-contract";
export { DEFAULT_ACCOUNT_ID } from "oriro/plugin-sdk/account-id";
export type {
  ChannelPlugin,
  OriroPluginApi,
  PluginRuntime,
} from "oriro/plugin-sdk/channel-plugin-common";
export type { OriroConfig } from "oriro/plugin-sdk/config-contracts";
export type { SlackAccountConfig } from "oriro/plugin-sdk/config-contracts";
export {
  emptyPluginConfigSchema,
  formatPairingApproveHint,
} from "oriro/plugin-sdk/channel-plugin-common";
export { loadOutboundMediaFromUrl } from "oriro/plugin-sdk/outbound-media";
export { looksLikeSlackTargetId, normalizeSlackMessagingTarget } from "./target-parsing.js";
export { getChatChannelMeta } from "./channel-api.js";
export {
  createActionGate,
  imageResultFromFile,
  jsonResult,
  readNumberParam,
  readPositiveIntegerParam,
  readReactionParams,
  readStringParam,
  withNormalizedTimestamp,
} from "oriro/plugin-sdk/channel-actions";
