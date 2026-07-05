// Local download authorization for this machine. `oriro login <code>` stores the setup token minted by
// oriro.app (session-gated /api/setup/trigger) so `oriro models pull` can authorize its download. Stored
// 0600 under ~/.oriro; never transmitted anywhere except back to ORIRO's own weights manifest. The device
// LICENSE for .orx binding is separate and defaults to a fixed local value — the real per-machine lock is
// the install secret (binding.ts), so a free user needs no license server.
import { readFileSync, writeFileSync, rmSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { ensureOriroDir } from "./paths.js";

interface Session {
  setup_token: string;
  saved_at: number;
}

function sessionPath(): string {
  return join(ensureOriroDir(), "session.json");
}

export function saveSession(setupToken: string): void {
  const p = sessionPath();
  writeFileSync(p, JSON.stringify({ setup_token: setupToken, saved_at: Date.now() } satisfies Session), "utf8");
  try { chmodSync(p, 0o600); } catch { /* non-POSIX */ }
}

/** The download setup-token: env override first (CI / installer), then the saved session. */
export function readSetupToken(): string | undefined {
  if (process.env.ORIRO_SETUP_TOKEN) return process.env.ORIRO_SETUP_TOKEN;
  try {
    const s = JSON.parse(readFileSync(sessionPath(), "utf8")) as Session;
    return s.setup_token || undefined;
  } catch {
    return undefined;
  }
}

/** The device license for .orx binding. Free users get a fixed local value; the per-machine lock is the
 *  install secret. ORIRO_LICENSE_KEY overrides (e.g. a future licensed tier). */
export function readLicense(): string {
  return process.env.ORIRO_LICENSE_KEY ?? "oriro-local-v1";
}

export function isLoggedIn(): boolean {
  return !!readSetupToken();
}

export function clearSession(): void {
  try { rmSync(sessionPath(), { force: true }); } catch { /* already gone */ }
}
