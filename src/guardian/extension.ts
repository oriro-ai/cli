// ORIRO CLI — Guardian V3 as a built-in extension (the always-on wiring).
//
// Registered in the embedded-agent runtime's factory list so it fires on EVERY tool
// call and cannot be removed by a plugin or a naive user. It hooks the extension
// `tool_call` event, which supports a hard `block`. Critical, deterministic threats
// (wipes, curl|sh, reverse shells, exfil, miners) are blocked here outright; flagged
// ("ask") calls are audited and — except in strict mode, where they are blocked — left
// to the host's existing approval flow. The richer requireApproval path lives in
// hook.ts (guardianBeforeToolCall) for the plugin-hook surface.

import type {
  ExtensionAPI,
  ToolCallEvent,
  ToolCallEventResult,
  ToolResultEvent,
  ToolResultEventResult,
} from "../agents/sessions/index.js";
import type { TextContent, ImageContent } from "oriro/plugin-sdk/llm";
import { normalizeCall } from "./hook.js";
import { evaluate } from "./policy.js";
import { analyze } from "./analyzer.js";
import { recordAudit } from "./audit.js";
import { readGuardianConfig, resolvePolicy } from "./config.js";
import { scanFileInput, stripHiddenUnicode, recordQuarantine } from "./v3lite.js";

/** Built-in ExtensionFactory: always-on Guardian gate on the tool_call event. */
export default function guardianExtension(api: ExtensionAPI): void {
  api.on("tool_call", async (event: ToolCallEvent): Promise<ToolCallEventResult | void> => {
    const cfg = readGuardianConfig();
    if (!cfg.enabled) return;

    const call = normalizeCall(event.toolName, (event.input ?? {}) as Record<string, unknown>);
    const ruleVerdict = evaluate(call, resolvePolicy(cfg));
    const verdict = await analyze(call, ruleVerdict);

    if (verdict.rule !== "allow" && verdict.rule !== "allowlist") {
      recordAudit({
        ts: new Date().toISOString(),
        decision: verdict.decision,
        severity: verdict.severity,
        rule: verdict.rule,
        reason: verdict.reason,
        toolName: call.toolName,
        kind: call.kind,
        command: call.command,
        mcpServer: call.mcpServer,
        resolved: verdict.decision === "block" ? "denied" : undefined,
      });
    }

    if (verdict.decision === "block") {
      return { block: true, reason: `🛡 ORIRO Guardian: ${verdict.reason} [${verdict.rule}]` };
    }
    // "ask"/"allow" proceed here; the host approval flow handles ask, audit has the record.
    return;
  });

  // Tool RESULTS — the web/MCP-content injection vector. Scan fetched/returned text for
  // prompt injection + IOC payloads and QUARANTINE it (withhold from the model) before it
  // can steer the agent; defang hidden-unicode smuggling. This is V3 Lite's scanFileInput
  // on every tool output. Passive mode logs without altering.
  api.on("tool_result", async (event: ToolResultEvent): Promise<ToolResultEventResult | void> => {
    const cfg = readGuardianConfig();
    if (!cfg.enabled) return;
    const passive = cfg.mode === "passive";
    let threat: string | null = null;
    let changed = false;

    const out = event.content.map((item): TextContent | ImageContent => {
      if ((item as { type?: string }).type !== "text") return item;
      const text = (item as TextContent).text ?? "";
      // Defang hidden-unicode FIRST (also defeats unicode-evasion of injection), then scan.
      const dh = stripHiddenUnicode(text);
      const scan = scanFileInput(dh.text);
      if (!scan.safe) {
        threat = scan.threat ?? "threat";
        if (passive) return item;
        changed = true;
        return {
          type: "text",
          text: `🛡 ORIRO Guardian withheld this tool output (${scan.threat}) to block prompt-injection / data exfiltration.`,
        };
      }
      if (dh.stripped && !passive) {
        changed = true;
        return { ...(item as TextContent), text: dh.text };
      }
      return item;
    });

    if (threat) {
      recordQuarantine(threat, "", new Date().getTime());
      recordAudit({
        ts: new Date().toISOString(),
        decision: passive ? "allow" : "block",
        severity: "critical",
        rule: "v3lite-content",
        reason: `Poisoned tool output: ${threat}`,
        toolName: event.toolName,
        kind: "other",
        resolved: passive ? undefined : "denied",
      });
    }
    if (changed) return { content: out };
    return;
  });
}
