// Diagnostics Otel API module exposes the plugin public contract.
export {
  createChildDiagnosticTraceContext,
  createDiagnosticTraceContext,
  emitDiagnosticEvent,
  formatDiagnosticTraceparent,
  isValidDiagnosticSpanId,
  isValidDiagnosticTraceFlags,
  isValidDiagnosticTraceId,
  onDiagnosticEvent,
  parseDiagnosticTraceparent,
  type DiagnosticEventMetadata,
  type DiagnosticEventPayload,
  type DiagnosticTraceContext,
} from "oriro/plugin-sdk/diagnostic-runtime";
export { emptyPluginConfigSchema, type OriroPluginApi } from "oriro/plugin-sdk/plugin-entry";
export type {
  OriroPluginService,
  OriroPluginServiceContext,
} from "oriro/plugin-sdk/plugin-entry";
export { redactSensitiveText } from "oriro/plugin-sdk/security-runtime";
