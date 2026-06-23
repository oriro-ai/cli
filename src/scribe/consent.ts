// ORIRO Scribe — consent gate. The scribe ships dormant: it records and injects
// NOTHING until the user explicitly says Yes. Consent is local, inspectable, and
// reversible (oriro scribe on|off). Default = false (off) when unset — never forced.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { CONFIG_DIR } from "../utils.js";

interface ScribeConsent {
  enabled: boolean;
  consentedAt?: string;
}

// Production: ~/.oriro/scribe.json (sibling of the data dir — a "No" creates no
// data dir). Tests/demos: consent.json inside the ORIRO_SCRIBE_DIR override.
function consentFile(): string {
  const override = process.env.ORIRO_SCRIBE_DIR?.trim();
  return override && override.length > 0
    ? join(override, "consent.json")
    : join(CONFIG_DIR, "scribe.json");
}

/** True only if the user explicitly enabled the scribe. Default off. Never throws. */
export function isScribeEnabled(): boolean {
  try {
    const f = consentFile();
    if (!existsSync(f)) return false;
    const data = JSON.parse(readFileSync(f, "utf8")) as ScribeConsent;
    return data.enabled === true;
  } catch {
    return false;
  }
}

/** Record the user's choice. Returns the stored state. */
export function setScribeConsent(enabled: boolean): ScribeConsent {
  const f = consentFile();
  mkdirSync(dirname(f), { recursive: true });
  const state: ScribeConsent = { enabled, consentedAt: new Date().toISOString() };
  writeFileSync(f, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return state;
}

/** True once the user has been asked (consent file exists), regardless of choice. */
export function hasScribeChoice(): boolean {
  try {
    return existsSync(consentFile());
  } catch {
    return false;
  }
}
