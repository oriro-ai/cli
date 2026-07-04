// Verify the UX-5 session-wiring path end-to-end: a trusted custom MCP server → prepareConnectors()
// (connect + list) → registerPreparedConnectors() into Pi → tool is registered AND callable (PONG).
// This is the path assemble.ts now uses, distinct from the spike's direct registerMcpTools.
// Run: tsx scripts/test-connectors.ts
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
process.env.ORIRO_STATE_DIR = mkdtempSync(join(tmpdir(), "oriro-conn-test-"));

import { saveCustomServer } from "../src/connectors/custom.js";
import { prepareConnectors, registerPreparedConnectors } from "../src/connectors/session-connect.js";

let fails = 0;
function ok(cond: boolean, label: string): void {
  process.stdout.write(`${cond ? "✅" : "❌"} ${label}\n`);
  if (!cond) fails++;
}

async function main(): Promise<void> {
  // A trusted custom stdio MCP server (the repo's test server that answers ping → PONG).
  saveCustomServer({
    name: "test",
    config: { type: "stdio", command: "npx", args: ["tsx", "src/connectors/_test-mcp-server.ts"] },
    trusted: true,
  });

  const prepared = await prepareConnectors();
  ok(prepared.length === 1 && prepared[0]?.name === "test", "prepareConnectors connected the trusted server");
  ok((prepared[0]?.tools ?? []).some((t) => t.name === "ping"), "listed the server's 'ping' tool");

  let pingTool: { execute: (id: string, p: unknown) => Promise<{ content?: { text?: string }[] }> } | undefined;
  const mockPi = {
    registerTool: (d: unknown) => {
      const def = d as { name: string; execute: typeof pingTool extends undefined ? never : NonNullable<typeof pingTool>["execute"] };
      if (def.name === "mcp__test__ping") pingTool = def as unknown as typeof pingTool;
    },
  } as unknown as Parameters<typeof registerPreparedConnectors>[0];

  registerPreparedConnectors(mockPi, prepared);
  ok(!!pingTool, "registerPreparedConnectors registered mcp__test__ping into Pi");
  const res = pingTool ? await pingTool.execute("c", {}) : undefined;
  const out = res?.content?.[0]?.text ?? "";
  ok(out.includes("PONG"), `tool is callable through the bridge (ping → ${JSON.stringify(out)})`);

  process.stdout.write(fails === 0 ? "\nconnectors: ALL PASS\n" : `\nconnectors: ${fails} FAILED\n`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e: unknown) => {
  process.stderr.write(`\nconnectors: FAIL ❌\n${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`);
  process.exit(1);
});
