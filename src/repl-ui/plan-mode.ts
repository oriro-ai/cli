// ORIRO Plan mode — V0.3.5. The plan → approve → execute loop that elevates the footer's "▢ Plan"
// posture from a read-only gate into a real workflow (the Grok tri-mode / Kimi `/plan` pattern):
//   1. Enter Plan (Shift+Tab to ▢, or `/plan [task]`) — turns run READ-ONLY (posture-gate blocks
//      edits/exec) and the model is primed to produce a concrete numbered plan.
//   2. When a plan-mode turn completes, the plan is ARMED: `/approve` or `/reject`.
//   3. `/approve` restores the pre-plan posture and fires the execute turn; `/reject` discards.
// Guardian stays the floor throughout — approval here is the HUMAN gate, Guardian is the safety gate.
//
// Pure + deterministic (unit-tested in scripts/test-plan-mode.ts). The REPLs (tui-repl.ts and the
// readline loop in repl.ts) only call these functions — no plan state lives in the UI.

import type { PermissionMode } from "./permission.js";

/** Prepended (after translation, like THINKING_PRIMER) to every turn sent while in plan mode. */
export const PLAN_PRIMER =
  "PLAN MODE — read-only. Produce a concrete implementation plan for the request below: numbered " +
  "steps, the exact files to change and how, the commands to run, and the risks. Do NOT make any " +
  "changes — no edits, no writes, no commands (write/exec tools are blocked in this mode). " +
  "Finish with a short 'Verify' list of what will prove the work is correct after execution.";

/** The fixed execute turn sent on /approve (English by design — internal prompt, never translated). */
export const EXECUTE_PROMPT =
  "APPROVED: the plan you presented above has been approved by the user. Execute it now, step by " +
  "step, exactly as written — implement, run, and verify each step. Do not re-plan and do not ask " +
  "for approval again; Guardian still protects against dangerous actions.";

// ── State machine ──────────────────────────────────────────────────────────────────────────────
// Two facts: which posture to restore after approval, and whether a plan is armed for approval.
let prevMode: PermissionMode = "manual";
let ready = false;

/**
 * Record entry into plan mode. `from` is the posture BEFORE the switch; a re-entry while already
 * in plan keeps the original restore target (never restores to "plan" itself).
 */
export function enterPlan(from: PermissionMode): void {
  if (from !== "plan") prevMode = from;
  ready = false; // a fresh entry always needs a new plan turn before /approve
}

/** A plan-mode turn finished with `output`. Arms approval when there is a real plan. Returns armed. */
export function notePlanOutput(output: string): boolean {
  ready = output.trim().length > 0;
  return ready;
}

/** Is a plan armed and waiting on /approve · /reject? */
export function isPlanReady(): boolean {
  return ready;
}

export type ApproveResult =
  | { ok: true; restoreMode: PermissionMode; prompt: string }
  | { ok: false; reason: string };

/** /approve — consume the armed plan: restore the pre-plan posture and fire the execute prompt. */
export function approvePlan(): ApproveResult {
  if (!ready) return { ok: false, reason: "no plan is waiting for approval — /plan <task> first" };
  ready = false;
  return { ok: true, restoreMode: prevMode, prompt: EXECUTE_PROMPT };
}

/** /reject — discard the armed plan (stay in plan mode so the user can refine). Returns whether one existed. */
export function rejectPlan(): boolean {
  const had = ready;
  ready = false;
  return had;
}

/** Reset everything (used by tests). */
export function resetPlanState(): void {
  prevMode = "manual";
  ready = false;
}

// ── Slash surface ──────────────────────────────────────────────────────────────────────────────
export type PlanSlash =
  | { cmd: "plan"; task?: string }
  | { cmd: "approve" }
  | { cmd: "reject" };

/** Parse `/plan [task…]` · `/approve` · `/reject`. Word-boundary strict (no /planet, /approved). */
export function parsePlanSlash(line: string): PlanSlash | undefined {
  const m = /^\/(plan|approve|reject)(?:\s+(\S[\s\S]*))?$/i.exec(line.trim());
  if (!m) return undefined;
  const cmd = m[1]!.toLowerCase();
  if (cmd === "plan") return m[2] ? { cmd: "plan", task: m[2].trim() } : { cmd: "plan" };
  if (cmd === "approve") return { cmd: "approve" };
  return { cmd: "reject" };
}
