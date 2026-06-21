// Private runtime barrel for the bundled Tlon extension.
// Keep this barrel thin and aligned with the local extension surface.

export type { ReplyPayload } from "oriro/plugin-sdk/reply-runtime";
export type { OriroConfig } from "oriro/plugin-sdk/config-contracts";
export type { RuntimeEnv } from "oriro/plugin-sdk/runtime";
export { createDedupeCache } from "oriro/plugin-sdk/core";
export { createLoggerBackedRuntime } from "./src/logger-runtime.js";
export {
  fetchWithSsrFGuard,
  isBlockedHostnameOrIp,
  ssrfPolicyFromAllowPrivateNetwork,
  ssrfPolicyFromDangerouslyAllowPrivateNetwork,
  type LookupFn,
  type SsrFPolicy,
} from "oriro/plugin-sdk/ssrf-runtime";
export { SsrFBlockedError } from "oriro/plugin-sdk/ssrf-runtime";
