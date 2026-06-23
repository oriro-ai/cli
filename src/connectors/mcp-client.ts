// ORIRO Step 7 — MCP client core, on the OFFICIAL @modelcontextprotocol/sdk (no hand-rolled
// protocol). stdio + streamable-HTTP only (SSE dropped, per spec + goose). Hardened with the
// fixes the bridge audits surfaced: SSRF URL allow-listing, stdio env denylist, name
// sanitization, child-stderr capture on init failure, handshake + per-call timeouts, pagination.
// Zero OpenClaw footprint. References (patterns only): openharness (MIT), goose (Apache).
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export type ServerConfig =
  | { type: "stdio"; command: string; args?: string[]; env?: Record<string, string> }
  | { type: "http"; url: string; headers?: Record<string, string> };

// goose's DISALLOWED_KEYS (abridged to the load-bearing linker/interpreter vars): a server
// config must never override these on the spawned child — they hijack process execution.
const DISALLOWED_ENV = new Set([
  "PATH", "LD_PRELOAD", "LD_LIBRARY_PATH", "DYLD_INSERT_LIBRARIES", "DYLD_LIBRARY_PATH",
  "NODE_OPTIONS", "PYTHONPATH", "PYTHONSTARTUP", "PERL5LIB", "RUBYOPT", "GEM_PATH",
  "APPINIT_DLLS", "COR_PROFILER", "BASH_ENV", "ENV", "IFS",
]);

const HANDSHAKE_TIMEOUT_MS = 8_000;
const CALL_TIMEOUT_MS = 30_000;

/** Sanitize a server/tool name to a safe, deterministic id. */
export function sanitizeName(name: string): string {
  return (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64) || "x";
}

/** SSRF guard: reject private / link-local / loopback / metadata targets unless explicitly opted in. */
export function assertSafeUrl(raw: string, allowLocal = false): URL {
  const u = new URL(raw);
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error(`unsupported scheme: ${u.protocol}`);
  const host = u.hostname.toLowerCase();
  const isLoopback = host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".localhost");
  const isPrivate =
    /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host) || /^fe80:/i.test(host) || /^f[cd][0-9a-f]{2}:/i.test(host) ||
    host === "169.254.169.254" || host === "metadata.google.internal";
  if ((isLoopback || isPrivate) && !allowLocal) {
    throw new Error(`blocked SSRF target ${host} (use --allow-local for loopback/LAN MCP servers)`);
  }
  if (u.protocol === "http:" && !isLoopback && !allowLocal) throw new Error(`refusing plaintext http to ${host} — use https`);
  return u;
}

function safeEnv(env?: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(env ?? {})) {
    if (DISALLOWED_ENV.has(k.toUpperCase())) continue; // never let a config override linker/interpreter vars
    out[k] = v;
  }
  return out;
}

export interface ConnectedServer {
  name: string;
  client: Client;
  dispose: () => Promise<void>;
}

/** Connect to an MCP server. Captures child stderr (stdio) so init failures are diagnosable. */
export async function connectServer(
  name: string,
  config: ServerConfig,
  opts: { allowLocal?: boolean; timeoutMs?: number } = {},
): Promise<ConnectedServer> {
  const client = new Client({ name: "oriro-cli", version: "0.1.0" }, { capabilities: {} });
  let transport: StdioClientTransport | StreamableHTTPClientTransport;
  let stderr = "";

  if (config.type === "stdio") {
    const t = new StdioClientTransport({
      command: config.command,
      args: config.args ?? [],
      env: safeEnv(config.env),
      stderr: "pipe",
    });
    t.stderr?.on("data", (b: Buffer) => { stderr += b.toString(); });
    transport = t;
  } else {
    const url = assertSafeUrl(config.url, opts.allowLocal);
    transport = new StreamableHTTPClientTransport(url, {
      requestInit: { headers: { "User-Agent": "oriro-cli/0.1.0", ...(config.headers ?? {}) } },
    });
  }

  const timeoutMs = opts.timeoutMs ?? HANDSHAKE_TIMEOUT_MS;
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      client.connect(transport),
      new Promise<never>((_, rej) => { timer = setTimeout(() => rej(new Error("handshake timed out")), timeoutMs); }),
    ]);
  } catch (e) {
    const detail = stderr.trim() ? `\nserver stderr:\n${stderr.trim().slice(0, 800)}` : "";
    try { await transport.close(); } catch { /* ignore */ }
    throw new Error(`MCP connect failed (${name}): ${e instanceof Error ? e.message : String(e)}${detail}`);
  } finally {
    if (timer) clearTimeout(timer);
  }

  return {
    name,
    client,
    dispose: async () => { try { await client.close(); } catch { /* ignore */ } },
  };
}

/** List ALL tools, honoring next_cursor pagination (the SDK does not auto-paginate). */
export async function listAllTools(client: Client): Promise<Array<{ name: string; description?: string; inputSchema?: unknown }>> {
  const tools: Array<{ name: string; description?: string; inputSchema?: unknown }> = [];
  let cursor: string | undefined;
  do {
    const res = await client.listTools(cursor ? { cursor } : undefined, { timeout: CALL_TIMEOUT_MS });
    for (const t of res.tools) tools.push({ name: t.name, description: t.description, inputSchema: t.inputSchema });
    cursor = res.nextCursor;
  } while (cursor);
  return tools;
}

export { CALL_TIMEOUT_MS };
