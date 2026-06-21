// Provider-index loader normalizes bundled installable-provider metadata and falls back to an empty index.
import { normalizeOriroProviderIndex } from "./normalize.js";
import { ORIRO_PROVIDER_INDEX } from "./oriro-provider-index.js";
import type { OriroProviderIndex } from "./types.js";

// Load the bundled provider index through the normalizer. Invalid generated or
// caller-supplied data falls back to an empty v1 index instead of leaking shape.
export function loadOriroProviderIndex(
  source: unknown = ORIRO_PROVIDER_INDEX,
): OriroProviderIndex {
  return normalizeOriroProviderIndex(source) ?? { version: 1, providers: {} };
}
