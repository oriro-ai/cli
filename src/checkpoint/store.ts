// ORIRO CLI — per-edit checkpoint/undo. Before every file Write/Edit, the prior content
// is snapshotted so any edit (especially in Auto mode) can be rewound. In-memory stack
// for the session + a persisted log/snapshots under ~/.oriro/checkpoints/ so undo survives
// across a restart. Best-effort: a snapshot failure never blocks the edit.

import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync, appendFileSync, rmSync } from "node:fs";

const DIR = join(homedir(), ".oriro", "checkpoints");
const LOG = join(DIR, "log.jsonl");

export interface Checkpoint {
  id: string;
  ts: string;
  /** Absolute path of the edited file. */
  file: string;
  /** Prior content, or null when the file did not exist (a brand-new file). */
  priorContent: string | null;
  /** The tool that triggered it (write / edit / apply_patch). */
  tool: string;
}

// Session stack (newest last). Persisted snapshots back this up across restarts.
const stack: Checkpoint[] = [];

/** Snapshot a file's current content BEFORE it's edited. `ts` injected (no Date.now here). */
export function recordCheckpoint(file: string, tool: string, ts = new Date().toISOString()): Checkpoint {
  let prior: string | null = null;
  try {
    prior = readFileSync(file, "utf8");
  } catch {
    prior = null; // file doesn't exist yet → new file; undo removes it
  }
  const cp: Checkpoint = { id: `${Date.parse(ts) || stack.length}-${stack.length}`, ts, file, priorContent: prior, tool };
  stack.push(cp);
  try {
    mkdirSync(DIR, { recursive: true });
    if (prior !== null) writeFileSync(join(DIR, cp.id + ".snap"), prior, "utf8");
    appendFileSync(
      LOG,
      JSON.stringify({ id: cp.id, ts, file, tool, snap: prior !== null ? cp.id + ".snap" : null }) + "\n",
      "utf8",
    );
  } catch {
    /* persistence is best-effort; the in-memory stack still works this session */
  }
  return cp;
}

/** Undo the most recent edit: restore prior content, or delete a file that was newly created. */
export function undoLast(): { file: string; restored: boolean; action: "restored" | "removed" | "failed" } | null {
  const cp = stack.pop();
  if (!cp) return null;
  try {
    if (cp.priorContent === null) {
      rmSync(cp.file, { force: true });
      return { file: cp.file, restored: true, action: "removed" };
    }
    writeFileSync(cp.file, cp.priorContent, "utf8");
    return { file: cp.file, restored: true, action: "restored" };
  } catch {
    stack.push(cp); // restore stack on failure so the user can retry
    return { file: cp.file, restored: false, action: "failed" };
  }
}

/** Most-recent-first list of pending undo points. */
export function listCheckpoints(): Checkpoint[] {
  return [...stack].reverse();
}

export function checkpointCount(): number {
  return stack.length;
}

/** Clear the session undo stack (e.g. after a commit). */
export function clearCheckpoints(): void {
  stack.length = 0;
}
