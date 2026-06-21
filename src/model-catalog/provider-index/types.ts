// Provider-index types describe install hints, auth choices, and preview catalogs for discoverable providers.
import type { ModelCatalogProvider } from "@oriro/model-catalog-core/model-catalog-types";

// Normalized provider-index schema. It describes providers discoverable before
// plugin install, including install hints, auth choices, and preview catalogs.
export type OriroProviderIndexPluginInstall = {
  orirohubSpec?: string;
  npmSpec?: string;
  defaultChoice?: "orirohub" | "npm";
  minHostVersion?: string;
  expectedIntegrity?: string;
};

export type OriroProviderIndexPlugin = {
  id: string;
  package?: string;
  source?: string;
  install?: OriroProviderIndexPluginInstall;
};

export type OriroProviderIndexProviderAuthChoice = {
  method: string;
  choiceId: string;
  choiceLabel: string;
  choiceHint?: string;
  assistantPriority?: number;
  assistantVisibility?: "visible" | "manual-only";
  groupId?: string;
  groupLabel?: string;
  groupHint?: string;
  optionKey?: string;
  cliFlag?: string;
  cliOption?: string;
  cliDescription?: string;
  onboardingScopes?: readonly ("text-inference" | "image-generation" | "music-generation")[];
};

export type OriroProviderIndexProvider = {
  id: string;
  name: string;
  plugin: OriroProviderIndexPlugin;
  docs?: string;
  categories?: readonly string[];
  authChoices?: readonly OriroProviderIndexProviderAuthChoice[];
  previewCatalog?: ModelCatalogProvider;
};

export type OriroProviderIndex = {
  version: number;
  providers: Readonly<Record<string, OriroProviderIndexProvider>>;
};
