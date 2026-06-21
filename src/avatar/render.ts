// ORIRO CLI — avatar terminal rendering. Floats the chosen avatar using the terminal's
// inline-image protocol when available (kitty / iTerm2), with a compact ASCII name-card
// fallback for plain terminals. A "speaking" pulse shows next to it while audio plays.
//
// Honest: a terminal can't animate lips on an inline image — the visual is a static image
// (or card) plus a speaking indicator; the VOICE is the real, expressive part.

import type { AvatarEntry } from "./manifest.js";

export type ImageProtocol = "kitty" | "iterm2" | "none";

/** Detect the best inline-image protocol the current terminal supports. */
export function detectImageProtocol(env: NodeJS.ProcessEnv = process.env): ImageProtocol {
  if (env.KITTY_WINDOW_ID || (env.TERM ?? "").includes("kitty")) return "kitty";
  const prog = env.TERM_PROGRAM ?? "";
  if (prog === "iTerm.app" || prog === "WezTerm" || env.LC_TERMINAL === "iTerm2") return "iterm2";
  return "none";
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

/** Encode a PNG as an inline-image escape sequence for the given protocol (null if none). */
export function encodeInlineImage(pngBytes: Uint8Array, protocol: ImageProtocol): string | null {
  const b64 = toBase64(pngBytes);
  if (protocol === "iterm2") {
    // iTerm2 inline image: ESC ] 1337 ; File = inline=1 : <base64> BEL
    return `\x1b]1337;File=inline=1;width=12;preserveAspectRatio=1:${b64}\x07`;
  }
  if (protocol === "kitty") {
    // kitty graphics: transmit+display a PNG (f=100) base64 payload in 4096-byte chunks.
    const CHUNK = 4096;
    let out = "";
    for (let i = 0; i < b64.length; i += CHUNK) {
      const piece = b64.slice(i, i + CHUNK);
      const more = i + CHUNK < b64.length ? 1 : 0;
      const ctrl = i === 0 ? `a=T,f=100,m=${more}` : `m=${more}`;
      out += `\x1b_G${ctrl};${piece}\x1b\\`;
    }
    return out;
  }
  return null;
}

const C = { teal: "\x1b[38;2;34;184;166m", purple: "\x1b[38;2;155;93;229m", dim: "\x1b[2m", bold: "\x1b[1m", reset: "\x1b[0m" };

/** Compact ASCII name-card fallback for terminals without inline images. */
export function renderCard(avatar: AvatarEntry, opts?: { speaking?: boolean }): string {
  const name = avatar.slug.replace(/-/g, " ");
  const pulse = opts?.speaking ? `${C.purple}♪ speaking…${C.reset}` : `${C.dim}idle${C.reset}`;
  const w = Math.max(name.length, avatar.category.length, 14) + 2;
  const bar = "─".repeat(w);
  return (
    `  ${C.teal}╭${bar}╮${C.reset}\n` +
    `  ${C.teal}│${C.reset} ${C.bold}🧑‍🎨 ${name}${C.reset}${" ".repeat(Math.max(0, w - name.length - 4))}${C.teal}│${C.reset}\n` +
    `  ${C.teal}│${C.reset} ${C.dim}${avatar.category}${C.reset}${" ".repeat(Math.max(0, w - avatar.category.length - 1))}${C.teal}│${C.reset}\n` +
    `  ${C.teal}│${C.reset} ${pulse}${" ".repeat(Math.max(0, w - (opts?.speaking ? 11 : 4) - 1))}${C.teal}│${C.reset}\n` +
    `  ${C.teal}╰${bar}╯${C.reset}\n`
  );
}

/**
 * Render the avatar the best way the terminal allows: an inline image when supported and
 * the PNG is available, otherwise the ASCII card. Always returns something printable.
 */
export function renderAvatar(
  avatar: AvatarEntry,
  pngBytes?: Uint8Array | null,
  opts?: { speaking?: boolean; env?: NodeJS.ProcessEnv },
): string {
  const protocol = detectImageProtocol(opts?.env);
  if (pngBytes && protocol !== "none") {
    const img = encodeInlineImage(pngBytes, protocol);
    if (img) return img + (opts?.speaking ? `\n  ${C.purple}♪ speaking…${C.reset}\n` : "\n");
  }
  return renderCard(avatar, opts);
}
