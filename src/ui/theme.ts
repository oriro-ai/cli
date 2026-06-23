// ORIRO UI — the design tokens + truecolor primitives every screen uses.
// Pure ANSI (no Pi-Theme dependency) so it renders identically in dev (tsx) and the built CLI.
// "Modern" in a terminal = truecolor + gradient + rounded box-drawing + hierarchy + spacing,
// NOT custom fonts (the font is the user's terminal). Brand palette extracted from ORIRO.

export type RGB = [number, number, number];

// ORIRO brand palette (hex). Gradient = teal → blue → violet → magenta → pink.
export const PALETTE = {
  teal: "#2DD4BF",
  blue: "#3884DE",
  violet: "#8060DE",
  magenta: "#C454C6",
  pink: "#E8609C",
  gold: "#F6C453",
  text: "#E8E3D5",
  dim: "#8A93A6",
  faint: "#5B6472",
  success: "#7DD3A5",
  error: "#F97066",
} as const;

export const BRAND_GRADIENT: string[] = [
  PALETTE.teal,
  PALETTE.blue,
  PALETTE.violet,
  PALETTE.magenta,
  PALETTE.pink,
];

const RESET = "\x1b[0m";

const hexToRgb = (hex: string): RGB => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const lerp = (a: number, b: number, t: number): number => Math.round(a + (b - a) * t);

/** Color at position t∈[0,1] along a multi-stop gradient. */
function gradientAt(stops: string[], t: number): RGB {
  const segs = stops.length - 1;
  const x = Math.max(0, Math.min(t, 1)) * segs;
  const i = Math.min(Math.floor(x), segs - 1);
  const f = x - i;
  const a = hexToRgb(stops[i] as string);
  const b = hexToRgb(stops[i + 1] as string);
  return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
}

export const fg = (rgb: RGB, s: string): string => `\x1b[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m${s}${RESET}`;
export const fgHex = (hex: string, s: string): string => fg(hexToRgb(hex), s);
export const bold = (s: string): string => `\x1b[1m${s}${RESET}`;
export const dim = (s: string): string => fgHex(PALETTE.dim, s);
export const accent = (s: string): string => fgHex(PALETTE.gold, s);

/** Apply a smooth horizontal gradient across the visible characters of `text`. */
export function gradient(text: string, stops: string[] = BRAND_GRADIENT): string {
  const chars = [...text];
  const last = Math.max(chars.length - 1, 1);
  return chars
    .map((ch, i) => (ch === " " ? ch : fg(gradientAt(stops, i / last), ch)))
    .join("");
}

const visLen = (s: string): number => [...s.replace(/\x1b\[[0-9;]*m/g, "")].length;

/** Frame lines in a rounded box with an optional gradient title. */
export function box(lines: string[], opts: { title?: string; pad?: number } = {}): string[] {
  const pad = opts.pad ?? 1;
  const inner = Math.max(...lines.map(visLen), opts.title ? visLen(opts.title) + 4 : 0);
  const w = inner + pad * 2;
  const sp = (n: number): string => " ".repeat(Math.max(0, n));
  const top = opts.title
    ? fgHex(PALETTE.faint, "╭─ ") + opts.title + fgHex(PALETTE.faint, " " + "─".repeat(Math.max(0, w - visLen(opts.title) - 3)) + "╮")
    : fgHex(PALETTE.faint, `╭${"─".repeat(w)}╮`);
  const bottom = fgHex(PALETTE.faint, `╰${"─".repeat(w)}╯`);
  const body = lines.map(
    (ln) => fgHex(PALETTE.faint, "│") + sp(pad) + ln + sp(w - pad - visLen(ln)) + fgHex(PALETTE.faint, "│"),
  );
  return [top, ...body, bottom];
}
