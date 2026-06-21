// Private runtime barrel for the bundled Twitch extension.
// Keep this barrel thin and aligned with the local extension surface.

export type {
  ChannelAccountSnapshot,
  ChannelCapabilities,
  ChannelGatewayContext,
  ChannelLogSink,
  ChannelMessageActionAdapter,
  ChannelMessageActionContext,
  ChannelMeta,
  ChannelOutboundAdapter,
  ChannelOutboundContext,
  ChannelResolveKind,
  ChannelResolveResult,
  ChannelStatusAdapter,
} from "oriro/plugin-sdk/channel-contract";
export type { ChannelPlugin } from "oriro/plugin-sdk/channel-core";
export type { OutboundDeliveryResult } from "oriro/plugin-sdk/channel-send-result";
export type { OriroConfig } from "oriro/plugin-sdk/config-contracts";
export type { RuntimeEnv } from "oriro/plugin-sdk/runtime";
export type { WizardPrompter } from "oriro/plugin-sdk/setup";
