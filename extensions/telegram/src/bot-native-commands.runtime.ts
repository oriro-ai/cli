// Telegram plugin module implements bot native commands behavior.
export {
  ensureConfiguredBindingRouteReady,
  recordInboundSessionMetaSafe,
} from "oriro/plugin-sdk/conversation-runtime";
export { getAgentScopedMediaLocalRoots } from "oriro/plugin-sdk/media-runtime";
export {
  executePluginCommand,
  getPluginCommandSpecs,
  matchPluginCommand,
} from "oriro/plugin-sdk/plugin-runtime";
export {
  finalizeInboundContext,
  resolveChunkMode,
} from "oriro/plugin-sdk/reply-dispatch-runtime";
export { resolveThreadSessionKeys } from "oriro/plugin-sdk/routing";
export { getSessionEntry } from "oriro/plugin-sdk/session-store-runtime";
