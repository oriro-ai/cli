// Duckduckgo API module exposes the plugin public contract.
import type { WebSearchProviderPlugin } from "oriro/plugin-sdk/provider-web-search-contract";
import { createDuckDuckGoWebSearchProviderBase } from "./src/ddg-search-provider.shared.js";

export function createDuckDuckGoWebSearchProvider(): WebSearchProviderPlugin {
  return {
    ...createDuckDuckGoWebSearchProviderBase(),
    createTool: () => null,
  };
}
