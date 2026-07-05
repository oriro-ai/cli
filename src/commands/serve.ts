// V0.3.8 — `oriro serve <protocol>`: expose ORIRO to OTHER tools.
//   oriro serve acp   → Agent Client Protocol over stdio (Zed, JetBrains, any ACP editor)
//   oriro serve mcp   → MCP server over stdio (Claude Code/Desktop, any MCP client)
// Both keyless; both safe for automation (Guardian gates every tool call, fail-closed headless).
import type { Command } from "commander";
import { die } from "./ui.js";

/** `version` comes from cli.ts — the ONLY place that may resolve package.json (bundle-relative). */
export function registerServeCommand(program: Command, version: string): void {
  program
    .command("serve <protocol>")
    .description("expose ORIRO to other tools: acp (Zed/JetBrains editors) | mcp (any MCP client)")
    .action(async (protocol: string) => {
      const p = protocol.toLowerCase();
      if (p === "acp") {
        const { serveAcp } = await import("../serve/acp.js");
        await serveAcp();
      } else if (p === "mcp") {
        const { serveMcp } = await import("../serve/mcp.js");
        await serveMcp(version);
      } else {
        die(`unknown protocol '${protocol}' — use: acp | mcp`);
      }
    });
}
