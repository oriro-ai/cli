// `/agents` — V0.3.6 in-REPL parallel sub-agent fan-out over isolated git worktrees.
// Thin slash surface (both REPLs call this); parsing + git + orchestration live in src/agents/.
import { parseAgentsSlash, MAX_FAN } from "../agents/worktree.js";
import { runFanout } from "../agents/fanout.js";
import { accent, dim } from "../ui/theme.js";

export function isAgentsSlash(slash: string): boolean {
  return parseAgentsSlash(slash) !== undefined;
}

export async function handleAgents(line: string): Promise<string[]> {
  const p = parseAgentsSlash(line);
  if (!p || p.cmd === "help") {
    return [
      `  ${accent("/agents")} ${dim("— parallel sub-agents in isolated git worktrees (results merged here)")}`,
      `    ${accent("/agents 3x <task>")}        ${dim("three agents race the same task")}`,
      `    ${accent("/agents <task A> | <task B>")}  ${dim(`different tasks in parallel (max ${MAX_FAN}; '|' separates tasks)`)}`,
      `    ${dim("each agent gets its own worktree + branch; clean ones are removed, changed ones kept for review")}`,
    ];
  }
  return runFanout(p.tasks, process.cwd());
}
