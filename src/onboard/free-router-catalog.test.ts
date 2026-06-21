// Covers the curated FREE-vs-Paid router catalog: flags, bases, and ordering.
import { describe, expect, it } from "vitest";
import {
  compareFreeRouterGroupIds,
  getFreeRouterEntry,
  isFreeRouterGroupId,
  listFreeRouterCatalog,
} from "./free-router-catalog.js";

describe("free router catalog", () => {
  it("marks every catalog entry FREE", () => {
    for (const entry of listFreeRouterCatalog()) {
      expect(entry.free).toBe(true);
    }
  });

  it("includes the verified no-credit-card free routers", () => {
    const freeIds = new Set(listFreeRouterCatalog().map((entry) => entry.groupId));
    for (const id of [
      "google",
      "groq",
      "mistral",
      "cerebras",
      "cloudflare-ai-gateway",
      "github-models",
      "nvidia",
      "deepseek",
      "zai",
      "sambanova",
      "siliconflow",
      "together",
      "fireworks",
      "cohere",
      "chutes",
      "huggingface",
      "scaleway",
      "openrouter",
      "ollama",
    ]) {
      expect(freeIds.has(id)).toBe(true);
    }
  });

  it("excludes unverified aggregators", () => {
    for (const id of ["ofox", "unify", "unify-ai", "vercel-ai-gateway"]) {
      expect(isFreeRouterGroupId(id)).toBe(false);
    }
  });

  it("excludes paid-only providers from the FREE catalog", () => {
    for (const id of ["openai", "anthropic", "xai"]) {
      expect(isFreeRouterGroupId(id)).toBe(false);
    }
  });

  it("carries OpenAI-compatible bases for the curated free routers", () => {
    const bases: Record<string, string> = {
      openrouter: "https://openrouter.ai/api/v1",
      groq: "https://api.groq.com/openai/v1",
      google: "https://generativelanguage.googleapis.com/v1beta",
      cerebras: "https://api.cerebras.ai/v1",
      mistral: "https://api.mistral.ai/v1",
      "github-models": "https://models.inference.ai.azure.com",
      nvidia: "https://integrate.api.nvidia.com/v1",
      deepseek: "https://api.deepseek.com/v1",
      zai: "https://api.z.ai/v1",
      sambanova: "https://api.sambanova.ai/v1",
      siliconflow: "https://api.siliconflow.cn/v1",
      together: "https://api.together.ai/v1",
      fireworks: "https://api.fireworks.ai/v1",
      cohere: "https://api.cohere.com/v1",
      huggingface: "https://api-inference.huggingface.co/v1",
    };
    for (const [id, base] of Object.entries(bases)) {
      expect(getFreeRouterEntry(id)?.apiBase).toBe(base);
    }
  });

  it("marks Ollama as local with no key required", () => {
    const ollama = getFreeRouterEntry("ollama");
    expect(ollama?.local).toBe(true);
    expect(ollama?.apiBase).toBeUndefined();
  });

  it("pins recommended-primary routers ahead of others", () => {
    expect(compareFreeRouterGroupIds("openrouter", "groq")).toBeLessThan(0);
    expect(compareFreeRouterGroupIds("groq", "google")).toBeLessThan(0);
    expect(compareFreeRouterGroupIds("google", "cerebras")).toBeLessThan(0);
    expect(compareFreeRouterGroupIds("cerebras", "mistral")).toBeLessThan(0);
    // Recommended beats a non-recommended free router.
    expect(compareFreeRouterGroupIds("mistral", "together")).toBeLessThan(0);
    // Two non-recommended sort by display name (Chutes < Together).
    expect(compareFreeRouterGroupIds("chutes", "together")).toBeLessThan(0);
  });
});
