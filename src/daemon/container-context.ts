/** Detects whether a daemon was launched by Oriro's container-aware service wrapper. */
import { normalizeOptionalString } from "@oriro/normalization-core/string-coerce";

/** Resolves the daemon container hint exposed by managed service environments. */
export function resolveDaemonContainerContext(
  env: Record<string, string | undefined> = process.env,
): string | null {
  return (
    normalizeOptionalString(env.ORIRO_CONTAINER_HINT) ||
    normalizeOptionalString(env.ORIRO_CONTAINER) ||
    null
  );
}
