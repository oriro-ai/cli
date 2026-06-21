// ORIRO CLI — avatar config. The chosen avatar (slug + paired voice) persists to
// ~/.oriro/avatar.json and becomes the terminal's face for every session until changed.
// On-device only (OR-LOCAL-ONLY).

import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { avatarBySlug, type AvatarEntry } from "./manifest.js";

const DIR = join(homedir(), ".oriro");
const FILE = join(DIR, "avatar.json");

export interface AvatarConfig {
  /** Chosen avatar slug. */
  slug: string;
  /** Paired voice id (drives the voice package); may be undefined → default voice. */
  voiceId?: string;
  /** Show the avatar floating in the terminal. */
  show: boolean;
  /** Speak replies aloud when a voice runtime is available. */
  speak: boolean;
}

export function readAvatarConfig(): AvatarConfig | null {
  try {
    return JSON.parse(readFileSync(FILE, "utf8")) as AvatarConfig;
  } catch {
    return null;
  }
}

export function writeAvatarConfig(cfg: AvatarConfig): void {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(cfg, null, 2) + "\n", "utf8");
}

export function isAvatarConfigured(): boolean {
  return readAvatarConfig() !== null;
}

/** The currently selected avatar entry (or null if unset/unknown). */
export function getSelectedAvatar(): AvatarEntry | null {
  const cfg = readAvatarConfig();
  return (cfg && avatarBySlug(cfg.slug)) || null;
}

/** Persist a chosen avatar as the terminal's face. */
export function setSelectedAvatar(avatar: AvatarEntry, opts?: { speak?: boolean }): AvatarConfig {
  const cfg: AvatarConfig = {
    slug: avatar.slug,
    voiceId: avatar.voice_id,
    show: true,
    speak: opts?.speak ?? false,
  };
  writeAvatarConfig(cfg);
  return cfg;
}
