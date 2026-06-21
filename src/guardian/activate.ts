// ORIRO CLI — Guardian V3 activation. Called automatically right after the user picks
// their language at onboarding. There is NO prompt and NO opt-out: protection must be
// the default for a user who may not even know what Guardian is. This writes the
// default-on config (if absent) and kicks off the Guardian V3 Lite model fetch in the
// background — the deterministic gate is already protecting from this instant; the
// agentic model enriches it the moment its weights land.

import {
  DEFAULT_GUARDIAN_CONFIG,
  isGuardianActivated,
  readGuardianConfig,
  writeGuardianConfig,
} from "./config.js";

/**
 * Hook for the on-device Guardian V3 Lite model fetch. The model port replaces this
 * (auto-download → registerGuardianAnalyzer → set modelReady). Default is a no-op so
 * the gate ships and runs rules-only until the model is wired. Never blocks onboarding.
 */
let modelFetcher: (() => Promise<void>) | null = null;
export function registerGuardianModelFetcher(fn: () => Promise<void>): void {
  modelFetcher = fn;
}

/**
 * Activate Guardian for this install. Idempotent: if already activated, leaves the
 * user's tuned config untouched and only re-kicks the model fetch if needed.
 * Returns the one-line status to show under the language confirmation.
 */
export async function activateGuardian(): Promise<string> {
  if (!isGuardianActivated()) {
    writeGuardianConfig({ ...DEFAULT_GUARDIAN_CONFIG });
  }
  const cfg = readGuardianConfig();

  // Background, non-blocking: fetch + wire Guardian V3 Lite. Failure is silent — the
  // deterministic gate is already live, so a missing model never leaves the user exposed.
  if (!cfg.modelReady && modelFetcher) {
    void (async () => {
      try {
        await modelFetcher!();
        writeGuardianConfig({ ...readGuardianConfig(), modelReady: true });
      } catch {
        /* gate stays rules-only; retried next launch */
      }
    })();
  }

  return "🛡 ORIRO Guardian V3 is now protecting this terminal (always on).";
}
