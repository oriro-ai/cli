// ORIRO command surface — shared output helpers. Reuses the brand theme (truecolor) so the
// `oriro <cmd>` subcommands render in the same modern style as the onboarding screens.
import { bold, dim, accent, fgHex, box, PALETTE } from "../ui/theme.js";

export const ok = (s: string): void => {
  process.stdout.write(`${fgHex(PALETTE.success, "✓")} ${s}\n`);
};
export const fail = (s: string): void => {
  process.stderr.write(`${fgHex(PALETTE.error, "✗")} ${s}\n`);
};
export const info = (s: string): void => {
  process.stdout.write(`${dim("·")} ${s}\n`);
};
export const heading = (s: string): void => {
  process.stdout.write(`\n${bold(accent(s))}\n`);
};
export const printBox = (lines: string[], title?: string): void => {
  process.stdout.write(`${box(lines, title ? { title } : {}).join("\n")}\n`);
};

/** Print an error and exit non-zero — the standard failure path for a command. */
export function die(msg: string): never {
  fail(msg);
  process.exit(1);
}
