// Diagnostics Prometheus API module exposes the plugin public contract.
export type {
  DiagnosticEventMetadata,
  DiagnosticEventPayload,
} from "oriro/plugin-sdk/diagnostic-runtime";
export { isInternalDiagnosticEventMetadata } from "oriro/plugin-sdk/diagnostic-runtime";
export {
  emptyPluginConfigSchema,
  type OriroPluginApi,
  type OriroPluginHttpRouteHandler,
  type OriroPluginService,
  type OriroPluginServiceContext,
} from "oriro/plugin-sdk/plugin-entry";
export { redactSensitiveText } from "oriro/plugin-sdk/security-runtime";
