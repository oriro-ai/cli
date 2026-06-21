import {
  createModelCatalogPresetAppliers,
  type OriroConfig,
} from "oriro/plugin-sdk/provider-onboard";
import { buildCohereModelDefinition, COHERE_BASE_URL, COHERE_MODEL_CATALOG } from "./models.js";

export const COHERE_DEFAULT_MODEL_ID = "command-a-03-2025";
export const COHERE_DEFAULT_MODEL_REF = `cohere/${COHERE_DEFAULT_MODEL_ID}`;

const coherePresetAppliers = createModelCatalogPresetAppliers({
  primaryModelRef: COHERE_DEFAULT_MODEL_REF,
  resolveParams: (_cfg: OriroConfig) => ({
    providerId: "cohere",
    api: "openai-completions",
    baseUrl: COHERE_BASE_URL,
    catalogModels: COHERE_MODEL_CATALOG.map(buildCohereModelDefinition),
    aliases: [{ modelRef: COHERE_DEFAULT_MODEL_REF, alias: "Cohere Command A" }],
  }),
});

export function applyCohereConfig(cfg: OriroConfig): OriroConfig {
  return coherePresetAppliers.applyConfig(cfg);
}
