// ORIRO Step 6 — the base fix. Registering a router writes the COMPLETE provider node
// (api + baseUrl + models[]) that the agent resolver requires. The key itself is stored
// by the existing auth flow; this adds the one piece onboarding was missing — so any
// brand (free or BYOK) plugs in identically. Idempotent.
import { mutateConfigFile } from "../config/mutate.js";
import type { RouterEntry } from "./catalog.js";

/** Obviously-fake bearer for keyless routers: satisfies the SDK; tolerant endpoints ignore it. */
export const KEYLESS_SENTINEL = "oriro-keyless-no-key-required";

export interface ProviderNode {
  api: string;
  baseUrl: string;
  models: { id: string; name: string }[];
}

/** Pure: build the models.providers.<id> node from a catalog entry. */
export function buildProviderNode(entry: RouterEntry, accountId?: string): ProviderNode {
  return {
    api: entry.api,
    baseUrl: entry.baseUrl.replace("{account_id}", accountId ?? ""),
    models: entry.freeModels.map((id) => ({ id, name: id })),
  };
}

/** Persist the provider node into models.providers (merges). Stores a key when given
 *  (keyed routers); keyless routers need none. This is the one piece base onboarding missed. */
export async function registerRouterProvider(
  entry: RouterEntry,
  opts?: { accountId?: string; key?: string },
): Promise<ProviderNode> {
  if (entry.comingSoon) {
    throw new Error(`${entry.displayName} is coming soon and cannot be registered yet.`);
  }
  const node = buildProviderNode(entry, opts?.accountId);
  const stored: ProviderNode & { apiKey?: string } = { ...node };
  if (opts?.key) {
    stored.apiKey = opts.key;
  } else if (entry.keyless) {
    // The OpenAI-compatible transport requires a non-empty key to construct and always
    // sends "Bearer <key>" for remote URLs. So a router is keyless-through-the-agent only
    // if it serves regardless of the bearer value. We store a clearly-fake sentinel: the
    // SDK is satisfied, and a tolerant endpoint (Pollinations → anonymous tier) serves
    // normally. Routers that REJECT a bogus bearer (e.g. LLM7) are NOT marked keyless —
    // they carry obtainUrl and require a free key via `--key`. Local routers
    // (Ollama/LiteLLM) keep using the base's localhost no-auth marker instead.
    stored.apiKey = KEYLESS_SENTINEL;
  }
  await mutateConfigFile({
    mutate: (draft) => {
      const models = (draft.models ??= {}) as { providers?: Record<string, unknown> };
      const providers = (models.providers ??= {});
      providers[entry.id] = { ...(providers[entry.id] as object | undefined), ...stored };
    },
  });
  return node;
}
