// Private runtime barrel for the bundled Voice Call extension.
// Keep this barrel thin and aligned with the local extension surface.

export { definePluginEntry } from "oriro/plugin-sdk/plugin-entry";
export type { OriroPluginApi } from "oriro/plugin-sdk/plugin-entry";
export type { GatewayRequestHandlerOptions } from "oriro/plugin-sdk/gateway-runtime";
export {
  isRequestBodyLimitError,
  readRequestBodyWithLimit,
  requestBodyErrorToText,
} from "oriro/plugin-sdk/webhook-request-guards";
export { fetchWithSsrFGuard, isBlockedHostnameOrIp } from "oriro/plugin-sdk/ssrf-runtime";
export type { SessionEntry } from "oriro/plugin-sdk/session-store-runtime";
export {
  TtsAutoSchema,
  TtsConfigSchema,
  TtsModeSchema,
  TtsProviderSchema,
} from "oriro/plugin-sdk/tts-runtime";
export { sleep } from "oriro/plugin-sdk/runtime-env";
