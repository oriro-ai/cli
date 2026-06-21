// Telegram plugin module implements send behavior.
export { requireRuntimeConfig } from "oriro/plugin-sdk/plugin-config-runtime";
export { resolveMarkdownTableMode } from "oriro/plugin-sdk/markdown-table-runtime";
export type { OriroConfig } from "oriro/plugin-sdk/config-contracts";
export type { PollInput, MediaKind } from "oriro/plugin-sdk/media-runtime";
export {
  buildOutboundMediaLoadOptions,
  getImageMetadata,
  isGifMedia,
  kindFromMime,
  normalizePollInput,
  probeVideoDimensions,
} from "oriro/plugin-sdk/media-runtime";
export { loadWebMedia } from "oriro/plugin-sdk/web-media";
