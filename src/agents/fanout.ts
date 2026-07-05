// ORIRO sub-agent fan-out — V0.3.6 runner. Spawns N FULL tool-enabled ORIRO sessions in parallel
// (each Guardian-gated, hard-timeout via agents/run.ts), one isolated git worktree per agent so
// parallel edits never collide. Clean worktrees are removed; changed ones are kept + reported with
// review/merge commands. Outside a git repo the agents still run — same cwd, with a warning.
// ORIRO_AGENT_DEPTH is raised ONCE around the whole fan (posture-gate bypass for children + the
// existing recursion guard) — never per-agent, which would race between parallel siblings.
import { runAgent } from "./run.js";
import type { AgentDef } from "./store.js";
import { runPool } from "../orchestrate.js";
import {
  MAX_FAN, gitRoot, addWorktree, changedFiles, removeWorktree,
  fanStamp, fanBranch, fanDir, formatFanReport, type FanReport,
} from "./worktree.js";

const CONCURRENCY = 2; // full tool sessions are heavy on the free pool — 2 at a time, up to MAX_FAN queued

function defFor(role: string, task: string): AgentDef {
  const now = new Date().toISOString();
  return { name: `fan-${role}`, task, createdAt: now, updatedAt: now };
}

/** Run the fan-out and return the merged report lines for the REPL. Never throws. */
export async function runFanout(tasks: string[], cwd: string): Promise<string[]> {
  const capped = tasks.slice(0, MAX_FAN);
  const root = await gitRoot(cwd);
  const stamp = fanStamp(new Date());

  const prevDepth = process.env.ORIRO_AGENT_DEPTH;
  process.env.ORIRO_AGENT_DEPTH = String((Number(prevDepth) || 0) + 1);
  let reports: FanReport[];
  try {
    reports = await runPool(capped.map((task, i) => ({ task, i })), CONCURRENCY, async ({ task, i }) => {
      const role = `a${i + 1}`;
      if (!root) {
        const r = await runAgent(defFor(role, task), { cwd });
        return { role, task, ok: r.ok, output: r.output };
      }
      const dir = fanDir(root, stamp, i);
      const branch = fanBranch(stamp, i);
      const err = await addWorktree(root, dir, branch);
      if (err) return { role, task, ok: false, output: `could not create worktree: ${err}` };
      const r = await runAgent(defFor(role, task), { cwd: dir });
      const changes = await changedFiles(dir);
      if (changes.length === 0) {
        await removeWorktree(root, dir, branch); // nothing to keep — leave no residue
        return { role, task, ok: r.ok, output: r.output, changes: [] };
      }
      return { role, task, ok: r.ok, output: r.output, dir, branch, changes };
    });
  } finally {
    if (prevDepth === undefined) delete process.env.ORIRO_AGENT_DEPTH;
    else process.env.ORIRO_AGENT_DEPTH = prevDepth;
  }

  const lines = formatFanReport(reports);
  if (!root) lines.unshift("  ⚒ not a git repo — agents ran in the SAME directory (no worktree isolation)");
  return lines;
}
