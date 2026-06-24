// ORIRO Step 5 — skills loader. The ORIRO skill library ships bundled with the CLI; this
// loads it through Pi's NATIVE loadSkills and applies Option-B tiering for FREE:
//   • CORE  (no flag)                  → model-visible (in the system prompt)
//   • TAIL  (disable-model-invocation) → loaded but /name-only (kept out of the prompt)
// No custom registry — the donor's OpenClaw-coupled skills loader is NOT folded. Zero footprint.
import { loadSkills, formatSkillsForPrompt } from "@earendil-works/pi-coding-agent";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

/** Walk up from `start` to the package root (the dir holding package.json). */
function packageRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, "package.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

/** Absolute path to the bundled skill library (override with ORIRO_SKILLS_DIR).
 *  Anchored to the package root so it resolves identically whether running from source
 *  (src/skills/loader.ts, 2 levels deep) or the flat bundle (dist/cli.js, 1 level deep) —
 *  a fixed "../../" relative depth breaks one of those two layouts. */
export function skillsDir(): string {
  if (process.env.ORIRO_SKILLS_DIR) return process.env.ORIRO_SKILLS_DIR;
  return join(packageRoot(dirname(fileURLToPath(import.meta.url))), "skills");
}

export interface LoadedSkill {
  name: string;
  description: string;
  disableModelInvocation: boolean;
  filePath: string;
}

export interface OriroSkills {
  all: LoadedSkill[];
  core: LoadedSkill[]; // model-visible
  tail: LoadedSkill[]; // /name-only
  /** System-prompt blob — CORE only (Pi's formatSkillsForPrompt excludes TAIL natively). */
  prompt: string;
}

/** Load + tier the bundled ORIRO skills via Pi's native loader. */
export async function loadOriroSkills(dir: string = skillsDir()): Promise<OriroSkills> {
  const result: unknown = await loadSkills({
    cwd: dir,
    agentDir: dir,
    skillPaths: [dir],
    includeDefaults: false,
  });
  const all = (Array.isArray(result) ? result : ((result as { skills?: LoadedSkill[] }).skills ?? [])) as LoadedSkill[];
  return {
    all,
    core: all.filter((s) => !s.disableModelInvocation),
    tail: all.filter((s) => s.disableModelInvocation),
    prompt: formatSkillsForPrompt(all as never),
  };
}
