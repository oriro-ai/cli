// Unit test for V0.3.6 `/agents` fan-out (src/agents/worktree.ts + posture bypass). tsx.
// Pure parts always run; the git-worktree plumbing runs against a throwaway tmp repo (skipped with
// a note if git is unavailable). Run: tsx scripts/test-agents-fanout.ts
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

import {
  parseAgentsSlash, fanStamp, fanBranch, fanDir, formatFanReport, MAX_FAN,
  gitRoot, addWorktree, changedFiles, removeWorktree,
} from "../src/agents/worktree.js";
import { bypassPosture } from "../src/repl-ui/posture-gate.js";

let fails = 0;
function ok(cond: boolean, label: string): void {
  process.stdout.write(`${cond ? "✅" : "❌"} ${label}\n`);
  if (!cond) fails++;
}

// ── slash parsing ──────────────────────────────────────────────────────────────────────────────
ok(parseAgentsSlash("/agents")?.cmd === "help", "bare /agents → help");
{
  const p = parseAgentsSlash("/agents 3x run the tests");
  ok(p?.cmd === "fan" && p.tasks.length === 3 && p.tasks[0] === "run the tests", "Nx → N copies");
}
{
  const p = parseAgentsSlash("/agents 9x flood");
  ok(p?.cmd === "fan" && p.tasks.length === MAX_FAN, `Nx capped at ${MAX_FAN}`);
}
{
  const p = parseAgentsSlash("/agents fix lint | write docs | add tests");
  ok(p?.cmd === "fan" && p.tasks.length === 3 && p.tasks[1] === "write docs", "pipe-separated distinct tasks");
}
{
  const p = parseAgentsSlash("/AGENTS 2X do it");
  ok(p?.cmd === "fan" && p.tasks.length === 2, "case-insensitive");
}
ok(parseAgentsSlash("/agentsx") === undefined && parseAgentsSlash("/agent") === undefined, "word-boundary: no false matches");
ok(parseAgentsSlash("/agents  |  | ")?.cmd === "help", "only empty tasks → help, not a zero-agent fan");

// ── naming (pure, Date injected) ───────────────────────────────────────────────────────────────
{
  const stamp = fanStamp(new Date(2026, 6, 4, 9, 5, 7)); // Jul 04 09:05:07
  ok(stamp === "0704-090507", "fanStamp is MMDD-HHMMSS zero-padded");
  ok(fanBranch(stamp, 0) === "oriro/agents/0704-090507-a1", "branch name");
  const dir = fanDir("/repo/myproj", stamp, 1);
  ok(dir.includes("myproj-0704-090507-a2") && dir.includes("worktrees"), "worktree dir outside the repo, role-numbered");
}

// ── report formatting (pure) ───────────────────────────────────────────────────────────────────
{
  const lines = formatFanReport([
    { role: "a1", task: "fix lint", ok: true, output: "done, 3 files", dir: "C:/wt1", branch: "oriro/agents/x-a1", changes: ["M a.ts", "M b.ts"] },
    { role: "a2", task: "write docs", ok: false, output: "router busy", changes: [] },
  ]);
  const joined = lines.join("\n");
  ok(joined.includes("a1 ✓") && joined.includes("a2 ✗"), "per-agent verdicts");
  ok(joined.includes("2 files changed on oriro/agents/x-a1") && joined.includes("git merge"), "kept worktree → review/merge commands");
  ok(joined.includes("no file changes"), "clean agent → cleanup note");
  ok(joined.includes("1/2 ok") && joined.includes("1 worktree kept"), "footer totals");
}

// ── posture bypass for sub-agents (pure) ───────────────────────────────────────────────────────
ok(!bypassPosture(undefined) && !bypassPosture("") && !bypassPosture("0"), "main session: posture applies");
ok(bypassPosture("1") && bypassPosture("2"), "sub-agents (depth>0): posture bypassed, Guardian floor stays");
ok(!bypassPosture("junk"), "garbage env → posture applies (fail-safe)");

// ── git worktree plumbing (tmp repo integration) ───────────────────────────────────────────────
let gitOk = true;
try { execFileSync("git", ["--version"], { stdio: "ignore" }); } catch { gitOk = false; }
if (!gitOk) {
  process.stdout.write("⏭  git unavailable — worktree plumbing tests skipped\n");
} else {
  const repo = mkdtempSync(join(tmpdir(), "oriro-fan-"));
  const g = (...a: string[]): void => { execFileSync("git", ["-C", repo, ...a], { stdio: "ignore" }); };
  g("init", "-b", "main");
  g("config", "user.email", "qa@oriro.test");
  g("config", "user.name", "oriro-qa");
  writeFileSync(join(repo, "README.md"), "hello\n");
  g("add", "-A");
  g("commit", "-m", "init");

  const root = await gitRoot(repo);
  ok(!!root, "gitRoot finds the tmp repo");
  ok((await gitRoot(tmpdir())) === undefined, "gitRoot outside a repo → undefined");

  const wt = join(repo, "..", "oriro-fan-wt-a1");
  const err = await addWorktree(repo, wt, "oriro/agents/test-a1");
  ok(err === undefined && existsSync(join(wt, "README.md")), "addWorktree creates isolated checkout on its branch");

  ok((await changedFiles(wt)).length === 0, "fresh worktree is clean");
  writeFileSync(join(wt, "new.ts"), "export {};\n");
  const ch = await changedFiles(wt);
  ok(ch.length === 1 && ch[0]!.includes("new.ts"), "changedFiles sees the agent's footprint");

  await removeWorktree(repo, wt, "oriro/agents/test-a1", true);
  ok(!existsSync(wt), "removeWorktree (force) removes a dirty worktree");

  rmSync(repo, { recursive: true, force: true });
}

process.stdout.write(fails === 0 ? "\nagents-fanout: ALL PASS\n" : `\nagents-fanout: ${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
