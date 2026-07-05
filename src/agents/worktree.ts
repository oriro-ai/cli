// ORIRO sub-agent fan-out — V0.3.6. Git-worktree isolation + the pure pieces (slash parsing,
// naming, report formatting) of the in-REPL `/agents` parallel fan-out (the Grok worktree-subagents
// / Antigravity Agent-Manager pattern). Each agent works in its OWN worktree on its OWN branch, so
// parallel edits can never collide; clean worktrees are removed, changed ones are kept and reported
// with exact review/merge commands. Pure functions are unit-tested in scripts/test-agents-fanout.ts;
// git operations shell out via execFile (no shell interpolation) and never throw.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join, basename } from "node:path";
import { oriroDir } from "../config/paths.js";

const run = promisify(execFile);

/** Hard cap — worktree agents are full tool-enabled sessions; more than 4 thrashes the free pool. */
export const MAX_FAN = 4;

export type AgentsSlash = { cmd: "help" } | { cmd: "fan"; tasks: string[] };

/**
 * Parse the `/agents` slash:
 *   `/agents`                      → help
 *   `/agents 3x <task>`            → 3 parallel copies of one task (capped at MAX_FAN)
 *   `/agents <task A> | <task B>`  → distinct parallel tasks (capped at MAX_FAN)
 * Word-boundary strict (no /agentsx). NOTE: `|` splits tasks — documented in the help.
 */
export function parseAgentsSlash(line: string): AgentsSlash | undefined {
  const m = /^\/agents(?:\s+(\S[\s\S]*))?$/i.exec(line.trim());
  if (!m) return undefined;
  const rest = m[1]?.trim();
  if (!rest) return { cmd: "help" };
  const nx = /^(\d+)x\s+(\S[\s\S]*)$/i.exec(rest);
  if (nx) {
    const n = Math.min(Math.max(Number(nx[1]), 1), MAX_FAN);
    return { cmd: "fan", tasks: Array.from({ length: n }, () => nx[2]!.trim()) };
  }
  const tasks = rest.split("|").map((s) => s.trim()).filter(Boolean).slice(0, MAX_FAN);
  return tasks.length ? { cmd: "fan", tasks } : { cmd: "help" };
}

/** Deterministic per-fan stamp (Date passed in for testability): MMDD-HHMMSS. */
export function fanStamp(now: Date): string {
  const p = (n: number, w = 2): string => String(n).padStart(w, "0");
  return `${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
}

export function fanBranch(stamp: string, i: number): string {
  return `oriro/agents/${stamp}-a${i + 1}`;
}

/** Worktree dir under ~/.oriro/worktrees (ORIRO_STATE_DIR honored) — never inside the repo. */
export function fanDir(repoRoot: string, stamp: string, i: number): string {
  return join(oriroDir(), "worktrees", `${basename(repoRoot)}-${stamp}-a${i + 1}`);
}

// ── git plumbing (never throws) ────────────────────────────────────────────────────────────────
async function git(cwd: string, ...args: string[]): Promise<{ ok: boolean; out: string }> {
  try {
    const { stdout } = await run("git", ["-C", cwd, ...args], { windowsHide: true });
    return { ok: true, out: stdout.trim() };
  } catch (e) {
    return { ok: false, out: e instanceof Error ? e.message : String(e) };
  }
}

/** Repo toplevel for cwd, or undefined when not in a git repo (fan-out then runs unisolated). */
export async function gitRoot(cwd: string): Promise<string | undefined> {
  const r = await git(cwd, "rev-parse", "--show-toplevel");
  return r.ok && r.out ? r.out : undefined;
}

/** Create an isolated worktree on a fresh branch. Returns an error string on failure, else undefined. */
export async function addWorktree(root: string, dir: string, branch: string): Promise<string | undefined> {
  const r = await git(root, "worktree", "add", "-b", branch, dir);
  return r.ok ? undefined : r.out;
}

/** `git status --short` lines for the worktree — the agent's uncommitted footprint. */
export async function changedFiles(dir: string): Promise<string[]> {
  const r = await git(dir, "status", "--short");
  return r.ok && r.out ? r.out.split("\n").map((s) => s.trim()).filter(Boolean) : [];
}

/** Remove a worktree (force for dirty ones) + best-effort prune of its branch. */
export async function removeWorktree(root: string, dir: string, branch?: string, force = false): Promise<void> {
  await git(root, "worktree", "remove", ...(force ? ["--force"] : []), dir);
  if (branch) await git(root, "branch", "-D", branch);
}

// ── report formatting (pure) ───────────────────────────────────────────────────────────────────
export interface FanReport {
  role: string;
  task: string;
  ok: boolean;
  output: string;
  /** Set only when the agent left uncommitted changes in a kept worktree. */
  dir?: string;
  branch?: string;
  changes?: string[];
}

const SNIPPET = 400;

/** Merge the fan-out into REPL lines: per-agent verdict + output snippet + review/merge commands. */
export function formatFanReport(reports: FanReport[]): string[] {
  const lines: string[] = [];
  for (const r of reports) {
    lines.push(`  ⚒ ${r.role} ${r.ok ? "✓" : "✗"} — ${r.task.length > 70 ? `${r.task.slice(0, 70)}…` : r.task}`);
    const snip = r.output.length > SNIPPET ? `${r.output.slice(0, SNIPPET)}…` : r.output;
    if (snip) lines.push(...snip.split("\n").map((l) => `    ${l}`));
    if (r.dir && r.branch && r.changes?.length) {
      lines.push(`    ✎ ${r.changes.length} file${r.changes.length === 1 ? "" : "s"} changed on ${r.branch}`);
      lines.push(`    review: cd "${r.dir}"   ·   keep: commit there, then \`git merge ${r.branch}\` here`);
    } else if (r.changes && r.changes.length === 0) {
      lines.push("    (no file changes — worktree cleaned up)");
    }
  }
  const kept = reports.filter((r) => r.dir).length;
  lines.push(`  ⚒ fan-out done: ${reports.filter((r) => r.ok).length}/${reports.length} ok${kept ? ` · ${kept} worktree${kept === 1 ? "" : "s"} kept for review` : ""}`);
  return lines;
}
