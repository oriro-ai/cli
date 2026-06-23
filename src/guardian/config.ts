// ORIRO CLI — Guardian V3 config. Guardian is ON by default and not opt-out at
// install time (a naive user must be protected without having to ask). The user can
// later tune the mode and the allow/deny lists, but "off" is deliberately not a
// first-run choice. Stored at ~/.oriro/guardian.json (OR-LOCAL-ONLY).

import { join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import type { GuardianMode } from "./types.js";
import type { GuardianPolicy } from "./policy.js";
import { oriroDir, ensureOriroDir } from "../config/paths.js";

// Routed through the ORIRO config shim (respects ORIRO_STATE_DIR) — single source of truth.
const FILE = (): string => join(oriroDir(), "guardian.json");

export interface GuardianConfig {
  /** Master switch. Defaults to true; first-run never offers false. */
  enabled: boolean;
  /** passive = log only · active = enforce (default) · strict = escalate. */
  mode: GuardianMode;
  /** Operator allowlist (tool names / command or path substrings). */
  allow: string[];
  /** Operator denylist. */
  deny: string[];
  /** Trusted MCP servers (calls from others are flagged). */
  trustedServers: string[];
  /** Whether Guardian V3 Lite (the agentic model) is wired in (auto-set after download). */
  modelReady: boolean;
}

export const DEFAULT_GUARDIAN_CONFIG: GuardianConfig = {
  enabled: true,
  mode: "active",
  allow: [],
  deny: [],
  trustedServers: [],
  modelReady: false,
};

export function readGuardianConfig(): GuardianConfig {
  try {
    const parsed = JSON.parse(readFileSync(FILE(), "utf8")) as Partial<GuardianConfig>;
    return { ...DEFAULT_GUARDIAN_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_GUARDIAN_CONFIG };
  }
}

export function writeGuardianConfig(cfg: GuardianConfig): void {
  const f = join(ensureOriroDir(), "guardian.json");
  writeFileSync(f, JSON.stringify(cfg, null, 2) + "\n", "utf8");
}

/** True once Guardian's config file exists (i.e. it was activated during onboarding). */
export function isGuardianActivated(): boolean {
  try {
    readFileSync(FILE(), "utf8");
    return true;
  } catch {
    return false;
  }
}

/** Build the pure policy object the engine consumes from the on-disk config. */
export function resolvePolicy(cfg: GuardianConfig = readGuardianConfig()): GuardianPolicy {
  return {
    mode: cfg.mode,
    allow: cfg.allow,
    deny: cfg.deny,
    trustedServers: cfg.trustedServers,
  };
}
