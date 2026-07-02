// ORIRO Step 2A — the pure core of `oriro connectors setup`: build an MCP ServerConfig from a
// plain description and run it through Guardian BEFORE it is saved. Kept I/O-free so the Guardian
// wiring is unit-testable. The command layer (commands/connectors.ts) does the prompting.
import type { ServerConfig } from "./mcp-client.js";
import { vetMcpServer } from "../guardian/index.js";
import { isServerTrusted } from "./custom.js";
import type { GuardianDecision } from "../guardian/types.js";

export interface SetupInput {
  name: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

/** Build the ServerConfig the MCP client consumes (stdio when a command is given, else http). */
export function buildServerConfig(i: SetupInput): ServerConfig {
  if (i.url) return { type: "http", url: i.url, ...(i.headers && Object.keys(i.headers).length ? { headers: i.headers } : {}) };
  return {
    type: "stdio",
    command: i.command ?? "",
    ...(i.args && i.args.length ? { args: i.args } : {}),
    ...(i.env && Object.keys(i.env).length ? { env: i.env } : {}),
  };
}

export interface VetOutcome {
  decision: GuardianDecision;
  reason: string;
  /** True when this server was already trusted — Guardian is not re-asked (the doc's "won't re-ask"). */
  alreadyTrusted: boolean;
}

/** Vet a proposed server. A critical block always blocks; an already-trusted server is not re-asked. */
export function vetServer(i: SetupInput): VetOutcome {
  const alreadyTrusted = isServerTrusted(i.name);
  const v = vetMcpServer(i.name, { command: i.command, args: i.args, url: i.url, env: i.env });
  let decision: GuardianDecision = v.decision;
  if (decision === "ask" && alreadyTrusted) decision = "allow"; // remembered trust — never re-ask
  return { decision, reason: v.reason, alreadyTrusted };
}

/** Parse "KEY=VAL,KEY2=VAL2" into a record (for --env / --header). */
export function parsePairs(s?: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (s ?? "").split(",")) {
    const t = part.trim();
    if (!t) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return out;
}
