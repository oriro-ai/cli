// ORIRO command surface — shared output helpers. Reuses the brand theme (truecolor) so the
// `oriro <cmd>` subcommands render in the same modern style as the onboarding screens.
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
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

/**
 * Gate a destructive action (UX-4). `--force` (opts.force) skips the prompt. On a real terminal we
 * ask y/N. In a non-interactive shell WITHOUT --force we refuse (die) rather than silently deleting —
 * the same interactive/scriptable duality cli-microsoft365 uses (prompt, or --force to suppress).
 * Returns true to proceed, false if the user declined at the prompt.
 */
export async function confirmDestructive(what: string, opts: { force?: boolean } = {}): Promise<boolean> {
  if (opts.force) return true;
  if (!stdin.isTTY || !stdout.isTTY) {
    die(`refusing to ${what} without confirmation — re-run with --force in a non-interactive shell`);
  }
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const ans = (await rl.question(`${fgHex(PALETTE.error, "?")} ${what} — this cannot be undone. Proceed? [y/N] `)).trim().toLowerCase();
    return ans === "y" || ans === "yes";
  } finally {
    rl.close();
  }
}
