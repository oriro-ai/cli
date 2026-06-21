/** ACP runtime error exports wired to Oriro secret redaction. */
import { configureAcpErrorRedactor } from "@oriro/acp-core";
import { redactSensitiveText } from "../../logging/redact.js";

// Ensure ACP-core runtime errors use Oriro's secret redaction before re-export.
configureAcpErrorRedactor(redactSensitiveText);

export * from "@oriro/acp-core/runtime/errors";
