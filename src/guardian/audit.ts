// ORIRO CLI — Guardian V3 audit log. Every non-allow verdict (and every block) is
// appended as one JSON line to ~/.oriro/guardian/audit.jsonl, on-device only. This is
// what makes passive mode useful (it records threats it didn't block) and gives the
// user / Guardian V3 Lite a history to learn from. Append-only, best-effort, never
// throws into the tool path.

import { homedir } from "node:os";
import { join } from "node:path";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import type { GuardianCall, GuardianVerdict } from "./types.js";

const DIR = join(homedir(), ".oriro", "guardian");
const FILE = join(DIR, "audit.jsonl");

export interface GuardianAuditEntry {
  ts: string;
  decision: GuardianVerdict["decision"];
  severity: GuardianVerdict["severity"];
  rule: string;
  reason: string;
  toolName: string;
  kind: GuardianCall["kind"];
  command?: string;
  mcpServer?: string;
  /** Final outcome after any user approval (set when an "ask" is resolved). */
  resolved?: "allowed" | "denied";
}

/** Append one audit entry. `ts` is injected by the caller (no Date.now() inside). */
export function recordAudit(entry: GuardianAuditEntry): void {
  try {
    mkdirSync(DIR, { recursive: true });
    appendFileSync(FILE, JSON.stringify(entry) + "\n", "utf8");
  } catch {
    /* never let auditing break a tool call */
  }
}

/** Read the most recent audit entries (for `oriro guardian log`). */
export function readAudit(limit = 50): GuardianAuditEntry[] {
  try {
    const lines = readFileSync(FILE, "utf8").trim().split("\n").filter(Boolean);
    return lines
      .slice(-limit)
      .map((l) => JSON.parse(l) as GuardianAuditEntry)
      .reverse();
  } catch {
    return [];
  }
}
