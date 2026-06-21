// Whatsapp API module exposes the plugin public contract.
export { resolveIdentityNamePrefix } from "oriro/plugin-sdk/agent-runtime";
export { formatInboundEnvelope } from "oriro/plugin-sdk/channel-inbound";
export { resolveInboundSessionEnvelopeContext } from "oriro/plugin-sdk/channel-inbound";
export { toLocationContext } from "oriro/plugin-sdk/channel-inbound";
export {
  createChannelMessageReplyPipeline,
  resolveChannelMessageSourceReplyDeliveryMode,
} from "oriro/plugin-sdk/channel-outbound";
export {
  isControlCommandMessage,
  shouldComputeCommandAuthorized,
} from "oriro/plugin-sdk/command-detection";
export { resolveChannelContextVisibilityMode } from "../config.runtime.js";
export { getAgentScopedMediaLocalRoots } from "oriro/plugin-sdk/media-runtime";
export type LoadConfigFn = typeof import("../config.runtime.js").getRuntimeConfig;
export {
  buildHistoryContextFromEntries,
  type HistoryEntry,
} from "oriro/plugin-sdk/reply-history";
export { resolveSendableOutboundReplyParts } from "oriro/plugin-sdk/reply-payload";
export {
  dispatchReplyWithBufferedBlockDispatcher,
  finalizeInboundContext,
  resolveChunkMode,
  resolveTextChunkLimit,
  type getReplyFromConfig,
  type ReplyPayload,
} from "oriro/plugin-sdk/reply-runtime";
export {
  resolveInboundLastRouteSessionKey,
  type resolveAgentRoute,
} from "oriro/plugin-sdk/routing";
export { logVerbose, shouldLogVerbose, type getChildLogger } from "oriro/plugin-sdk/runtime-env";
export { resolvePinnedMainDmOwnerFromAllowlist } from "oriro/plugin-sdk/security-runtime";
export { resolveMarkdownTableMode } from "oriro/plugin-sdk/markdown-table-runtime";
export { jidToE164, normalizeE164 } from "../../text-runtime.js";
