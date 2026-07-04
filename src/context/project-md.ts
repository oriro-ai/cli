// V0.3.1 — project-instructions ingestion. Every leading agent CLI reads a project memory file
// (Claude Code → CLAUDE.md, OpenClaw/Kimi/Antigravity → AGENTS.md) and folds it into the system
// prompt so the model honours repo-specific conventions. ORIRO reads BOTH, nearest-first, walking
// up from cwd to the git/repo root — same discovery model, keyless.
//
// Guarantees: read-only, never throws (a bad file must not break a turn), bounded (size + walk
// depth capped so a giant or symlink-looped tree can't blow the context or hang).
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, dirname, parse } from "node:path";

// Filenames we honour, in precedence order (first found at a level wins that level's slot).
const NAMES = ["AGENTS.md", "CLAUDE.md", ".oriro/ORIRO.md"] as const;
const MAX_BYTES = 32 * 1024; // per file — a memory file, not a novel; keep the prompt lean
const MAX_LEVELS = 24; // walk-up depth cap (defends against symlink loops / pathological trees)

/** True once we hit a repo/workspace root — stop the upward walk here (inclusive). */
function isRoot(dir: string): boolean {
  return existsSync(join(dir, ".git")) || existsSync(join(dir, ".oriro"));
}

interface Found {
  path: string;
  text: string;
}

/**
 * Discover project-instruction files from `cwd` up to the repo root (inclusive).
 * Returned FARTHEST-first (root → cwd) so the nearest, most-specific file lands LAST in the
 * prompt and therefore wins when instructions conflict — the same "closest overrides" rule
 * every other agent CLI uses.
 */
export function discoverProjectInstructions(cwd: string): Found[] {
  const chain: Found[] = [];
  let dir = cwd;
  const rootOfDrive = parse(cwd).root;
  for (let i = 0; i < MAX_LEVELS; i++) {
    for (const name of NAMES) {
      const p = join(dir, name);
      try {
        if (existsSync(p) && statSync(p).isFile()) {
          let text = readFileSync(p, "utf8");
          if (text.length > MAX_BYTES) text = text.slice(0, MAX_BYTES) + "\n…(truncated)";
          text = text.trim();
          if (text) chain.push({ path: p, text });
          break; // one file per directory level (precedence: AGENTS.md > CLAUDE.md > .oriro/ORIRO.md)
        }
      } catch {
        /* unreadable file must never break a turn — skip it */
      }
    }
    if (isRoot(dir)) break; // stop at (and include) the repo root
    const parent = dirname(dir);
    if (parent === dir || dir === rootOfDrive) break; // filesystem root reached
    dir = parent;
  }
  return chain.reverse(); // farthest-first → nearest wins (lands last)
}

/**
 * Build the system-prompt block for the project instructions found under `cwd` (default:
 * process.cwd()). Empty string when there are none — the caller appends only when non-empty,
 * exactly like buildScribeContext. Mirrors the Scribe-context injection in mux-provider.
 */
export function buildProjectContext(cwd: string = process.cwd()): string {
  let found: Found[];
  try {
    found = discoverProjectInstructions(cwd);
  } catch {
    return ""; // discovery itself must never break a turn
  }
  if (!found.length) return "";
  const blocks = found.map((f) => `# Project instructions — ${f.path}\n${f.text}`);
  return (
    "The user's project ships these instructions. Treat them as authoritative for work in this " +
    "repository; when two files conflict, the one listed LAST (nearest the working directory) wins.\n\n" +
    blocks.join("\n\n")
  );
}
