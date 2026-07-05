// Unit + protocol test for V0.3.8 `oriro serve acp|mcp` (src/serve/*). tsx.
// - Pure: promptText content-block extraction.
// - REAL protocol handshakes: spawns each stdio server (via tsx, no build needed) and performs the
//   actual initialize round-trip. Handshakes are model-free by design (lazy session assembly), so
//   this needs no network. Run: tsx scripts/test-serve.ts
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { join } from "node:path";
import { promptText } from "../src/serve/common.js";

let fails = 0;
function ok(cond: boolean, label: string): void {
  process.stdout.write(`${cond ? "✅" : "❌"} ${label}\n`);
  if (!cond) fails++;
}

// ── promptText (pure) ──────────────────────────────────────────────────────────────────────────
ok(promptText([{ type: "text", text: "fix the bug" }]) === "fix the bug", "text block extracted");
ok(
  promptText([
    { type: "text", text: "check this file" },
    { type: "resource_link", uri: "file:///a.ts", name: "a.ts" },
  ]) === "check this file\n(see resource: file:///a.ts)",
  "resource_link referenced by uri",
);
ok(
  promptText([{ type: "resource", resource: { uri: "file:///b.ts", text: "const x = 1;" } }]) === "const x = 1;",
  "embedded resource text inlined",
);
ok(promptText([{ type: "image", data: "…" }]) === "", "unsupported blocks ignored, no throw");

// ── protocol handshakes (spawn the real servers over stdio) ────────────────────────────────────
const TSX = join("node_modules", "tsx", "dist", "cli.mjs");

/** Send one JSON-RPC request line, resolve with the first parseable response object. */
function handshake(args: string[], request: object, timeoutMs = 60_000): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const child: ChildProcessWithoutNullStreams = spawn(process.execPath, [TSX, "src/cli.ts", ...args], {
      cwd: process.cwd(),
      env: process.env,
      windowsHide: true,
    });
    let buf = "";
    const timer = setTimeout(() => { child.kill(); reject(new Error(`timeout; stderr: ${err.slice(-400)}`)); }, timeoutMs);
    let err = "";
    child.stderr.on("data", (d: Buffer) => { err += String(d); });
    child.stdout.on("data", (d: Buffer) => {
      buf += String(d);
      for (const line of buf.split("\n")) {
        const t = line.trim();
        if (!t.startsWith("{")) continue;
        try {
          const msg = JSON.parse(t) as Record<string, unknown>;
          if (msg.id !== undefined) {
            clearTimeout(timer);
            child.kill();
            resolve(msg);
            return;
          }
        } catch { /* partial line — keep buffering */ }
      }
    });
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.stdin.write(`${JSON.stringify(request)}\n`);
  });
}

// ACP initialize
try {
  const res = await handshake(["serve", "acp"], {
    jsonrpc: "2.0", id: 1, method: "initialize",
    params: { protocolVersion: 1, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false } } },
  });
  const result = res.result as Record<string, unknown> | undefined;
  ok(result?.protocolVersion === 1, "ACP initialize → protocolVersion 1");
  ok(typeof result?.agentCapabilities === "object", "ACP initialize → agentCapabilities present");
} catch (e) {
  ok(false, `ACP handshake failed: ${e instanceof Error ? e.message : String(e)}`);
}

// MCP initialize
try {
  const res = await handshake(["serve", "mcp"], {
    jsonrpc: "2.0", id: 1, method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "oriro-qa", version: "0.0.0" },
    },
  });
  const result = res.result as { serverInfo?: { name?: string }; capabilities?: { tools?: unknown } } | undefined;
  ok(result?.serverInfo?.name === "oriro", "MCP initialize → serverInfo.name = oriro");
  ok(result?.capabilities?.tools !== undefined, "MCP initialize → advertises tools");
} catch (e) {
  ok(false, `MCP handshake failed: ${e instanceof Error ? e.message : String(e)}`);
}

process.stdout.write(fails === 0 ? "\nserve: ALL PASS\n" : `\nserve: ${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
