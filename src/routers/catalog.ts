// ORIRO router catalog (Step 6). The full list the user selects from. Rule: only fakes
// are removed (Ofox, Unify); every no-credit-card option is "free"; anything that needs
// payment/recharge is "paid". We ship ZERO keys — "(free)" = free to obtain. `keyless`
// routers work with no key (verified live). Each router is validated (validate.ts) before
// it's trusted/used. ORIRO models are listed greyed/coming-soon. `kind` separates chat
// (routable by the Mux) from image/speech services.

export type ProviderApi =
  | "openai-completions"
  | "openai-responses"
  | "anthropic-messages"
  | "google-generative-ai"
  | "ollama";

export type RouterTier = "free" | "paid";
export type RouterKind = "chat" | "image" | "speech";

export interface RouterEntry {
  id: string;
  displayName: string;
  api: ProviderApi;
  /**
   * OpenAI-compatible base. The transport (and the validator) ALWAYS append
   * "/chat/completions", so baseUrl must be the endpoint MINUS that suffix — e.g.
   * Pollinations' chat URL is ".../openai/chat/completions", so its baseUrl is
   * ".../openai". This keeps the live validator and the real dispatch on the exact
   * same URL, so a router can never validate-pass yet dispatch-404.
   */
  baseUrl: string;
  freeModels: string[];
  obtainUrl?: string;
  keyless?: boolean;
  /** We have live-verified this works (only the keyless ones we probed). */
  verified?: boolean;
  validationKeyEnv?: string;
  comingSoon?: boolean;
  tier: RouterTier;
  kind: RouterKind;
}

const C = (
  e: Partial<RouterEntry> & { id: string; displayName: string; baseUrl: string },
): RouterEntry => ({
  api: "openai-completions",
  freeModels: [],
  tier: "free",
  kind: "chat",
  ...e,
});

