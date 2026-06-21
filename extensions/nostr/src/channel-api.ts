// Nostr API module exposes the plugin public contract.
export {
  buildChannelConfigSchema,
  DEFAULT_ACCOUNT_ID,
  formatPairingApproveHint,
  type ChannelPlugin,
} from "oriro/plugin-sdk/channel-plugin-common";
export type { ChannelOutboundAdapter } from "oriro/plugin-sdk/channel-contract";
export {
  collectStatusIssuesFromLastError,
  createDefaultChannelRuntimeState,
} from "oriro/plugin-sdk/status-helpers";
