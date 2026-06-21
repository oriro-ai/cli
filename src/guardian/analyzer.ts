// ORIRO CLI — Guardian V3 agentic-analysis seam (the "live" layer).
//
// The deterministic rules are the fast path. For calls the rules flag as ambiguous
// (an "ask", e.g. an untrusted MCP payload, a novel command), Guardian can escalate
// to an AGENTIC analyzer for a deeper read: is this MCP response carrying a prompt
// injection? Is this command a novel exfiltration the patterns missed?
//
// The analyzer is pluggable (registerGuardianAnalyzer), exactly like the translator.
// Two implementations slot in here with NO change to the gate:
//   • a BYOK analyzer — reuses the user's own session model ($0 extra, ships today);
//   • Guardian V3 Lite — Vinay's TranzGuard threat model, auto-downloaded at onboarding.
// Until one is registered the gate runs rules-only (still fully protective).

import type { GuardianCall, GuardianVerdict } from "./types.js";

/** An agentic threat analyzer: deepen (or downgrade) a rules verdict for one call. */
export interface GuardianAnalyzer {
  /** Inspect the call + the rules verdict; return a refined verdict (or the same one). */
  analyze(call: GuardianCall, ruleVerdict: GuardianVerdict): Promise<GuardianVerdict>;
  /** True once the analyzer's backend (model) is ready. */
  ready(): boolean;
  /** Short id for the audit log ("byok", "guardian-v3-lite"). */
  id: string;
}

let active: GuardianAnalyzer | null = null;

export function registerGuardianAnalyzer(a: GuardianAnalyzer): void {
  active = a;
}

export function hasAnalyzer(): boolean {
  return active != null && active.ready();
}

export function activeAnalyzerId(): string | null {
  return active && active.ready() ? active.id : null;
}

/**
 * Run the agentic analyzer if one is ready AND the rules already flagged this call
 * (we never spend a model call on a clean "allow", and never downgrade a hard "block"
 * below "ask" — the model can confirm/raise, not silently clear a critical block).
 */
export async function analyze(call: GuardianCall, ruleVerdict: GuardianVerdict): Promise<GuardianVerdict> {
  if (!active || !active.ready() || ruleVerdict.decision === "allow") return ruleVerdict;
  try {
    const refined = await active.analyze(call, ruleVerdict);
    if (ruleVerdict.decision === "block" && refined.decision !== "block") {
      // Model may explain a block but cannot clear a critical one to "allow".
      return refined.decision === "allow" ? { ...ruleVerdict, reason: `${ruleVerdict.reason} · ${refined.reason}` } : refined;
    }
    return refined;
  } catch {
    return ruleVerdict; // model failure never weakens the deterministic verdict
  }
}
