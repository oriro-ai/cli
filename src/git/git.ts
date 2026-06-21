// ORIRO CLI — git operations + diff review. A dedicated, structured git surface for the
// coder (the inventory gap: previously shell-only). Uses execFile (no shell → no injection),
// read operations are free, mutating ones (add/commit) flow through Guardian + the
// permission posture like any tool. Diff-review gives the human a compact change summary.

import { execFile } from "node:child_process";

export interface GitResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

/** Run a git subcommand with execFile (argv array — never a shell string). */
export function runGit(args: string[], cwd: string = process.cwd()): Promise<GitResult> {
  return new Promise((resolve) => {
    execFile("git", args, { cwd, maxBuffer: 16 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({
        ok: !err,
        stdout: (stdout ?? "").toString(),
        stderr: (stderr ?? "").toString(),
      });
    });
  });
}

export async function isGitRepo(cwd?: string): Promise<boolean> {
  return (await runGit(["rev-parse", "--is-inside-work-tree"], cwd)).stdout.trim() === "true";
}

export const gitStatus = (cwd?: string) => runGit(["status", "--short", "--branch"], cwd);
export const gitDiff = (file: string | undefined, cwd?: string) =>
  runGit(file ? ["diff", "--", file] : ["diff"], cwd);
export const gitDiffStaged = (cwd?: string) => runGit(["diff", "--staged"], cwd);
export const gitLog = (n = 10, cwd?: string) => runGit(["log", `-${Math.max(1, n)}`, "--oneline", "--decorate"], cwd);
export const gitAdd = (files: string[], cwd?: string) => runGit(["add", "--", ...files], cwd);
export const gitCommit = (message: string, cwd?: string) => runGit(["commit", "-m", message], cwd);
export const gitBranch = (cwd?: string) => runGit(["branch", "--show-current"], cwd);
export const gitShow = (ref: string, cwd?: string) => runGit(["show", "--stat", ref], cwd);

/** Compact diff-review: which files changed + insertions/deletions, staged vs unstaged. */
export async function gitDiffReview(cwd?: string): Promise<string> {
  const unstaged = (await runGit(["diff", "--stat"], cwd)).stdout.trim();
  const staged = (await runGit(["diff", "--staged", "--stat"], cwd)).stdout.trim();
  const parts = [unstaged && `── Unstaged ──\n${unstaged}`, staged && `── Staged ──\n${staged}`].filter(Boolean);
  return parts.length ? parts.join("\n\n") : "No changes in the working tree.";
}
