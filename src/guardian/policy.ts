// ORIRO CLI — Guardian V3 policy engine. Pure: takes a normalized GuardianCall plus
// the resolved policy and returns a single GuardianVerdict. No I/O, no host types —
// fully unit-testable. The hook layer maps the verdict onto allow/block/approval.

import type { GuardianCall, GuardianMode, GuardianRule, GuardianVerdict } from "./types.js";
import { DEFAULT_RULES } from "./rules.js";

/** Everything the engine needs to judge a call (built from config by config.ts). */
export interface GuardianPolicy {
  mode: GuardianMode;
  /** Tool names or command/path substrings the user always allows (skip all rules). */
  allow: readonly string[];
  /** Tool names or command/path substrings the user always blocks. */
  deny: readonly string[];
  /** MCP servers the user trusts; calls from others are flagged (or blocked in strict). */
  trustedServers: readonly string[];
  /** Rule set (defaults to DEFAULT_RULES). */
  rules?: readonly GuardianRule[];
}

const ALLOW: GuardianVerdict = { decision: "allow", severity: "info", rule: "allow", reason: "No policy match" };
const RANK: Record<GuardianVerdict["decision"], number> = { allow: 0, ask: 1, block: 2 };
const SEV_RANK: Record<GuardianVerdict["severity"], number> = { info: 0, warning: 1, critical: 2 };

/** Surface to match user allow/deny entries against: tool name + command + paths + server. */
function haystack(call: GuardianCall): string {
  return [call.toolName, call.command ?? "", call.mcpServer ?? "", ...(call.paths ?? [])]
    .join(" ")
    .toLowerCase();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Match an allow/deny entry against the haystack on WORD BOUNDARIES, not raw
 * substrings. Substring matching let `allow:['git']` match "digital" and
 * `allow:['rm']` match unrelated tokens — a real Guardian bypass. A token is
 * bounded by anything that is not [a-z0-9_-].
 */
function listMatches(list: readonly string[], hay: string): string | null {
  for (const entry of list) {
    const e = entry.trim().toLowerCase();
    if (!e) continue;
    const re = new RegExp(`(?:^|[^a-z0-9_-])${escapeRegExp(e)}(?:$|[^a-z0-9_-])`);
    if (re.test(hay)) return entry;
  }
  return null;
}

/** Escalate a verdict for strict mode (warnings become blocks; asks harden). */
function escalate(v: GuardianVerdict): GuardianVerdict {
  if (v.decision === "ask") return { ...v, decision: "block", reason: `${v.reason} (strict mode)` };
  return v;
}

/**
 * Evaluate one call. Order: user denylist → rules + MCP-trust → user allowlist → mode.
 * The most severe verdict among rule matches wins. The CRITICAL FLOOR is absolute:
 * a critical-severity threat can never be downgraded by the user allowlist or by
 * passive mode — it always blocks (ORIRO cardinal rule: the Guardian floor must
 * never be bypassed by posture/mode).
 * Mode adjusts only non-critical verdicts:
 *   passive — downgrades non-critical blocks to allow (severity preserved for audit);
 *   active  — enforce as written (the default);
 *   strict  — escalate flags to blocks and block untrusted MCP servers.
 */
export function evaluate(call: GuardianCall, policy: GuardianPolicy): GuardianVerdict {
  const hay = haystack(call);

  // 1) User denylist is absolute.
  const denied = listMatches(policy.deny, hay);
  if (denied) return finalize({ decision: "block", severity: "warning", rule: "denylist", reason: `Matches your denylist: "${denied}"` }, policy.mode);

  // 2) Default + custom rules — keep the most severe verdict. Evaluated BEFORE the
  // allowlist so the allowlist can never short-circuit a critical threat.
  const rules = policy.rules ?? DEFAULT_RULES;
  let worst: GuardianVerdict = ALLOW;
  for (const rule of rules) {
    let v: GuardianVerdict | null = null;
    try {
      v = rule.match(call);
    } catch {
      v = null; // a faulty rule must never break a turn
    }
    if (v && isWorse(v, worst)) worst = v;
  }

  // 3) MCP trust: a call from an unlisted server is at least "ask".
  if (call.kind === "mcp" && call.mcpServer && !policy.trustedServers.some((s) => s.toLowerCase() === call.mcpServer!.toLowerCase())) {
    const mcp: GuardianVerdict = { decision: "ask", severity: "warning", rule: "mcp-untrusted", reason: `Call from untrusted MCP server "${call.mcpServer}"` };
    if (isWorse(mcp, worst)) worst = mcp;
  }

  // 4) User allowlist short-circuits NON-critical rules only. A critical threat is
  // the floor and cannot be allowlisted away.
  if (worst.severity !== "critical") {
    const allowed = listMatches(policy.allow, hay);
    if (allowed) return { decision: "allow", severity: "info", rule: "allowlist", reason: `Matches your allowlist: "${allowed}"` };
  }

  return finalize(worst, policy.mode);
}

function isWorse(a: GuardianVerdict, b: GuardianVerdict): boolean {
  if (RANK[a.decision] !== RANK[b.decision]) return RANK[a.decision] > RANK[b.decision];
  return SEV_RANK[a.severity] > SEV_RANK[b.severity];
}

function finalize(v: GuardianVerdict, mode: GuardianMode): GuardianVerdict {
  if (v.decision === "allow") return v;
  // CRITICAL FLOOR: critical-severity threats block in EVERY mode. Neither passive
  // mode nor strict can move them off "block" — this is the unbypassable floor.
  if (v.severity === "critical") {
    return v.decision === "block" ? v : { ...v, decision: "block", reason: `${v.reason} (critical floor)` };
  }
  if (mode === "passive") return { ...v, decision: "allow", rule: `${v.rule}:passive`, reason: `[passive] ${v.reason}` };
  if (mode === "strict") return escalate(v);
  return v; // active
}
