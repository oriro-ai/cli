// ORIRO Step 7 — bridge connected MCP tools into Pi's tool layer. Each tool is registered as
// `mcp__{server}__{tool}` (sanitized + deduped across servers); the closure binds the owning
// client + real tool name (no fragile string-split needed). CallToolResult is mapped faithfully,
// honoring isError. v1 uses a permissive param schema (the MCP server validates) — full
// JSON-Schema→TypeBox conversion is a flagged hardening follow-up.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { sanitizeName, listAllTools, CALL_TIMEOUT_MS } from "./mcp-client.js";

interface McpContentBlock {
  type: string;
  text?: string;
}
interface McpCallResult {
  content?: McpContentBlock[];
  isError?: boolean;
}

/** Register a connected MCP server's tools into Pi. Returns the public tool names registered. */
export async function registerMcpTools(
  pi: ExtensionAPI,
  serverName: string,
  client: Client,
  seen: Set<string> = new Set(),
): Promise<string[]> {
  const server = sanitizeName(serverName);
  const tools = await listAllTools(client);
  const registered: string[] = [];

  for (const t of tools) {
    const publicName = `mcp__${server}__${sanitizeName(t.name)}`;
    if (seen.has(publicName)) continue; // dedup across servers
    seen.add(publicName);
    const realName = t.name;

    pi.registerTool({
      name: publicName,
      label: `MCP: ${serverName}`,
      description: (t.description ?? `${t.name} (via ${serverName})`).slice(0, 1024),
      parameters: Type.Object({}, { additionalProperties: true }),
      async execute(_id, params) {
        const details: Record<string, unknown> = { server: serverName, tool: realName };
        try {
          const res = (await client.callTool(
            { name: realName, arguments: (params ?? {}) as Record<string, unknown> },
            undefined,
            { timeout: CALL_TIMEOUT_MS },
          )) as McpCallResult;
          const text = (res.content ?? [])
            .filter((c) => c.type === "text" && typeof c.text === "string")
            .map((c) => c.text)
            .join("\n");
          if (res.isError) {
            details.isError = true;
            return { content: [{ type: "text" as const, text: `MCP tool error: ${text || "(no detail)"}` }], details };
          }
          return { content: [{ type: "text" as const, text: text || "(no text content)" }], details };
        } catch (e) {
          details.isError = true;
          return { content: [{ type: "text" as const, text: `MCP call failed: ${e instanceof Error ? e.message : String(e)}` }], details };
        }
      },
    });
    registered.push(publicName);
  }
  return registered;
}
