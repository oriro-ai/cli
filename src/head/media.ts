// @oriro/head/media — detect image/video media by extension + magic bytes. Zero deps.
//
// Adapted from MoonshotAI/kimi-code (MIT) — packages/agent-core/src/tools/support/
// file-type.ts (the extension→MIME maps + magic-byte sniffing). Reimplemented for ORIRO
// Head so "drop any screen recording" accepts any container (mp4/mov/webm/mkv/avi/…) and
// sends the CORRECT MIME to the multimodal model. See ATTRIBUTION.md.

export type MediaKind = 'image' | 'video' | 'unknown';
export interface MediaType {
  kind: MediaKind;
  mimeType: string;
}

export const IMAGE_MIME_BY_SUFFIX: Readonly<Record<string, string>> = Object.freeze({
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.bmp': 'image/bmp', '.tif': 'image/tiff', '.tiff': 'image/tiff', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.heic': 'image/heic', '.heif': 'image/heif', '.avif': 'image/avif',
});

export const VIDEO_MIME_BY_SUFFIX: Readonly<Record<string, string>> = Object.freeze({
  '.mp4': 'video/mp4', '.mpg': 'video/mpeg', '.mpeg': 'video/mpeg', '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo', '.mov': 'video/quicktime', '.ogv': 'video/ogg', '.wmv': 'video/x-ms-wmv',
  '.webm': 'video/webm', '.m4v': 'video/x-m4v', '.flv': 'video/x-flv', '.3gp': 'video/3gpp', '.3g2': 'video/3gpp2',
});

function suffixOf(nameOrPath: string): string {
  const base = (nameOrPath || '').split(/[\\/]/).pop() ?? '';
  const i = base.lastIndexOf('.');
  return i < 0 ? '' : base.slice(i).toLowerCase();
}

// Magic-byte sniff for the common screen-recording / image containers (first ~12 bytes).
function sniff(head?: Uint8Array): MediaType | null {
  if (!head || head.length < 12) return null;
  const b = (i: number): number => head[i] ?? -1;
  // WebM / Matroska: 1A 45 DF A3  (Playwright records .webm)
  if (b(0) === 0x1a && b(1) === 0x45 && b(2) === 0xdf && b(3) === 0xa3) return { kind: 'video', mimeType: 'video/webm' };
  // ISO-BMFF (mp4 / mov / m4v): bytes 4..7 spell "ftyp"
  if (b(4) === 0x66 && b(5) === 0x74 && b(6) === 0x79 && b(7) === 0x70) return { kind: 'video', mimeType: 'video/mp4' };
  // PNG
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return { kind: 'image', mimeType: 'image/png' };
  // JPEG
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return { kind: 'image', mimeType: 'image/jpeg' };
  // GIF
  if (b(0) === 0x47 && b(1) === 0x49 && b(2) === 0x46) return { kind: 'image', mimeType: 'image/gif' };
  return null;
}

/**
 * Detect a media file's kind + MIME. Magic bytes win (pass the first ~12 bytes when you
 * have them); otherwise fall back to the file extension. Returns kind:'unknown' for
 * non-media so the caller can reject a bad drop cleanly.
 */
export function detectMediaType(nameOrPath: string, head?: Uint8Array): MediaType {
  const sniffed = sniff(head);
  if (sniffed) return sniffed;
  const suf = suffixOf(nameOrPath);
  const v = VIDEO_MIME_BY_SUFFIX[suf];
  if (v) return { kind: 'video', mimeType: v };
  const img = IMAGE_MIME_BY_SUFFIX[suf];
  if (img) return { kind: 'image', mimeType: img };
  return { kind: 'unknown', mimeType: 'application/octet-stream' };
}

export function isVideo(nameOrPath: string, head?: Uint8Array): boolean {
  return detectMediaType(nameOrPath, head).kind === 'video';
}
