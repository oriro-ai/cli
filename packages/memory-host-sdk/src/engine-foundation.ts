// Real workspace contract for memory engine foundation concerns.

export {
  resolveAgentContextLimits,
  resolveAgentDir,
  resolveAgentWorkspaceDir,
  resolveDefaultAgentId,
  resolveSessionAgentId,
} from "./host/oriro-runtime-agent.js";
export {
  resolveMemorySearchConfig,
  resolveMemorySearchSyncConfig,
  type ResolvedMemorySearchConfig,
  type ResolvedMemorySearchSyncConfig,
} from "./host/oriro-runtime-agent.js";
export { parseDurationMs } from "./host/oriro-runtime-config.js";
export { loadConfig } from "./host/oriro-runtime-config.js";
export { resolveStateDir } from "./host/oriro-runtime-config.js";
export { resolveSessionTranscriptsDirForAgent } from "./host/oriro-runtime-config.js";
export {
  hasConfiguredSecretInput,
  normalizeResolvedSecretInputString,
} from "./host/oriro-runtime-config.js";
export { root } from "./host/oriro-runtime-io.js";
export { isPathInside } from "./host/fs-utils.js";
export { createSubsystemLogger } from "./host/oriro-runtime-io.js";
export { detectMime } from "./host/oriro-runtime-io.js";
export { resolveGlobalSingleton } from "./host/oriro-runtime-io.js";
export { onSessionTranscriptUpdate } from "./host/oriro-runtime-session.js";
export { splitShellArgs } from "./host/oriro-runtime-io.js";
export { runTasksWithConcurrency } from "./host/oriro-runtime-io.js";
export {
  shortenHomeInString,
  shortenHomePath,
  resolveUserPath,
  truncateUtf16Safe,
} from "./host/oriro-runtime-io.js";
export type { OriroConfig } from "./host/oriro-runtime-config.js";
export type { SessionSendPolicyConfig } from "./host/oriro-runtime-config.js";
export type { SecretInput } from "./host/oriro-runtime-config.js";
export type {
  MemoryBackend,
  MemoryCitationsMode,
  MemoryQmdConfig,
  MemoryQmdIndexPath,
  MemoryQmdMcporterConfig,
  MemoryQmdSearchMode,
} from "./host/oriro-runtime-config.js";
export type { MemorySearchConfig } from "./host/oriro-runtime-config.js";
