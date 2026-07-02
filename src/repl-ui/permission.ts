// ORIRO permission modes — the posture cycle shown in the footer (Shift+Tab) and the gate it drives.
// Pure + deterministic (unit-tested). The UI (tui.ts) renders footerLabel() and calls cycleMode();
// the tool gate (wired into the session's tool_call) calls decideTool(). Guardian is ALWAYS the floor:
// a Guardian-blocked call is blocked in EVERY mode — even Auto — so wipes/exfil/curl|sh never run.

export type PermissionMode = "manual" | "accept_edits" | "auto" | "plan";

/** Cycle order for Shift+Tab. */
export const MODES: readonly PermissionMode[] = ["manual", "accept_edits", "auto", "plan"];

export interface ModeMeta {
  label: string;
  indicator: string; // glyph shown in the footer
}
export const MODE_META: Record<PermissionMode, ModeMeta> = {
  manual: { label: "Manual", indicator: "●" },
  accept_edits: { label: "Accept Edits", indicator: "✎" },
  auto: { label: "Auto", indicator: "⏵⏵" },
  plan: { label: "Plan", indicator: "▢" },
};

// Module-level state — shared between the footer (display + cycle) and the tool gate.
let current: PermissionMode = "manual"; // safe default: ask before acting

export function getMode(): PermissionMode {
  return current;
}
export function setMode(m: PermissionMode): void {
  current = m;
}
/** Advance to the next posture (Shift+Tab). Returns the new mode. */
export function cycleMode(): PermissionMode {
  const i = MODES.indexOf(current);
  current = MODES[(i + 1) % MODES.length] as PermissionMode;
  return current;
}

// Thinking cycle (alt+shift+t) — orthogonal to the posture. When ON, the REPL prepends a
// plan-first reasoning primer to the turn: a real behaviour change on the keyless floor (the
// model plans before acting), not a cosmetic toggle. Off by default.
let thinking = false;
export function getThinking(): boolean {
  return thinking;
}
export function toggleThinking(): boolean {
  thinking = !thinking;
  return thinking;
}
export const THINKING_PRIMER =
  "Think step by step and plan your approach before acting. Reason carefully and check your work.";

export type ToolKind = "read" | "edit" | "exec" | "other";

/** Classify a tool by name into read-only / edit / exec / other (drives Plan + Accept-Edits). */
export function classifyTool(toolName: string): ToolKind {
  const n = toolName.toLowerCase();
  if (/(^|_)(read|ls|grep|find|glob|inspect|view|cat|list)/.test(n)) return "read";
  if (/(^|_)(edit|write|apply|patch|create|update|str_replace|multiedit)/.test(n)) return "edit";
  if (/(^|_)(bash|shell|exec|run|terminal|command|sh)/.test(n)) return "exec";
  return "other";
}

export type Decision = "allow" | "ask" | "block";

/**
 * Decide a tool call given the current posture and whether Guardian already blocked it.
 * - Guardian floor: a Guardian-blocked call is ALWAYS blocked (even in Auto).
 * - Plan: read-only — edits/exec/other are blocked, reads allowed.
 * - Manual: ask before every (non-read) action.
 * - Accept Edits: auto-allow edits + reads; ask for exec/other.
 * - Auto: don't ask for low-risk — allow (Guardian still vetoes the dangerous).
 */
export function decideTool(opts: {
  toolName: string;
  guardianBlocked: boolean;
  mode?: PermissionMode;
}): { decision: Decision; reason?: string } {
  const mode = opts.mode ?? current;
  if (opts.guardianBlocked) return { decision: "block", reason: "ORIRO Guardian" };

  const kind = classifyTool(opts.toolName);

  if (mode === "plan") {
    return kind === "read"
      ? { decision: "allow" }
      : { decision: "block", reason: "Plan mode is read-only" };
  }
  if (mode === "manual") {
    return kind === "read" ? { decision: "allow" } : { decision: "ask" };
  }
  if (mode === "accept_edits") {
    if (kind === "read" || kind === "edit") return { decision: "allow" };
    return { decision: "ask" }; // exec / other
  }
  // auto — low-risk auto-runs; Guardian (above) already vetoed the dangerous.
  return { decision: "allow" };
}
