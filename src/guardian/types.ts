// ORIRO CLI — Guardian V3 types. Guardian is the always-on first layer: every tool
// call (MCP, exec, file) is normalized into a GuardianCall and judged by the policy
// engine, which returns a GuardianVerdict. The hook layer maps that verdict onto the
// host's allow / block / requireApproval contract. Pure, host-agnostic — so the whole
// policy engine is unit-testable without the agent runtime.

/** What Guardian decides for a single tool call. */
export type GuardianDecision = "allow" | "ask" | "block";

/** Risk level, aligned with the host approval severities (info|warning|critical). */
export type GuardianSeverity = "info" | "warning" | "critical";

/** Enforcement posture. passive = log only (never blocks); active = enforce; strict = escalate. */
export type GuardianMode = "passive" | "active" | "strict";

/** The family of a tool call, used to route policy. */
export type GuardianCallKind = "exec" | "fs" | "mcp" | "network" | "other";

/** A tool call normalized for policy evaluation (built from the host's hook event). */
export interface GuardianCall {
  /** Host tool name (e.g. "bash", "write_file", an MCP tool name). */
  toolName: string;
  /** Normalized family. */
  kind: GuardianCallKind;
  /** Raw tool params (best-effort; never trusted for control flow without validation). */
  params: Record<string, unknown>;
  /** Extracted shell command line, if this is an exec call. */
  command?: string;
  /** Filesystem paths this call touches (host-derived + extracted). */
  paths?: readonly string[];
  /** MCP server name, if this is an MCP call. */
  mcpServer?: string;
  /** Working directory, if known. */
  cwd?: string;
}

/** The result of evaluating one rule (or the aggregate of all rules). */
export interface GuardianVerdict {
  decision: GuardianDecision;
  severity: GuardianSeverity;
  /** Stable id of the rule that drove the decision (or "allow" / "allowlist" / "denylist"). */
  rule: string;
  /** Human-readable reason, shown in approvals and the audit log. */
  reason: string;
}

/** A policy rule: inspect a call, optionally return a verdict (null = no opinion). */
export interface GuardianRule {
  id: string;
  /** Why this rule exists — surfaced in `oriro guardian rules`. */
  description: string;
  match(call: GuardianCall): GuardianVerdict | null;
}
