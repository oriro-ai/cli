import { describe, expect, it } from "vitest";
import { routerById } from "./catalog.js";
import { buildProviderNode } from "./register.js";

describe("buildProviderNode (Step 6 base fix)", () => {
  it("builds the complete models.providers node the agent resolver needs", () => {
    const node = buildProviderNode(routerById("google")!);
    expect(node.api).toBe("google-generative-ai");
    expect(node.baseUrl).toContain("generativelanguage.googleapis.com");
    expect(node.models.length).toBeGreaterThan(0);
    expect(node.models[0]).toHaveProperty("id");
    expect(node.models[0]).toHaveProperty("name");
  });

  it("templates the Cloudflare account id into the base URL", () => {
    const node = buildProviderNode(routerById("cloudflare")!, "acct123");
    expect(node.baseUrl).toContain("/accounts/acct123/ai/v1");
    expect(node.baseUrl).not.toContain("{account_id}");
  });

  it("OpenAI-compatible routers map to openai-completions", () => {
    expect(buildProviderNode(routerById("groq")!).api).toBe("openai-completions");
    expect(buildProviderNode(routerById("openrouter")!).api).toBe("openai-completions");
  });
});
