// ORIRO CLI — avatar image cache. PNGs are NOT bundled (~60 MB for 70). Instead the
// chosen avatar's image is lazy-fetched once from ORIRO's public endpoint and cached to
// ~/.oriro/avatars/<slug>.png — like the voice language packs. $0, on-device after first
// fetch, no auth.

import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { avatarImageUrl, type AvatarEntry } from "./manifest.js";

const CACHE_DIR = join(homedir(), ".oriro", "avatars");

export function avatarCachePath(slug: string): string {
  return join(CACHE_DIR, `${slug}.png`);
}

/** True if the avatar's PNG is already cached (non-empty). */
export function isAvatarCached(slug: string): boolean {
  try {
    return statSync(avatarCachePath(slug)).size > 0;
  } catch {
    return false;
  }
}

/** Ensure the avatar PNG is cached locally; fetch once if missing. Returns the file path. */
export async function ensureAvatarImage(avatar: AvatarEntry): Promise<string> {
  const path = avatarCachePath(avatar.slug);
  if (isAvatarCached(avatar.slug)) return path;
  const res = await fetch(avatarImageUrl(avatar));
  if (!res.ok) throw new Error(`avatar image fetch failed (${res.status}) for ${avatar.slug}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(path, bytes);
  return path;
}

/** Read a cached avatar PNG into bytes (throws if not cached). */
export function readCachedAvatar(slug: string): Uint8Array {
  return new Uint8Array(readFileSync(avatarCachePath(slug)));
}

export function avatarCacheDir(): string {
  return CACHE_DIR;
}