export const ROUTER_CATALOG: readonly RouterEntry[] = [
  // ── Keyless & live-verified (works now, zero keys, through the agent) ──
  C({
    id: "pollinations",
    displayName: "Pollinations",
    baseUrl: "https://text.pollinations.ai/openai",
    freeModels: ["openai", "mistral"],
    obtainUrl: "https://pollinations.ai",
    keyless: true,
    verified: true,
  }),

  // ── Free, no credit card — user brings a free token (validated at add-time) ──
  // LLM7 serves anonymously over raw HTTP but REJECTS a bogus bearer, and the agent
  // transport must send one for remote URLs — so it is NOT keyless-through-the-agent.
  // A free token (no card) at llm7.io makes it work via `oriro routers add llm7 --key`.
  C({
    id: "llm7",
    displayName: "LLM7.io",
    baseUrl: "https://api.llm7.io/v1",
    freeModels: ["codestral-latest", "kimi-k2.6", "gpt-5.4-mini", "deepseek-v4-flash"],
    obtainUrl: "https://llm7.io",
  }),

  // ── Free, no credit card — user brings a free key (validated at add-time) ──
  C({
    id: "openrouter",
    displayName: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    freeModels: ["deepseek/deepseek-chat-v3-0324:free", "moonshotai/kimi-k2.6:free"],
    obtainUrl: "https://openrouter.ai/keys",
  }),
  C({
    id: "huggingface",
    displayName: "Hugging Face",
    // OpenAI-compatible Inference Router; the validator appends "/chat/completions".
    // BYOK: the USER pastes their OWN free HF token (never ORIRO's).
    baseUrl: "https://router.huggingface.co/v1",
    freeModels: ["meta-llama/Llama-3.1-8B-Instruct", "Qwen/Qwen2.5-7B-Instruct"],
    obtainUrl: "https://huggingface.co/settings/tokens",
  }),
  C({
    id: "requesty",
    displayName: "Requesty",
    baseUrl: "https://router.requesty.ai/v1",
    freeModels: ["google/gemini-2.0-flash-exp"],
    obtainUrl: "https://requesty.ai",
  }),
  C({
    id: "google",
    displayName: "Google AI Studio",
    api: "google-generative-ai",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    freeModels: ["gemini-2.5-flash", "gemini-2.0-flash"],
    obtainUrl: "https://aistudio.google.com/apikey",
  }),
  C({
    id: "groq",
    displayName: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    freeModels: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
    obtainUrl: "https://console.groq.com/keys",
  }),
  C({
    id: "mistral",
    displayName: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    freeModels: ["mistral-small-latest"],
    obtainUrl: "https://console.mistral.ai/api-keys",
  }),
  C({
    id: "cerebras",
    displayName: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    freeModels: ["llama-3.3-70b", "llama3.1-8b"],
    obtainUrl: "https://cloud.cerebras.ai",
  }),
  C({
    id: "cloudflare",
    displayName: "Cloudflare Workers AI",
    baseUrl: "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1",
    freeModels: ["@cf/meta/llama-3.1-8b-instruct"],
    obtainUrl: "https://dash.cloudflare.com/profile/api-tokens",
  }),
  C({
    id: "github-models",
    displayName: "GitHub Models",
    baseUrl: "https://models.inference.ai.azure.com",
    freeModels: ["gpt-4o-mini"],
    obtainUrl: "https://github.com/marketplace/models",
  }),
  C({
    id: "nvidia",
    displayName: "NVIDIA NIM",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    freeModels: ["moonshotai/kimi-k2.6", "meta/llama-3.1-8b-instruct"],
    obtainUrl: "https://build.nvidia.com",
  }),
  C({
    id: "sambanova",
    displayName: "SambaNova",
    baseUrl: "https://api.sambanova.ai/v1",
    freeModels: ["Meta-Llama-3.3-70B-Instruct"],
    obtainUrl: "https://cloud.sambanova.ai",
  }),
  C({
    id: "siliconflow",
    displayName: "SiliconFlow",
    baseUrl: "https://api.siliconflow.cn/v1",
    freeModels: ["Qwen/Qwen2.5-7B-Instruct"],
    obtainUrl: "https://siliconflow.cn",
  }),
  C({
    id: "deepseek",
    displayName: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    freeModels: ["deepseek-chat"],
    obtainUrl: "https://platform.deepseek.com/api_keys",
  }),
  C({
    id: "zai",
    displayName: "Z.AI GLM",
    baseUrl: "https://api.z.ai/api/paas/v4",
    freeModels: ["glm-4-flash"],
    obtainUrl: "https://z.ai",
  }),
  C({
    id: "scaleway",
    displayName: "Scaleway",
    baseUrl: "https://api.scaleway.ai/v1",
    freeModels: ["llama-3.1-8b-instruct"],
    obtainUrl: "https://console.scaleway.com",
  }),
  C({
    id: "xai",
    displayName: "xAI Grok",
    baseUrl: "https://api.x.ai/v1",
    freeModels: ["grok-2-latest"],
    obtainUrl: "https://console.x.ai",
  }),
  C({
    id: "together",
    displayName: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    freeModels: ["meta-llama/Llama-3.3-70B-Instruct-Turbo-Free"],
    obtainUrl: "https://api.together.ai",
  }),
  C({
    id: "fireworks",
    displayName: "Fireworks AI",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    freeModels: ["accounts/fireworks/models/llama-v3p1-8b-instruct"],
    obtainUrl: "https://fireworks.ai",
  }),
  C({
    id: "ai21",
    displayName: "AI21 Labs",
    baseUrl: "https://api.ai21.com/studio/v1",
    freeModels: ["jamba-mini"],
    obtainUrl: "https://studio.ai21.com",
  }),
  C({
    id: "hyperbolic",
    displayName: "Hyperbolic",
    baseUrl: "https://api.hyperbolic.xyz/v1",
    freeModels: ["meta-llama/Meta-Llama-3.1-8B-Instruct"],
    obtainUrl: "https://app.hyperbolic.xyz",
  }),
  C({
    id: "nebius",
    displayName: "Nebius",
    baseUrl: "https://api.studio.nebius.ai/v1",
    freeModels: ["meta-llama/Meta-Llama-3.1-8B-Instruct"],
    obtainUrl: "https://studio.nebius.ai",
  }),
  C({
    id: "novita",
    displayName: "Novita",
    baseUrl: "https://api.novita.ai/v3/openai",
    freeModels: ["meta-llama/llama-3.1-8b-instruct"],
    obtainUrl: "https://novita.ai",
  }),
  C({
    id: "upstage",
    displayName: "Upstage",
    baseUrl: "https://api.upstage.ai/v1/solar",
    freeModels: ["solar-mini"],
    obtainUrl: "https://console.upstage.ai",
  }),
  C({
    id: "nlpcloud",
    displayName: "NLP Cloud",
    baseUrl: "https://api.nlpcloud.io/v1",
    freeModels: ["finetuned-llama-3-70b"],
    obtainUrl: "https://nlpcloud.com",
  }),
  C({
    id: "baseten",
    displayName: "Baseten",
    baseUrl: "https://inference.baseten.co/v1",
    freeModels: ["llama-3.1-8b-instruct"],
    obtainUrl: "https://baseten.co",
  }),
  C({
    id: "anyscale",
    displayName: "Anyscale",
    baseUrl: "https://api.endpoints.anyscale.com/v1",
    freeModels: ["meta-llama/Meta-Llama-3.1-8B-Instruct"],
    obtainUrl: "https://anyscale.com",
  }),
  C({
    id: "inference-net",
    displayName: "Inference.net",
    baseUrl: "https://api.inference.net/v1",
    freeModels: ["meta-llama/llama-3.1-8b-instruct"],
    obtainUrl: "https://inference.net",
  }),
  C({
    id: "cohere",
    displayName: "Cohere",
    baseUrl: "https://api.cohere.ai/compatibility/v1",
    freeModels: ["command-r-08-2024"],
    obtainUrl: "https://dashboard.cohere.com/api-keys",
  }),
  C({
    id: "chutes",
    displayName: "Chutes",
    baseUrl: "https://llm.chutes.ai/v1",
    freeModels: ["deepseek-ai/DeepSeek-V3"],
    obtainUrl: "https://chutes.ai",
  }),
  C({
    id: "berget",
    displayName: "Berget AI",
    baseUrl: "https://api.berget.ai/v1",
    freeModels: ["mistralai/Mistral-Small-Instruct"],
    obtainUrl: "https://berget.ai",
  }),
  C({
    id: "huggingface",
    displayName: "Hugging Face",
    baseUrl: "https://router.huggingface.co/v1",
    freeModels: ["meta-llama/Llama-3.2-3B-Instruct"],
    obtainUrl: "https://huggingface.co/settings/tokens",
  }),
  C({
    id: "replicate",
    displayName: "Replicate",
    baseUrl: "https://api.replicate.com/v1",
    freeModels: ["meta/meta-llama-3.1-8b-instruct"],
    obtainUrl: "https://replicate.com/account/api-tokens",
  }),

  // ── Free gateways/proxies (no CC) — route through your own provider keys ──
  C({
    id: "vercel-ai-gateway",
    displayName: "Vercel AI Gateway",
    baseUrl: "https://ai-gateway.vercel.sh/v1",
    freeModels: ["openai/gpt-4o-mini"],
    obtainUrl: "https://vercel.com/ai-gateway",
  }),
  C({
    id: "portkey",
    displayName: "Portkey",
    baseUrl: "https://api.portkey.ai/v1",
    freeModels: [],
    obtainUrl: "https://portkey.ai",
  }),
  C({
    id: "helicone",
    displayName: "Helicone",
    baseUrl: "https://oai.helicone.ai/v1",
    freeModels: [],
    obtainUrl: "https://helicone.ai",
  }),
  C({
    id: "litellm",
    displayName: "LiteLLM (self-hosted)",
    baseUrl: "http://localhost:4000/v1",
    freeModels: [],
    keyless: true,
  }),
  C({
    id: "ollama",
    displayName: "Ollama (local)",
    api: "ollama",
    baseUrl: "http://localhost:11434/v1",
    freeModels: ["llama3.2"],
    keyless: true,
  }),

  // ── Image / speech services (catalog completeness; not chat-routable by the Mux) ──
  C({
    id: "stability",
    displayName: "Stability AI",
    baseUrl: "https://api.stability.ai/v2beta",
    freeModels: ["stable-image-core"],
    obtainUrl: "https://platform.stability.ai",
    kind: "image",
  }),
  C({
    id: "fal",
    displayName: "fal.ai",
    baseUrl: "https://fal.run",
    freeModels: ["fal-ai/flux/schnell"],
    obtainUrl: "https://fal.ai",
    kind: "image",
  }),
  C({
    id: "wavespeed",
    displayName: "WaveSpeedAI",
    baseUrl: "https://api.wavespeed.ai",
    freeModels: [],
    obtainUrl: "https://wavespeed.ai",
    kind: "image",
  }),
  C({
    id: "ai-horde",
    displayName: "AI Horde",
    baseUrl: "https://aihorde.net/api/v2",
    freeModels: [],
    obtainUrl: "https://aihorde.net",
    keyless: true,
    kind: "image",
  }),
  C({
    id: "assemblyai",
    displayName: "AssemblyAI",
    baseUrl: "https://api.assemblyai.com/v2",
    freeModels: [],
    obtainUrl: "https://assemblyai.com",
    kind: "speech",
  }),

  // ── Paid (requires payment/recharge — moved out of free per the CC rule) ──
  C({
    id: "moonshot",
    displayName: "Moonshot (Direct)",
    baseUrl: "https://api.moonshot.ai/v1",
    freeModels: ["kimi-k2.6"],
    obtainUrl: "https://platform.moonshot.ai",
    tier: "paid",
  }),

  // ── ORIRO models — coming soon, greyed/"(free)", not selectable yet ──
  C({ id: "oriro-gauss", displayName: "ORIRO-Gauss", baseUrl: "", comingSoon: true }),
  C({ id: "oriro-avila", displayName: "ORIRO-Avila", baseUrl: "", comingSoon: true }),
];

/** Selectable now (excludes coming-soon ORIRO models). */
export function selectableRouters(): RouterEntry[] {
  return ROUTER_CATALOG.filter((r) => !r.comingSoon);
}

/** Free, chat-capable routers (the default Mux selection set). */
export function freeChatRouters(): RouterEntry[] {
  return ROUTER_CATALOG.filter((r) => !r.comingSoon && r.tier === "free" && r.kind === "chat");
}

/** Keyless routers that work immediately with no key. */
export function keylessRouters(): RouterEntry[] {
  return ROUTER_CATALOG.filter((r) => r.keyless && !r.comingSoon);
}

export function routerById(id: string): RouterEntry | undefined {
  return ROUTER_CATALOG.find((r) => r.id === id);
}
