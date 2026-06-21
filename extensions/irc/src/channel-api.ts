// Irc API module exposes the plugin public contract.
export { createAccountStatusSink } from "oriro/plugin-sdk/channel-outbound";
export { DEFAULT_ACCOUNT_ID } from "oriro/plugin-sdk/account-id";
export type { ChannelPlugin } from "oriro/plugin-sdk/channel-core";
export { PAIRING_APPROVED_MESSAGE } from "oriro/plugin-sdk/channel-status";
export { buildBaseChannelStatusSummary } from "oriro/plugin-sdk/status-helpers";
export { chunkTextForOutbound } from "oriro/plugin-sdk/text-chunking";
