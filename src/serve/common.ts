// ORIRO serve — shared plumbing for the stdio protocol servers (V0.3.8 `oriro serve acp|mcp`).
// Both protocols speak newline-delimited JSON on STDOUT, so any stray console.log from a fail-soft
// module (connectors, voice, …) would corrupt the wire. Route console text output to STDERR before
// the server starts — protocol writes go through their own transports and are unaffected.

/** Redirect console.log/info/warn to stderr — MUST run before any protocol bytes hit stdout. */
export function protectStdio(): void {
  const toStderr = (...a: unknown[]): void => {
    process.stderr.write(`${a.map((v) => (typeof v === "string" ? v : JSON.stringify(v))).join(" ")}\n`);
  };
  console.log = toStderr as typeof console.log;
  console.info = toStderr as typeof console.info;
  console.warn = toStderr as typeof console.warn;
}

/** Exit cleanly when the host editor/agent closes our stdin (the standard stdio-server lifecycle). */
export function exitOnStdinClose(): void {
  process.stdin.on("end", () => process.exit(0));
  process.stdin.on("close", () => process.exit(0));
}

/**
 * Extract the plain-text task from ACP prompt content blocks. Baseline blocks per spec: `text`
 * (used verbatim) and `resource_link` (referenced by uri so the agent can read it with its tools).
 * Pure (unit-tested).
 */
export function promptText(blocks: Array<Record<string, unknown>>): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.type === "text" && typeof b.text === "string") parts.push(b.text);
    else if (b.type === "resource_link" && typeof b.uri === "string") parts.push(`(see resource: ${b.uri})`);
    else if (b.type === "resource" && typeof (b.resource as Record<string, unknown> | undefined)?.text === "string") {
      parts.push(String((b.resource as Record<string, unknown>).text));
    }
  }
  return parts.join("\n").trim();
}
