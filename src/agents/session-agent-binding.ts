/**
 * Session-to-agent binding resolver.
 *
 * Derives the trusted active agent from explicit agent ids, agent session keys, or configured main-session aliases.
 */
import {
  normalizeLowercaseStringOrEmpty,
  normalizeOptionalString,
} from "@oriro/normalization-core/string-coerce";
import type { OriroConfig } from "../config/types.oriro.js";
import {
  parseAgentSessionKey,
  normalizeAgentId,
  normalizeMainKey,
} from "../routing/session-key.js";
import { resolveDefaultAgentId } from "./agent-scope.js";

/**
 * Resolve the trusted active agent bound to a host-owned session reference.
 */
export function resolveBoundAgentIdForSession(params: {
  config?: OriroConfig;
  sessionKey?: string;
  agentId?: string;
}): string | undefined {
  const explicitAgentId = normalizeOptionalString(params.agentId);
  if (explicitAgentId) {
    return normalizeAgentId(explicitAgentId);
  }

  const normalizedSessionKey = normalizeOptionalString(params.sessionKey);
  if (!normalizedSessionKey) {
    return undefined;
  }

  const parsed = parseAgentSessionKey(normalizedSessionKey);
  if (parsed?.agentId) {
    return normalizeAgentId(parsed.agentId);
  }

  const loweredSessionKey = normalizeLowercaseStringOrEmpty(normalizedSessionKey);
  const mainKey = normalizeMainKey(params.config?.session?.mainKey);
  if (loweredSessionKey === "main" || loweredSessionKey === mainKey) {
    return resolveDefaultAgentId(params.config ?? {});
  }
  return undefined;
}
