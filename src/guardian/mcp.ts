// ORIRO CLI — Guardian companion for MCP setup (Step 2A).
//
// Every MCP server a user adds is run through the gate before it's saved: the
// server's launch command / args / URL are scanned by the same rules + V3 Lite IOC
// catalog as any tool call, and an unlisted server is always at least "ask" (a new
// MCP server is untrusted until the user trusts it). This is what makes the
// conversational `oriro mcp setup` safe — you describe a server in plain words and
// Guardian vets it, instead of you hand-editing JSON and hoping it's benign.

import type { GuardianVerdict } from "./types.js";
import { evaluate } from "./policy.js";
import { readGuardianConfig, resolvePolicy } from "./config.js";

/** Vet a proposed MCP server config. Returns the gate's verdict (allow / ask / block). */
export function vetMcpServer(name: string, server: Record<string, unknown>): GuardianVerdict {
  const command = typeof server.command === "string" ? server.command : "";
  const args = Array.isArray(server.args) ? server.args.map(String).join(" ") : "";
  const url = typeof server.url === "string" ? server.url : "";
  const env =
    server.env && typeof server.env === "object"
      ? Object.entries(server.env as Record<string, unknown>)
          .map(([k, v]) => `${k}=${String(v)}`)
          .join(" ")
      : "";
  const blob = [command, args, url, env].filter(Boolean).join(" ");

  return evaluate(
    {
      toolName: name,
      kind: "mcp",
      params: server,
      command: blob || undefined,
      mcpServer: name,
    },
    resolvePolicy(readGuardianConfig()),
  );
}
