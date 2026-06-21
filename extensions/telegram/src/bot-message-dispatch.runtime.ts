// Telegram plugin module implements bot message dispatch behavior.
export {
  loadSessionStore,
  readLatestAssistantTextFromSessionTranscript,
  resolveAndPersistSessionFile,
  resolveSessionStoreEntry,
  updateSessionStoreEntry,
} from "oriro/plugin-sdk/session-store-runtime";
export { resolveMarkdownTableMode } from "oriro/plugin-sdk/markdown-table-runtime";
export { getAgentScopedMediaLocalRoots } from "oriro/plugin-sdk/media-runtime";
export { resolveChunkMode } from "oriro/plugin-sdk/reply-dispatch-runtime";
export {
  generateTelegramTopicLabel as generateTopicLabel,
  resolveAutoTopicLabelConfig,
} from "./auto-topic-label.js";
