// Curated FREE-vs-Paid classification for AI router/provider onboarding.
//
// ORIRO's OR-FREE spirit: a user with no paid plan must never be stuck. This
// catalog marks which providers offer a real no-credit-card free tier so the
// onboarding picker can surface a "FREE AI" section first and never strand a
// budget user behind a paywall. Classification is curated product metadata
// (verified no-CC list), keyed by the provider/group id that onboarding already
// uses for grouping — it does not add provider runtime/ids into core routing.
//
// This is data only. Auth, model probing, and persistence stay in the existing
// provider setup-flow path; this module just answers "is this group FREE?" and
// supplies OpenAI-compatible bases for the curated free routers.

/** A curated free-tier router/provider entry. */
export type FreeRouterCatalogEntry = {
  /**
   * Group id used by the onboarding auth-choice grouping. Matches the manifest
   * `groupId` (usually the provider id) so the FREE flag can be joined onto the
   * existing grouped options without re-deriving provider identity.
   */
  groupId: string;
  /** Human-facing display name. */
  displayName: string;
  /**
   * OpenAI-compatible (or native) API base URL. Informational/onboarding hint
   * for custom-provider presets; shipped providers carry their own base in
   * their manifest model catalog.
   */
  apiBase?: string;
  /** True when no payment method / credit card is required to start. */
  free: true;
  /** True when the provider runs fully locally and needs no API key. */
  local?: boolean;
  /**
   * Lower number => surfaced earlier within the FREE section. Used to pin the
   * recommended-primary free routers to the top.
   */
  recommendedPriority?: number;
};

/**
 * Recommended-primary free routers, surfaced first inside the FREE section.
 * Order: OpenRouter, Groq, Google AI Studio, Cerebras, Mistral.
 */
const RECOMMENDED_FREE_ORDER: ReadonlyArray<string> = [
  "openrouter",
  "groq",
  "google",
  "cerebras",
  "mistral",
];

function recommendedPriorityFor(groupId: string): number | undefined {
  const index = RECOMMENDED_FREE_ORDER.indexOf(groupId);
  return index === -1 ? undefined : index;
}

/**
 * Verified no-credit-card free routers/providers. Group ids align with shipped
 * extension ids where one exists (groq, cerebras, mistral, deepseek, zai,
 * together, fireworks, cohere, chutes, huggingface, nvidia, openrouter, google,
 * cloudflare-ai-gateway, ollama); the rest are OpenAI-compatible custom presets.
 *
 * EXCLUDED by product decision (unverified / not real aggregators): Ofox,
 * Unify AI, Vercel AI Gateway.
 */
const FREE_ROUTER_ENTRIES: ReadonlyArray<Omit<FreeRouterCatalogEntry, "recommendedPriority">> = [
  // --- Recommended-primary free routers ---
  {
    groupId: "openrouter",
    displayName: "OpenRouter",
    apiBase: "https://openrouter.ai/api/v1",
    free: true,
  },
  { groupId: "groq", displayName: "Groq", apiBase: "https://api.groq.com/openai/v1", free: true },
  {
    groupId: "google",
    displayName: "Google AI Studio",
    apiBase: "https://generativelanguage.googleapis.com/v1beta",
    free: true,
  },
  {
    groupId: "cerebras",
    displayName: "Cerebras",
    apiBase: "https://api.cerebras.ai/v1",
    free: true,
  },
  { groupId: "mistral", displayName: "Mistral", apiBase: "https://api.mistral.ai/v1", free: true },

  // --- Other verified no-credit-card free routers ---
  {
    groupId: "cloudflare-ai-gateway",
    displayName: "Cloudflare Workers AI",
    free: true,
  },
  {
    groupId: "github-models",
    displayName: "GitHub Models",
    apiBase: "https://models.inference.ai.azure.com",
    free: true,
  },
  {
    groupId: "nvidia",
    displayName: "NVIDIA NIM",
    apiBase: "https://integrate.api.nvidia.com/v1",
    free: true,
  },
  {
    groupId: "deepseek",
    displayName: "DeepSeek",
    apiBase: "https://api.deepseek.com/v1",
    free: true,
  },
  { groupId: "zai", displayName: "Z.AI GLM", apiBase: "https://api.z.ai/v1", free: true },
  {
    groupId: "sambanova",
    displayName: "SambaNova",
    apiBase: "https://api.sambanova.ai/v1",
    free: true,
  },
  {
    groupId: "siliconflow",
    displayName: "SiliconFlow",
    apiBase: "https://api.siliconflow.cn/v1",
    free: true,
  },
  {
    groupId: "together",
    displayName: "Together",
    apiBase: "https://api.together.ai/v1",
    free: true,
  },
  {
    groupId: "fireworks",
    displayName: "Fireworks",
    apiBase: "https://api.fireworks.ai/v1",
    free: true,
  },
  { groupId: "cohere", displayName: "Cohere", apiBase: "https://api.cohere.com/v1", free: true },
  { groupId: "chutes", displayName: "Chutes", free: true },
  {
    groupId: "huggingface",
    displayName: "Hugging Face",
    apiBase: "https://api-inference.huggingface.co/v1",
    free: true,
  },
  { groupId: "scaleway", displayName: "Scaleway", free: true },

  // --- Local, no key ---
  { groupId: "ollama", displayName: "Ollama (local)", free: true, local: true },
];

const FREE_ROUTER_CATALOG: ReadonlyArray<FreeRouterCatalogEntry> = FREE_ROUTER_ENTRIES.map(
  (entry) => {
    const priority = recommendedPriorityFor(entry.groupId);
    return priority === undefined ? { ...entry } : { ...entry, recommendedPriority: priority };
  },
);

const FREE_ROUTER_BY_GROUP_ID: ReadonlyMap<string, FreeRouterCatalogEntry> = new Map(
  FREE_ROUTER_CATALOG.map((entry) => [entry.groupId, entry] as const),
);

/** All curated FREE router/provider entries. */
export function listFreeRouterCatalog(): FreeRouterCatalogEntry[] {
  return [...FREE_ROUTER_CATALOG];
}

/** Lookup a FREE catalog entry by its group/provider id. */
export function getFreeRouterEntry(groupId: string): FreeRouterCatalogEntry | undefined {
  return FREE_ROUTER_BY_GROUP_ID.get(groupId.trim());
}

/** True when the group/provider id is a curated no-credit-card free router. */
export function isFreeRouterGroupId(groupId: string): boolean {
  return FREE_ROUTER_BY_GROUP_ID.has(groupId.trim());
}

/**
 * Sort comparator for two FREE group ids: recommended-primary routers first (in
 * pinned order), then everything else stably by display name.
 */
export function compareFreeRouterGroupIds(a: string, b: string): number {
  const entryA = getFreeRouterEntry(a);
  const entryB = getFreeRouterEntry(b);
  const priorityA = entryA?.recommendedPriority ?? Number.POSITIVE_INFINITY;
  const priorityB = entryB?.recommendedPriority ?? Number.POSITIVE_INFINITY;
  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }
  const nameA = entryA?.displayName ?? a;
  const nameB = entryB?.displayName ?? b;
  return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
}
