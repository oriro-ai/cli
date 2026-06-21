// Private runtime barrel for the bundled Nostr extension.
// Keep this barrel thin and aligned with the local extension surface.

export type { OriroConfig } from "oriro/plugin-sdk/config-contracts";
export { getPluginRuntimeGatewayRequestScope } from "oriro/plugin-sdk/plugin-runtime";
export type { PluginRuntime } from "oriro/plugin-sdk/runtime-store";
