/**
 * Resolves whether Codex app-server profiling instrumentation is enabled by
 * Oriro diagnostic flags.
 */
import type { OriroConfig } from "oriro/plugin-sdk/config-contracts";
import { isDiagnosticFlagEnabled } from "oriro/plugin-sdk/diagnostic-runtime";

const PROFILER_FLAGS = ["profiler", "codex.profiler"] as const;

/** Checks the generic and Codex-specific profiler diagnostic flags. */
export function isCodexAppServerProfilerEnabled(
  config?: OriroConfig,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return PROFILER_FLAGS.some((flag) => isDiagnosticFlagEnabled(flag, config, env));
}
