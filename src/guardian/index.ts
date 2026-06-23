// ORIRO CLI — Guardian V3 (the always-on first layer).
//
// Guardian is ORIRO's security gate, built on a fast-gate + deep-explain design:
//   • the deterministic GATE (rules.ts + policy.ts) judges every tool call in <1ms,
//     $0, with no model — it ships and protects the instant the CLI is installed;
//   • the agentic ANALYZER (analyzer.ts) deepens flagged calls using a model — either
//     the user's own BYOK session model, or Guardian V3 Lite (the bundled local threat
//     model, auto-downloaded at onboarding).
//
// It is activated automatically right after the language step (activate.ts) — no
// prompt, no opt-out — and registered as a built-in before_tool_call hook so it fires
// for EVERY exec / file / MCP call and cannot be bypassed.
//
// THREATS COVERED by the default gate: destructive wipes, fork bombs, pull-and-run
// remote code (curl|sh), reverse shells, secret/credential exfiltration, Trojan
// persistence (cron/rc/startup/service), security tampering, crypto-miners, untrusted
// MCP servers, and writes to SSH keys / credential stores / system dirs.

export type {
  GuardianCall,
  GuardianVerdict,
  GuardianDecision,
  GuardianSeverity,
  GuardianMode,
  GuardianCallKind,
  GuardianRule,
} from "./types.js";

export { evaluate, type GuardianPolicy } from "./policy.js";
export { DEFAULT_RULES } from "./rules.js";

export {
  type GuardianConfig,
  DEFAULT_GUARDIAN_CONFIG,
  readGuardianConfig,
  writeGuardianConfig,
  isGuardianActivated,
  resolvePolicy,
} from "./config.js";

export { recordAudit, readAudit, type GuardianAuditEntry } from "./audit.js";

export {
  type GuardianAnalyzer,
  registerGuardianAnalyzer,
  hasAnalyzer,
  activeAnalyzerId,
} from "./analyzer.js";

export {
  type GuardianModelClient,
  createByokAnalyzer,
  registerByokAnalyzer,
  parseModelVerdict,
} from "./byok-analyzer.js";

// Pi-native binding (replaces the OpenClaw-coupled hook.ts/extension.ts — neither folded).
export { registerGuardian } from "./pi-gate.js";
export { normalizeCall, buildGuardianCall } from "./normalize.js";

export { vetMcpServer } from "./mcp.js";

export { activateGuardian, registerGuardianModelFetcher } from "./activate.js";

// Guardian V3 Lite (vendored deterministic scanners) — used by the gate rule and the
// CLI's input/output screening seams.
export {
  type ScanResult,
  type ScoreResult,
  type GuardOutcome,
  type GuardianResult,
  scanFileInput,
  scanToolCall,
  scanMCPCall,
  scoreInteractionPair,
  guardPrompt,
  stripPII,
  guardianStrip,
  guardMessages,
  stripHiddenUnicode,
  INJECTION_PATTERNS,
  IOC_PATTERNS,
  recordQuarantine,
  getQuarantineLog,
  clearQuarantineLog,
} from "./v3lite.js";
