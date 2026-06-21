// Packed Plugin Sdk Type Smoke script supports Oriro repository automation.
type PublicPluginSdkModules = [
  typeof import("oriro/plugin-sdk"),
  typeof import("oriro/plugin-sdk/channel-entry-contract"),
  typeof import("oriro/plugin-sdk/config-contracts"),
  typeof import("oriro/plugin-sdk/provider-entry"),
  typeof import("oriro/plugin-sdk/runtime-env"),
];

const resolvedModules = null as unknown as PublicPluginSdkModules;

void resolvedModules;
