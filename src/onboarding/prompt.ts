// ORIRO onboarding — abort-safe prompt. readline/promises `question()` REJECTS on Ctrl-D / Ctrl-C
// (EOF / SIGINT); unguarded, that bubbles up as `ORIRO error: AbortError` with exit 1. The chat
// REPL already guards this; onboarding did not, so aborting first-run onboarding crashed. This
// helper makes every onboarding prompt exit cleanly (like the REPL) on abort — and because
// isFirstRun() now keys on the union of unsettled steps, the skipped steps are re-offered next run.
import { stdout } from "node:process";
import type { Interface } from "node:readline/promises";
import { dim } from "../ui/theme.js";

/** Ask a question; on Ctrl-D / Ctrl-C, exit the process cleanly (code 0) instead of crashing. */
export async function ask(rl: Interface, question: string): Promise<string> {
  try {
    return await rl.question(question);
  } catch {
    try { rl.close(); } catch { /* already closing */ }
    stdout.write(dim("\nBye.\n"));
    process.exit(0);
  }
}
