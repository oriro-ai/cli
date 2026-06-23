// ORIRO Guardian V3 — the Pi-native binding (replaces the OpenClaw-coupled hook.ts/extension.ts).
// Wires the CLEAN policy engine onto Pi's own `tool_call` gate. Default-ON (config defaults
// enabled=true), fires before EVERY tool call, and fails CLOSED on "ask" when there's no UI.
// Zero OpenClaw footprint — the only host import is Pi's own ExtensionAPI.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { evaluate } from "./policy.js";
import { analyze } from "./analyzer.js";
import { recordAudit, type GuardianAuditEntry } from "./audit.js";
import { readGuardianConfig, resolvePolicy } from "./config.js";
import { normalizeCall } from "./normalize.js";

const blocked = (reason: string, rule: string): string =>
  `🛡 ORIRO Guardian blocked this action — ${reason} [${rule}]`;

/**
 * Register ORIRO Guardian on Pi's native `tool_call` gate. Use as a DefaultResourceLoader
 * extension factory: `new DefaultResourceLoader({ extensionFactories: [registerGuardian] })`.
 */
export function registerGuardian(pi: ExtensionAPI): void {
  pi.on("tool_call", async (event, ctx) => {
    const cfg = readGuardianConfig();
    if (!cfg.enabled) return undefined;

    const call = normalizeCall(event.toolName, (event.input ?? {}) as Record<string, unknown>);
    const verdict = await analyze(call, evaluate(call, resolvePolicy(cfg)));
    const noteworthy = verdict.rule !== "allow" && verdict.rule !== "allowlist";

    const audit = (resolved?: "allowed" | "denied"): void => {
      if (!noteworthy) return;
      const entry: GuardianAuditEntry = {
        ts: new Date().toISOString(),
        decision: verdict.decision,
        severity: verdict.severity,
        rule: verdict.rule,
        reason: verdict.reason,
        toolName: call.toolName,
        kind: call.kind,
        command: call.command,
        mcpServer: call.mcpServer,
        ...(resolved ? { resolved } : {}),
      };
      recordAudit(entry);
    };

    if (verdict.decision === "block") {
      audit("denied");
      return { block: true, reason: blocked(verdict.reason, verdict.rule) };
    }

    if (verdict.decision === "ask") {
      if (!ctx.hasUI) {
        audit("denied");
        return { block: true, reason: `🛡 ORIRO Guardian blocked (no UI to approve) — ${verdict.reason} [${verdict.rule}]` };
      }
      const choice = await ctx.ui.select(
        `🛡 ORIRO Guardian — ${verdict.reason}\nTool: ${call.toolName}${call.command ? `\nCommand: ${call.command}` : ""}\n\nAllow this action?`,
        ["Deny", "Allow once"],
      );
      const allowed = choice === "Allow once";
      audit(allowed ? "allowed" : "denied");
      return allowed ? undefined : { block: true, reason: "Denied by user" };
    }

    audit();
    return undefined;
  });
}
