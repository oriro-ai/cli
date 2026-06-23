// ORIRO channels — config. Stores WHICH channels the user enabled and THEIR OWN bot credentials.
// The credentials are the USER's (their bot, their token) — never ORIRO's. Local-only at
// ~/.oriro/channels.json. (Plaintext for v1; OS-keychain storage is a flagged hardening follow-up.)
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { oriroDir, ensureOriroDir } from "../config/paths.js";

export type ChannelKind = "telegram" | "discord" | "whatsapp";

export interface ChannelConfig {
  kind: ChannelKind;
  /** The USER's own bot token / credential. */
  token: string;
  enabled: boolean;
}

function file(): string {
  return join(oriroDir(), "channels.json");
}

export function readChannels(): ChannelConfig[] {
  try {
    const v = JSON.parse(readFileSync(file(), "utf8"));
    return Array.isArray(v) ? (v as ChannelConfig[]) : [];
  } catch {
    return [];
  }
}

export function saveChannel(cfg: ChannelConfig): void {
  const all = readChannels().filter((c) => c.kind !== cfg.kind);
  all.push(cfg);
  writeFileSync(join(ensureOriroDir(), "channels.json"), JSON.stringify(all, null, 2), "utf8");
}

export function getChannel(kind: ChannelKind): ChannelConfig | undefined {
  return readChannels().find((c) => c.kind === kind);
}

export function removeChannel(kind: ChannelKind): void {
  writeFileSync(join(ensureOriroDir(), "channels.json"), JSON.stringify(readChannels().filter((c) => c.kind !== kind), null, 2), "utf8");
}
