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

/** A command failure that should set exit code 1 without an abrupt `process.exit()`. The
 *  message is already printed by `die()`; the top-level handler just sets the exit code. */
export class DieError extends Error {}

/** Print an error and fail the command with exit code 1. Throws instead of calling
 *  `process.exit()` so pending async handles (e.g. a live validate's HTTP socket) drain
 *  cleanly — an abrupt exit mid-request triggers a libuv assertion crash (exit 127). */
export function die(msg: string): never {
  fail(msg);
  process.exitCode = 1;
  throw new DieError(msg);
}
