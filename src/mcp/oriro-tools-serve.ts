/**
 * Standalone MCP server for selected built-in Oriro tools.
 *
 * Run via: node --import tsx src/mcp/oriro-tools-serve.ts
 * Or: bun src/mcp/oriro-tools-serve.ts
 */
import { pathToFileURL } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { AnyAgentTool } from "../agents/tools/common.js";
import { createCronTool } from "../agents/tools/cron-tool.js";
import { formatErrorMessage } from "../infra/errors.js";
import { connectToolsMcpServerToStdio, createToolsMcpServer } from "./tools-stdio-server.js";

export function resolveOriroToolsForMcp(): AnyAgentTool[] {
  return [createCronTool({ creatorToolAllowlist: [{ name: "cron" }] })];
}

function createOriroToolsMcpServer(
  params: {
    tools?: AnyAgentTool[];
  } = {},
): Server {
  const tools = params.tools ?? resolveOriroToolsForMcp();
  return createToolsMcpServer({ name: "oriro-tools", tools });
}

async function serveOriroToolsMcp(): Promise<void> {
  const server = createOriroToolsMcpServer();
  await connectToolsMcpServerToStdio(server);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  serveOriroToolsMcp().catch((err: unknown) => {
    process.stderr.write(`oriro-tools-serve: ${formatErrorMessage(err)}\n`);
    process.exit(1);
  });
}
