import { describe, expect, it } from "vitest";
import {
  ROUTER_CATALOG,
  freeChatRouters,
  keylessRouters,
  routerById,
  selectableRouters,
} from "./catalog.js";

describe("router catalog (Step 6)", () => {
  it("excludes ONLY the fakes (Ofox, Unify); keeps everything else", () => {
    const ids = ROUTER_CATALOG.map((r) => r.id.toLowerCase());
    expect(ids).not.toContain("ofox");
    expect(ids).not.toContain("unify");
  });

  it("every selectable router has an api + a base URL", () => {
    for (const r of selectableRouters()) {
      expect(r.api).toBeTruthy();
      expect(r.baseUrl.length).toBeGreaterThan(0);
    }
  });

  it("free chat routers carry at least one free model and tier=free", () => {
    const withModels = freeChatRouters().filter((r) => r.freeModels.length > 0);
    expect(withModels.length).toBeGreaterThanOrEqual(20); // broad free tier
    for (const r of withModels) expect(r.tier).toBe("free");
  });

  it("CC-required goes to paid (Moonshot), not free", () => {
    expect(routerById("moonshot")?.tier).toBe("paid");
    expect(freeChatRouters().map((r) => r.id)).not.toContain("moonshot");
  });

  it("Pollinations is the keyless live-verified chat router (works through the agent, no key)", () => {
    const keyless = keylessRouters().map((r) => r.id);
    expect(keyless).toContain("pollinations");
    expect(routerById("pollinations")?.verified).toBe(true);
  });

  it("LLM7 is a free-key router, NOT keyless (it rejects a bogus bearer the agent must send)", () => {
    // Honest classification: LLM7 serves anonymously over raw HTTP but 401s on a bogus
    // bearer, and the remote transport always sends one — so it needs a free token.
    expect(routerById("llm7")?.keyless).toBeFalsy();
    expect(routerById("llm7")?.verified).toBeFalsy();
    expect(routerById("llm7")?.obtainUrl).toBeTruthy();
  });

  it("lists ORIRO-Gauss/Avila as coming-soon and excludes them from selectable", () => {
    expect(routerById("oriro-gauss")?.comingSoon).toBe(true);
    expect(routerById("oriro-avila")?.comingSoon).toBe(true);
    const selectable = selectableRouters().map((r) => r.id);
    expect(selectable).not.toContain("oriro-gauss");
    expect(selectable).not.toContain("oriro-avila");
  });

  it("image/speech services are tagged (not chat-routable)", () => {
    expect(routerById("stability")?.kind).toBe("image");
    expect(routerById("assemblyai")?.kind).toBe("speech");
    expect(freeChatRouters().map((r) => r.id)).not.toContain("stability");
  });
});
