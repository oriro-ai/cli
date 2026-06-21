// Provider-index public facade for normalized provider discovery metadata.
export { loadOriroProviderIndex } from "./load.js";
export { normalizeOriroProviderIndex } from "./normalize.js";
export type {
  OriroProviderIndex,
  OriroProviderIndexPluginInstall,
  OriroProviderIndexPlugin,
  OriroProviderIndexProviderAuthChoice,
  OriroProviderIndexProvider,
} from "./types.js";
