// UX-2 (2026-07-04): self-teaching errors. Every failure prints the fix — the relevant command's help
// and a "did you mean" suggestion — instead of a dead-end message. Modelled on cli-microsoft365's
// showHelpOnFailure (default on there) + commander's built-in showSuggestionAfterError.
import type { Command } from "commander";

/** Levenshtein distance (small, for typo suggestions only). */
function lev(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min((curr[j - 1] ?? 0) + 1, (prev[j] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n] ?? n;
}

/** The closest candidate to `input` within an edit-distance threshold, else undefined. */
export function didYouMean(input: string, candidates: string[]): string | undefined {
  let best: string | undefined;
  let bestD = Infinity;
  for (const c of candidates) {
    const d = lev(input.toLowerCase(), c.toLowerCase());
    if (d < bestD) { bestD = d; best = c; }
  }
  // Only suggest when it's genuinely close (≤ ~40% of the word, min 2) — avoid nonsense suggestions.
  return best !== undefined && bestD <= Math.max(2, Math.floor(input.length * 0.4)) ? best : undefined;
}

/** The full invocation path of a command, e.g. `oriro agents make` (walks the parent chain). */
function fullPath(cmd: Command): string {
  const parts: string[] = [];
  let c: Command | null = cmd;
  while (c && c.name() !== "oriro") { parts.unshift(c.name()); c = c.parent; }
  return parts.length ? `oriro ${parts.join(" ")}` : "oriro <command>";
}

/** Turn on "print help + suggest after an error" for the program AND every (nested) subcommand. */
export function enableHelpOnError(program: Command): void {
  const apply = (cmd: Command): void => {
    // Full path (not just cmd.name()) so a nested error points at the REAL command — QA D3:
    // `oriro agents make --help`, not the dead-end `oriro make --help`.
    cmd.showHelpAfterError(`\n(run: ${fullPath(cmd)} --help for usage)`);
    cmd.showSuggestionAfterError(true); // commander's built-in did-you-mean for options/subcommands
    for (const sub of cmd.commands) apply(sub);
  };
  apply(program);
}
