// ORIRO Step 2A — the CUSTOM MCP server store. The catalog (connectors.ts) is a curated set
// you add by slug; this is the other half the vision promised: a user describes ANY MCP server
// in plain words (`oriro connectors setup`), Guardian vets it, and — if trusted — it's saved here.
// Trust is REMEMBERED so an already-trusted server is never re-asked. Local-only, on-device.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { oriroDir, ensureOriroDir } from "../config/paths.js";
import type { ServerConfig } from "./mcp-client.js";

export interface CustomMcpServer {
  name: string;
  config: ServerConfig;
  /** True once Guardian allowed it or the user explicitly trusted it on "ask". */
  trusted: boolean;
}

function file(): string {
  return join(oriroDir(), "mcp-custom.json");
}

export function readCustomServers(): CustomMcpServer[] {
  try {
    const v = JSON.parse(readFileSync(file(), "utf8"));
    return Array.isArray(v) ? (v as CustomMcpServer[]) : [];
  } catch {
    return [];
  }
}

/** Upsert a custom server by name (case-insensitive). */
export function saveCustomServer(server: CustomMcpServer): void {
  const rest = readCustomServers().filter((s) => s.name.toLowerCase() !== server.name.toLowerCase());
  writeFileSync(join(ensureOriroDir(), "mcp-custom.json"), JSON.stringify([...rest, server], null, 2), "utf8");
}

export function removeCustomServer(name: string): boolean {
  const before = readCustomServers();
  const after = before.filter((s) => s.name.toLowerCase() !== name.toLowerCase());
  if (after.length === before.length) return false;
  writeFileSync(join(ensureOriroDir(), "mcp-custom.json"), JSON.stringify(after, null, 2), "utf8");
  return true;
}

/** Names of servers the user has already trusted — fed back so Guardian never re-asks them. */
export function trustedServerNames(): string[] {
  return readCustomServers().filter((s) => s.trusted).map((s) => s.name);
}

export function isServerTrusted(name: string): boolean {
  return trustedServerNames().some((n) => n.toLowerCase() === name.toLowerCase());
}
