// ORIRO Step 7 — `oriro connectors` logic: list the validated catalog, add (validate + record,
// INERT — nothing connects until a session actually uses it), remove. The live MCP handshake
// happens at connect/use time (mcp-client.ts), never at add time. Local-only, zero footprint.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { oriroDir, ensureOriroDir } from "../config/paths.js";
import { CONNECTOR_CATALOG, connectorBySlug, type ConnectorEntry } from "./catalog.js";

function file(): string {
  return join(oriroDir(), "connectors.json");
}
function readAdded(): string[] {
  try {
    const v = JSON.parse(readFileSync(file(), "utf8"));
    return Array.isArray(v) ? (v as string[]) : [];
  } catch {
    return [];
  }
}
function writeAdded(slugs: string[]): void {
  writeFileSync(join(ensureOriroDir(), "connectors.json"), JSON.stringify([...new Set(slugs)], null, 2), "utf8");
}

export function listConnectors(category?: string): readonly ConnectorEntry[] {
  return category ? CONNECTOR_CATALOG.filter((c) => c.category === category) : CONNECTOR_CATALOG;
}

/** The distinct connector categories in the catalog (for validating a `list <category>` filter). */
export function connectorCategories(): string[] {
  return [...new Set(CONNECTOR_CATALOG.map((c) => c.category))].sort();
}

/** True if the slug is currently in the user's added list. */
export function isConnectorAdded(slug: string): boolean {
  return readAdded().includes(slug);
}

export interface AddConnectorResult {
  ok: boolean;
  error?: string;
}

/** Add a connector — validate the catalog entry (exists + mcp_url + well-formed schema), then
 *  record it. INERT: nothing connects now; the MCP handshake happens when a session uses it. */
export function addConnector(slug: string): AddConnectorResult {
  const entry = connectorBySlug(slug);
  if (!entry) return { ok: false, error: `unknown connector '${slug}' — run \`oriro connectors list\`` };
  if (!entry.mcpUrl) return { ok: false, error: `'${slug}' has no MCP source` };
  if (!entry.configSchema || typeof entry.configSchema !== "object") return { ok: false, error: `'${slug}' has no config schema` };
  writeAdded([...readAdded(), slug]);
  return { ok: true };
}

export function addedConnectors(): ConnectorEntry[] {
  const added = new Set(readAdded());
  return CONNECTOR_CATALOG.filter((c) => added.has(c.slug));
}

/** Remove a connector from the added list. Returns true if it was actually present. */
export function removeConnector(slug: string): boolean {
  const before = readAdded();
  if (!before.includes(slug)) return false;
  writeAdded(before.filter((s) => s !== slug));
  return true;
}
