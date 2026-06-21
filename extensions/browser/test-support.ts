/**
 * Browser test-support re-exports from shared plugin-sdk test fixtures.
 */
export {
  createCliRuntimeCapture,
  expectGeneratedTokenPersistedToGatewayAuth,
  type CliMockOutputRuntime,
  type CliRuntimeCapture,
} from "oriro/plugin-sdk/test-fixtures";
export {
  createTempHomeEnv,
  withEnv,
  withEnvAsync,
  withFetchPreconnect,
  isLiveTestEnabled,
} from "oriro/plugin-sdk/test-env";
export type { FetchMock, TempHomeEnv } from "oriro/plugin-sdk/test-env";
export type { OriroConfig } from "oriro/plugin-sdk/config-contracts";
