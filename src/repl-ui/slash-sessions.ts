// V0.3.4 — in-REPL session commands:
//   /sessions   → list this project's saved sessions (resume by relaunching `oriro --resume <id>`)
//   /undo       → rewind the last turn within the current session (harness navigateTree; append-only,
//                 nothing is destroyed — the old branch is still on disk).
// Live mid-REPL switching (resume a *different* session without relaunch) needs the runtime wrapper the
// REPL doesn't hold yet; listing + relaunch-to-resume is the same primary path Kimi/Grok/Claude Code use.
import type { AgentSession } from "@earendil-works/pi-coding-agent";
import { listSessions, formatSessionList } from "../sessions/store.js";
import { accent, dim, fgHex, PALETTE } from "../ui/theme.js";

export function isSessionsSlash(cmd: string): boolean {
  return /^\/sessions?(\s|$)/i.test(cmd.trim());
}
export function isUndoSlash(cmd: string): boolean {
  return /^\/undo(\s|$)/i.test(cmd.trim());
}

/** `/sessions` — list saved sessions for the current project. Read-only. */
export async function handleSessions(): Promise<string[]> {
  try {
    return formatSessionList(await listSessions());
  } catch (e) {
    return [`  ${fgHex(PALETTE.error, "sessions failed")}: ${dim(e instanceof Error ? e.message : String(e))}`];
  }
}

/**
 * `/undo` — rewind the current session to before the last user turn. Uses getUserMessagesForForking()
 * to find the previous user message and navigateTree() to move the leaf there (same file, append-only).
 */
export async function handleUndo(session: AgentSession): Promise<string[]> {
  try {
    const turns = session.getUserMessagesForForking();
    if (turns.length < 2) {
      return [dim("  nothing to undo — this is the first turn of the session.")];
    }
    // Rewind to the user message BEFORE the last one → the last full exchange is dropped from the branch.
    const target = turns[turns.length - 2];
    if (!target) return [dim("  nothing to undo.")];
    const res = await session.navigateTree(target.entryId, { label: "undo" });
    if (res.cancelled) return [dim("  undo cancelled.")];
    const preview = target.text.replace(/\s+/g, " ").trim().slice(0, 48);
    return [`  ${fgHex(PALETTE.success, "↺ undone")} ${dim("— rewound to:")} ${accent(preview || "(prev turn)")}`];
  } catch (e) {
    return [`  ${fgHex(PALETTE.error, "undo failed")}: ${dim(e instanceof Error ? e.message : String(e))}`];
  }
}
