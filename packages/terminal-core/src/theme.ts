// Terminal Core module implements theme behavior.
import chalk, { Chalk } from "chalk";
import { ORIRO_PALETTE } from "./palette.js";

// Shared terminal color theme that respects NO_COLOR and FORCE_COLOR.

const hasForceColor =
  typeof process.env.FORCE_COLOR === "string" &&
  process.env.FORCE_COLOR.trim().length > 0 &&
  process.env.FORCE_COLOR.trim() !== "0";

const baseChalk = process.env.NO_COLOR && !hasForceColor ? new Chalk({ level: 0 }) : chalk;

const hex = (value: string) => baseChalk.hex(value);

/** Shared terminal theme color functions. */
export const theme = {
  accent: hex(ORIRO_PALETTE.accent),
  accentBright: hex(ORIRO_PALETTE.accentBright),
  accentDim: hex(ORIRO_PALETTE.accentDim),
  info: hex(ORIRO_PALETTE.info),
  success: hex(ORIRO_PALETTE.success),
  warn: hex(ORIRO_PALETTE.warn),
  error: hex(ORIRO_PALETTE.error),
  muted: hex(ORIRO_PALETTE.muted),
  heading: baseChalk.bold.hex(ORIRO_PALETTE.accent),
  command: hex(ORIRO_PALETTE.accentBright),
  option: hex(ORIRO_PALETTE.warn),
} as const;

/** Return true when color styling is active. */
export const isRich = () => baseChalk.level > 0;

/** Conditionally apply a color function based on caller rich-output state. */
export const colorize = (rich: boolean, color: (value: string) => string, value: string) =>
  rich ? color(value) : value;
