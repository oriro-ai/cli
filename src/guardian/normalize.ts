// ORIRO Guardian — pure tool-call normalizers. Extracted from the OpenClaw-coupled hook.ts
// (which is NOT folded); these functions are host-agnostic (depend only on ./types), so the
// Pi binding (pi-gate.ts) reuses them with zero OpenClaw footprint.
import type { GuardianCall, GuardianCallKind } from "./types.js";

const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

function classify(toolName: string, toolKind: string | undefined): GuardianCallKind {
  const n = (toolName || "").toLowerCase();
  if (toolKind === "mcp" || n.includes("mcp")) return "mcp";
  if (/(bash|exec|shell|command|terminal|powershell|\bsh\b|\brun\b)/.test(n)) return "exec";
  if (/(write|read|edit|patch|file|fs|delete|remove|move|copy)/.test(n)) return "fs";
  if (/(fetch|http|curl|web|download|request|browse)/.test(n)) return "network";
  return "other";
}

function extractCommand(params: Record<string, unknown>): string | undefined {
  return (
    str(params.command) ?? str(params.cmd) ?? str(params.script) ?? str(params.shell) ?? str(params.code) ?? str(params.input)
  );
}

function extractPaths(params: Record<string, unknown>, derived?: readonly string[]): string[] {
  const out = derived ? [...derived] : [];
  for (const k of ["path", "file_path", "filePath", "file", "target", "dest", "destination"]) {
    const v = str(params[k]);
    if (v) out.push(v);
  }
  return out;
}

/** Normalize any tool call into the engine's GuardianCall. */
export function normalizeCall(
  toolName: string,
  params: Record<string, unknown>,
  opts?: { derivedPaths?: readonly string[]; toolKind?: string },
): GuardianCall {
  const kind = classify(toolName, opts?.toolKind);
  return {
    toolName,
    kind,
    params,
    command: extractCommand(params),
    paths: extractPaths(params, opts?.derivedPaths),
    mcpServer: kind === "mcp" ? (str(params.server) ?? str(params.serverName) ?? str(params._server)) : undefined,
    cwd: str(params.cwd) ?? str(params.workdir),
  };
}

/** Convenience: normalize a generic host event ({ toolName, input/params }). Lenient, never throws. */
export function buildGuardianCall(event: {
  toolName: string;
  input?: unknown;
  params?: unknown;
  derivedPaths?: readonly string[];
  toolKind?: string;
}): GuardianCall {
  const params = (event.input ?? event.params ?? {}) as Record<string, unknown>;
  return normalizeCall(event.toolName, params, { derivedPaths: event.derivedPaths, toolKind: event.toolKind });
}
