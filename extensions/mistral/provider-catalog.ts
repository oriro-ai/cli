// Mistral provider module implements model/runtime integration.
import { buildManifestModelProviderConfig } from "oriro/plugin-sdk/provider-catalog-shared";
import type { ModelProviderConfig } from "oriro/plugin-sdk/provider-model-shared";
import manifest from "./oriro.plugin.json" with { type: "json" };

export function buildMistralProvider(): ModelProviderConfig {
  return buildManifestModelProviderConfig({
    providerId: "mistral",
    catalog: manifest.modelCatalog.providers.mistral,
  });
}
