// ORIRO UI — the launch banner + a sample onboarding screen, in the ORIRO aesthetic.
// Gradient wordmark + restrained hierarchy + rounded framing. Reused by the onboarding wrapper.
import { gradient, dim, accent, bold, fgHex, box, PALETTE } from "./theme.js";

// "ORIRO" — clean 3-row block wordmark (box-drawing glyphs), painted with the brand gradient.
const WORDMARK = [
  "█▀█ █▀█ █ █▀█ █▀█",
  "█░█ █▀▄ █ █▀▄ █░█",
  "▀▀▀ ▀░▀ ▀ ▀░▀ ▀▀▀",
];

export function banner(): string {
  const mark = WORDMARK.map((row) => "  " + gradient(row)).join("\n");
  const tagline = "  " + dim("free") + dim(" · ") + dim("on-device") + dim(" · ") + dim("keyless") + dim(" · ") + dim("your language");
  return `\n${mark}\n${tagline}\n`;
}

/** A sample onboarding screen (the language step) — to show the screen aesthetic. */
export function sampleLanguageScreen(): string {
  const heading = bold(fgHex(PALETTE.text, "Choose your language")) + "  " + dim("— ORIRO works in 99 languages");
  const opt = (key: string, label: string, on = false): string =>
    (on ? accent("●") : dim("○")) + " " + (on ? fgHex(PALETTE.text, label) : dim(label)) + "  " + dim(key);
  const rows = [
    heading,
    "",
    opt("en", "English", true),
    opt("es", "Español"),
    opt("hi", "हिन्दी"),
    opt("zh", "中文"),
    opt("ar", "العربية"),
    "",
    dim("↑↓ move   ⏎ select   guardian + head install next"),
  ];
  return box(rows, { title: gradient("ORIRO"), pad: 2 }).join("\n");
}
