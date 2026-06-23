// ORIRO Step 5 — skills loader. The ORIRO skill library ships bundled with the CLI; this
// loads it through Pi's NATIVE loadSkills and applies Option-B tiering for FREE:
//   • CORE  (no flag)                  → model-visible (in the system prompt)
//   • TAIL  (disable-model-invocation) → loaded but /name-only (kept out of the prompt)
// No custom registry — the donor's OpenClaw-coupled skills loader is NOT folded. Zero footprint.
import { loadSkills, formatSkillsForPrompt } from "@earendil-works/pi-coding-agent";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/** Absolute path to the bundled skill library (override with ORIRO_SKILLS_DIR). */
export function skillsDir(): string {
  if (process.env.ORIRO_SKILLS_DIR) return process.env.ORIRO_SKILLS_DIR;
  // src/skills/loader.ts (or dist/skills/loader.js) → ../../skills at the package root.
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..", "skills");
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
