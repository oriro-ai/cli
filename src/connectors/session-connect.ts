// UX-5 (2026-07-04): actually WIRE the user's MCP connectors into the live agent session. The MCP
// client + tool bridge were real and tested but only exercised by a spike — session assembly never
// connected added connectors, so their tools never reached the model. This closes that: connect +
// list tools UP FRONT (async, fail-soft), then a sync factory registers them (Pi factories register
// synchronously, so post-init background registration wouldn't stick).
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { connectServer, listAllTools, type ServerConfig } from "./mcp-client.js";
import { registerToolList, type McpToolInfo } from "./register.js";
import { addedConnectors } from "./connectors.js";
import { readCustomServers } from "./custom.js";

const CONNECT_TIMEOUT_MS = 8_000;

export interface PreparedConnector {
  name: string;
  client: Client;
  tools: McpToolInfo[];
}

/** Connect the user's added catalog connectors + trusted custom MCP servers and list their tools.
 *  Fail-soft per server: one that's down / needs auth / misconfigured is skipped, never breaking startup. */
export async function prepareConnectors(): Promise<PreparedConnector[]> {
  const targets: Array<{ name: string; config: ServerConfig; allowLocal?: boolean }> = [];
  for (const c of addedConnectors()) {
    if (c.mcpUrl) targets.push({ name: c.slug, config: { type: "http", url: c.mcpUrl } });
  }
  for (const s of readCustomServers()) {
    if (s.trusted) targets.push({ name: s.name, config: s.config, allowLocal: true });
  }
  const out: PreparedConnector[] = [];
  for (const t of targets) {
    try {
      const conn = await connectServer(t.name, t.config, {
        timeoutMs: CONNECT_TIMEOUT_MS,
        ...(t.allowLocal ? { allowLocal: true } : {}),
      });
      const tools = await listAllTools(conn.client);
      out.push({ name: t.name, client: conn.client, tools });
    } catch { /* a connector that's unreachable / needs auth is simply not wired this session */ }
  }
  return out;
}

/** SYNC factory step: register the pre-listed tools into Pi (dedup public names across servers). */
export function registerPreparedConnectors(pi: ExtensionAPI, prepared: PreparedConnector[]): void {
  const seen = new Set<string>();
  for (const p of prepared) registerToolList(pi, p.name, p.client, p.tools, seen);
}
