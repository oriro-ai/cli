// Focused runtime contract for memory plugin config/state/helpers.

export type { AnyAgentTool } from "./host/oriro-runtime-agent.js";
export { resolveCronStyleNow } from "./host/oriro-runtime-agent.js";
export { DEFAULT_AGENT_COMPACTION_RESERVE_TOKENS_FLOOR } from "./host/oriro-runtime-agent.js";
export { resolveDefaultAgentId, resolveSessionAgentId } from "./host/oriro-runtime-agent.js";
export { resolveMemorySearchConfig } from "./host/oriro-runtime-agent.js";
export {
  asToolParamsRecord,
  jsonResult,
  readNumberParam,
  readStringParam,
} from "./host/oriro-runtime-agent.js";
export { SILENT_REPLY_TOKEN } from "./host/oriro-runtime-session.js";
export { parseNonNegativeByteSize } from "./host/oriro-runtime-config.js";
export {
  getRuntimeConfig,
  /** @deprecated Use getRuntimeConfig(), or pass the already loaded config through the call path. */
  loadConfig,
} from "./host/oriro-runtime-config.js";
export { resolveStateDir } from "./host/oriro-runtime-config.js";
export { resolveSessionTranscriptsDirForAgent } from "./host/oriro-runtime-config.js";
export { emptyPluginConfigSchema } from "./host/oriro-runtime-memory.js";
export {
  buildActiveMemoryPromptSection,
  getMemoryCapabilityRegistration,
  listActiveMemoryPublicArtifacts,
} from "./host/oriro-runtime-memory.js";
export { parseAgentSessionKey } from "./host/oriro-runtime-agent.js";
export type { OriroConfig } from "./host/oriro-runtime-config.js";
export type { MemoryCitationsMode } from "./host/oriro-runtime-config.js";
export type {
  MemoryFlushPlan,
  MemoryFlushPlanResolver,
  MemoryPluginCapability,
  MemoryPluginPublicArtifact,
  MemoryPluginPublicArtifactsProvider,
  MemoryPluginRuntime,
  MemoryPromptSectionBuilder,
} from "./host/oriro-runtime-memory.js";
export type { OriroPluginApi } from "./host/oriro-runtime-memory.js";
