// V0.3.2 — `/compact`: summarize the conversation so far and drop the raw history, freeing context
// so a long session keeps working instead of hitting the window. Wires the Pi harness's REAL
// compaction engine (session.compact() → generateSummary + context replacement); we do NOT
// re-implement summarization. Every leading agent CLI has this; ORIRO now does too, keyless.
import type { AgentSession } from "@earendil-works/pi-coding-agent";
import type { CompactionResult } from "@earendil-works/pi-coding-agent";
import { accent, dim, fgHex, PALETTE } from "../ui/theme.js";

export function isCompactSlash(cmd: string): boolean {
  return /^\/compact(\s|$)/i.test(cmd.trim());
}

/** Anything after `/compact ` is passed to the summarizer as custom focus instructions. */
export function compactInstructions(cmd: string): string | undefined {
  const rest = cmd.trim().replace(/^\/compact\s*/i, "").trim();
  return rest.length ? rest : undefined;
}

/**
 * Pure, testable formatter for the result of a compaction. Reports the token delta (before →
 * after) and the % freed, so the user sees a concrete win — not just "done". `estimatedTokensAfter`
 * is optional in the harness result; fall back to a "compacted" line when it's absent.
 */
export function formatCompactionResult(result: CompactionResult): string[] {
  const before = result.tokensBefore;
  const after = result.estimatedTokensAfter;
  const lines: string[] = [];
  if (typeof after === "number" && before > 0) {
    const freed = Math.max(0, before - after);
    const pct = Math.round((freed / before) * 100);
    lines.push(
      `  ${fgHex(PALETTE.success, "✓ compacted")} ` +
        `${dim(`${before.toLocaleString()} → ${after.toLocaleString()} tokens`)} ` +
        `${accent(`(${pct}% freed)`)}`,
    );
  } else {
    lines.push(`  ${fgHex(PALETTE.success, "✓ compacted")} ${dim(`${before.toLocaleString()} tokens summarized`)}`);
  }
  lines.push(dim("  history summarized; the summary is kept, raw turns dropped. Keep going."));
  return lines;
}

/**
 * Run a real compaction against the live session. Guards the already-running case (auto-compaction
 * can be mid-flight) and never throws into the REPL loop — a failed compaction reports cleanly and
 * leaves the session untouched.
 */
export async function handleCompact(session: AgentSession, cmd: string): Promise<string[]> {
  if (session.isCompacting) {
    return [dim("  compaction already in progress — hold on…")];
  }
  // Nothing meaningful to compact on a fresh session (just the system prompt / a turn or two).
  if (session.messages.length < 4) {
    return [dim("  not much to compact yet — keep chatting, then /compact frees context.")];
  }
  try {
    const result = await session.compact(compactInstructions(cmd));
    if (!result) return [dim("  nothing to compact right now.")];
    return formatCompactionResult(result);
  } catch (e) {
    return [`  ${fgHex(PALETTE.error, "compaction failed")}: ${dim(e instanceof Error ? e.message : String(e))}`];
  }
}
