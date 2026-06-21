// Narrow Matrix monitor helper seam.
// Keep monitor internals off the broad package runtime-api barrel so monitor
// tests and shared workers do not pull unrelated Matrix helper surfaces.

export type { NormalizedLocation } from "oriro/plugin-sdk/channel-inbound";
export type { PluginRuntime, RuntimeLogger } from "oriro/plugin-sdk/plugin-runtime";
export type { BlockReplyContext, ReplyPayload } from "oriro/plugin-sdk/reply-runtime";
export type { MarkdownTableMode, OriroConfig } from "oriro/plugin-sdk/config-contracts";
export type { RuntimeEnv } from "oriro/plugin-sdk/runtime";
export {
  addAllowlistUserEntriesFromConfigEntry,
  buildAllowlistResolutionSummary,
  canonicalizeAllowlistWithResolvedIds,
  formatAllowlistMatchMeta,
  patchAllowlistUsersInConfigEntries,
  summarizeMapping,
} from "oriro/plugin-sdk/allow-from";
export {
  createReplyPrefixOptions,
  createTypingCallbacks,
} from "oriro/plugin-sdk/channel-outbound";
export { formatLocationText, toLocationContext } from "oriro/plugin-sdk/channel-inbound";
export { getAgentScopedMediaLocalRoots } from "oriro/plugin-sdk/agent-media-payload";
export { logInboundDrop } from "oriro/plugin-sdk/channel-inbound";
export { logTypingFailure } from "oriro/plugin-sdk/channel-outbound";
export {
  buildChannelKeyCandidates,
  resolveChannelEntryMatch,
} from "oriro/plugin-sdk/channel-targets";
