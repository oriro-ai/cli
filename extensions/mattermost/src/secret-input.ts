// Mattermost plugin module implements secret input behavior.
export type { SecretInput } from "oriro/plugin-sdk/secret-input";
export {
  buildSecretInputSchema,
  hasConfiguredSecretInput,
  normalizeResolvedSecretInputString,
  normalizeSecretInputString,
} from "oriro/plugin-sdk/secret-input";
