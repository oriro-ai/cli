// Mattermost API module exposes the plugin public contract.
export { createAccountStatusSink } from "oriro/plugin-sdk/channel-outbound";
export type { ChannelPlugin } from "oriro/plugin-sdk/core";
export { DEFAULT_ACCOUNT_ID } from "oriro/plugin-sdk/core";
export { chunkTextForOutbound } from "oriro/plugin-sdk/text-chunking";
