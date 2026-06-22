// Gateway legacy environment warning.
// Emits a one-shot notice for ignored pre-Oriro environment prefixes.
import { isVitestRuntimeEnv } from "../infra/env.js";

// Legacy env warnings are process-wide and intentionally one-shot so normal
// gateway startup is noisy enough to notice but not spammed by repeated imports.
const LEGACY_ENV_PREFIXES = ["CLAWDBOT_", "ORIRO_"] as const;
type LegacyEnvPrefix = (typeof LEGACY_ENV_PREFIXES)[number];

let warned = false;

/** Emits a one-time warning when ignored legacy CLAWDBOT_/ORIRO_ env vars are present. */
export function warnLegacyOriroEnvVars(env: NodeJS.ProcessEnv = process.env): void {
  if (warned || isVitestRuntimeEnv(env)) {
    return;
  }

  const prefixCounts = new Map<LegacyEnvPrefix, number>();
  for (const key of Object.keys(env)) {
    // Count by prefix only; never print env names or values because some legacy
    // names may still encode account/provider secrets.
    const prefix = LEGACY_ENV_PREFIXES.find((candidate) => key.startsWith(candidate));
    if (prefix) {
      prefixCounts.set(prefix, (prefixCounts.get(prefix) ?? 0) + 1);
    }
  }

  const legacyVarCount = [...prefixCounts.values()].reduce((total, count) => total + count, 0);
  if (legacyVarCount === 0) {
    return;
  }

  process.emitWarning(
    [
      `Legacy environment variables were detected (${legacyVarCount} total), but Oriro only reads ORIRO_* names now.`,
      "Rename them by replacing the legacy prefix with ORIRO_; the old names are ignored.",
    ].join("\n"),
    { code: "ORIRO_LEGACY_ENV_VARS", type: "DeprecationWarning" },
  );
  warned = true;
}

/** Resets the one-shot legacy env warning latch for tests. */
export function resetLegacyOriroEnvWarningForTest(): void {
  warned = false;
}
