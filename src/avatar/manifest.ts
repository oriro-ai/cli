// ORIRO CLI — avatar manifest (Step 1A). The 70 ORIRO-owned faces, bundled as a tiny
// JSON manifest (slug + category + image path); the PNGs themselves are lazy-fetched and
// cached on selection (no ~60 MB bundle). voice_id is optional — absent from the public
// list, so an avatar speaks in a default voice until its D1 voice_id is supplied.
// ORIRO-owned, $0, on-device.

import raw from "./avatars.json" with { type: "json" };

export interface AvatarEntry {
  id: string;
  slug: string;
  category: string;
  /** Worker path for the PNG, e.g. "/api/avatars/img/gen-z-01". */
  image_url: string;
  /** Paired voice (from D1 default_avatars); optional in the public manifest. */
  voice_id?: string;
}

interface RawManifest {
  avatars: AvatarEntry[];
  categories?: string[];
}

const MANIFEST = raw as RawManifest;
export const AVATARS: AvatarEntry[] = MANIFEST.avatars ?? [];

/** Public origin the images are fetched from (ORIRO-owned, no auth). */
export const AVATAR_ORIGIN = "https://oriro.ai";

/** Distinct categories, in a friendly order. */
export function avatarCategories(): string[] {
  const seen = new Set<string>();
  for (const a of AVATARS) seen.add(a.category);
  return [...seen];
}

export function avatarsInCategory(category: string): AvatarEntry[] {
  const c = category.toLowerCase();
  return AVATARS.filter((a) => a.category.toLowerCase() === c);
}

export function avatarBySlug(slug: string): AvatarEntry | undefined {
  const s = (slug || "").toLowerCase();
  return AVATARS.find((a) => a.slug.toLowerCase() === s);
}

/** Absolute PNG URL for an avatar. */
export function avatarImageUrl(a: AvatarEntry): string {
  return a.image_url.startsWith("http") ? a.image_url : `${AVATAR_ORIGIN}${a.image_url}`;
}

export const AVATAR_COUNT = AVATARS.length;
