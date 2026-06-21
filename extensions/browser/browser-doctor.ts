/**
 * Browser doctor API barrel. It exposes legacy profile cleanup and Chrome MCP
 * readiness helpers for Oriro doctor.
 */
export {
  detectLegacyOrirodBrowserProfileResidue,
  maybeArchiveLegacyOrirodBrowserProfileResidue,
  noteChromeMcpBrowserReadiness,
} from "./src/doctor-browser.js";
export type { LegacyOrirodBrowserProfileResidue } from "./src/doctor-browser.js";
