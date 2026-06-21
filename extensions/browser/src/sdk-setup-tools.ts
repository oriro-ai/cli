/**
 * Browser-local SDK setup/tooling bridge for CLI, media, and action helpers.
 */
export {
  callGatewayTool,
  listNodes,
  resolveNodeIdFromList,
  selectDefaultNodeFromList,
} from "oriro/plugin-sdk/agent-harness-runtime";
export type { AnyAgentTool, NodeListNode } from "oriro/plugin-sdk/agent-harness-runtime";
export {
  imageResultFromFile,
  jsonResult,
  readPositiveIntegerParam,
  readStringParam,
} from "oriro/plugin-sdk/channel-actions";
export { optionalStringEnum, stringEnum } from "oriro/plugin-sdk/channel-actions";
export {
  formatCliCommand,
  formatHelpExamples,
  inheritOptionFromParent,
  note,
  theme,
} from "oriro/plugin-sdk/cli-runtime";
export { danger, info } from "oriro/plugin-sdk/runtime-env";
export {
  IMAGE_REDUCE_QUALITY_STEPS,
  buildImageResizeSideGrid,
  getImageMetadata,
  isImageProcessorUnavailableError,
  resizeToJpeg,
} from "oriro/plugin-sdk/media-runtime";
export { detectMime } from "oriro/plugin-sdk/media-mime";
export { ensureMediaDir, saveMediaBuffer } from "oriro/plugin-sdk/media-runtime";
export { describeImageFile } from "oriro/plugin-sdk/media-understanding-runtime";
export { formatDocsLink } from "oriro/plugin-sdk/setup-tools";
