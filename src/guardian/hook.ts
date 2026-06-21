// ORIRO CLI — Guardian V3 hook. The always-on interceptor body: it normalizes a
// host before_tool_call event into a GuardianCall, runs the policy engine (+ the
// agentic analyzer for flagged calls), writes the audit trail, and returns the
// host's allow / block / requireApproval result. Registered as a built-in hook so it
// fires for EVERY tool — exec, file, and MCP — and cannot be bypassed by a naive user.

import type { PluginHookBeforeToolCallEvent } from "../plugins/hook-types.js";
import type { PluginHookBeforeToolCallResult } from "../plugins/hook-before-tool-call-result.js";
import type { GuardianCall, GuardianCallKind } from "./types.js";
import { evaluate } from "./policy.js";
import { analyze } from "./analyzer.js";
import { recordAudit, type GuardianAuditEntry } from "./audit.js";
import { readGuardianConfig, resolvePolicy } from "./config.js";

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

/** Normalize any tool call (plugin OR extension event) into the engine's GuardianCall. */
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

/** Normalize a host plugin hook event into the engine's GuardianCall. Lenient, never throws. */
export function buildGuardianCall(event: PluginHookBeforeToolCallEvent): GuardianCall {
  return normalizeCall(event.toolName, (event.params ?? {}) as Record<string, unknown>, {
    derivedPaths: event.derivedPaths,
    toolKind: event.toolKind,
  });
}

/** The interceptor. Returns undefined (allow) for clean calls. */
export async function guardianBeforeToolCall(
  event: PluginHookBeforeToolCallEvent,
): Promise<PluginHookBeforeToolCallResult | void> {
  const cfg = readGuardianConfig();
  if (!cfg.enabled) return;

  const call = buildGuardianCall(event);
  const ruleVerdict = evaluate(call, resolvePolicy(cfg));
  const verdict = await analyze(call, ruleVerdict);

  // Skip the audit for plain allows (rule "allow") and operator-allowlisted calls.
  const noteworthy = verdict.rule !== "allow" && verdict.rule !== "allowlist";
  const base: Omit<GuardianAuditEntry, "ts" | "resolved"> = {
    decision: verdict.decision,
    severity: verdict.severity,
    rule: verdict.rule,
    reason: verdict.reason,
    toolName: call.toolName,
    kind: call.kind,
    command: call.command,
    mcpServer: call.mcpServer,
  };

  if (verdict.decision === "block") {
    if (noteworthy) recordAudit({ ts: new Date().toISOString(), ...base, resolved: "denied" });
    return {
      block: true,
      blockReason: `🛡 ORIRO Guardian blocked this action — ${verdict.reason} [${verdict.rule}]`,
    };
  }

  if (verdict.decision === "ask") {
    if (noteworthy) recordAudit({ ts: new Date().toISOString(), ...base });
    return {
      requireApproval: {
        title: `🛡 ORIRO Guardian — ${verdict.rule}`,
        description: `${verdict.reason}\n\nTool: ${call.toolName}${call.command ? `\nCommand: ${call.command}` : ""}`,
        severity: verdict.severity,
        timeoutBehavior: "deny", // fail closed: no answer = don't run it
        allowedDecisions: ["allow-once", "deny"],
        onResolution: (decision) => {
          recordAudit({
            ts: new Date().toISOString(),
            ...base,
            resolved: decision === "allow-once" || decision === "allow-always" ? "allowed" : "denied",
          });
        },
      },
    };
  }

  // allow — but still record passive-mode downgrades (threats we saw but didn't block).
  if (noteworthy) recordAudit({ ts: new Date().toISOString(), ...base });
  return;
}
