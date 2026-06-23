// ORIRO config shim — replaces the OpenClaw `config/CONFIG_DIR`. Pure, zero-footprint.
// All ORIRO local state (router health, scribe journal, settings) lives under ~/.oriro
// (override with ORIRO_STATE_DIR). On-device only — nothing here ever leaves the machine.
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Absolute path to the ORIRO state dir (not guaranteed to exist yet). */
export function oriroDir(): string {
  return process.env.ORIRO_STATE_DIR ?? join(homedir(), ".oriro");
}

/** Ensure the ORIRO state dir exists and return it. */
export function ensureOriroDir(): string {
  const dir = oriroDir();
  mkdirSync(dir, { recursive: true });
  return dir;
}
