/** ACP server option re-exports and Oriro agent identity metadata. */
export type { AcpProvenanceMode, AcpServerOptions, AcpSession } from "@oriro/acp-core/types";
export { normalizeAcpProvenanceMode } from "@oriro/acp-core/types";
import { VERSION } from "../version.js";

/** ACP agent identity advertised during protocol initialization. */
export const ACP_AGENT_INFO = {
  name: "oriro-acp",
  title: "ORIRO ACP Gateway",
  version: VERSION,
};
