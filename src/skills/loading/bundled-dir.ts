// Bundled directory helpers locate bundled skill roots across package layouts.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveOriroPackageRootSync } from "../../infra/oriro-root.js";

// True if `dir` (or any descendant within `depth` levels) holds a SKILL.md. The
// loader recurses unbounded, so the resolver gate must also see nested layouts —
// ORIRO ships skills as skills/<category>/<skill>/SKILL.md, two levels deep.
function containsSkillManifest(dir: string, depth: number): boolean {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") {
      continue;
    }
    if (entry.isFile() && (entry.name === "SKILL.md" || entry.name.endsWith(".md"))) {
      return true;
    }
    if (entry.isDirectory() && depth > 0) {
      if (containsSkillManifest(path.join(dir, entry.name), depth - 1)) {
        return true;
      }
    }
  }
  return false;
}

function looksLikeSkillsDir(dir: string): boolean {
  // Direct .md, flat skills/<skill>/SKILL.md, or nested category layouts.
  return containsSkillManifest(dir, 3);
}

export type BundledSkillsResolveOptions = {
  argv1?: string;
  moduleUrl?: string;
  cwd?: string;
  execPath?: string;
};

export function resolveBundledSkillsDir(
  opts: BundledSkillsResolveOptions = {},
): string | undefined {
  const override = process.env.ORIRO_BUNDLED_SKILLS_DIR?.trim();
  if (override) {
    return override;
  }

  // bun --compile: ship a sibling `skills/` next to the executable.
  try {
    const execPath = opts.execPath ?? process.execPath;
    const execDir = path.dirname(execPath);
    const sibling = path.join(execDir, "skills");
    if (fs.existsSync(sibling)) {
      return sibling;
    }
  } catch {
    // ignore
  }

  // npm/dev: resolve `<packageRoot>/skills` relative to this module.
  try {
    const moduleUrl = opts.moduleUrl ?? import.meta.url;
    const moduleDir = path.dirname(fileURLToPath(moduleUrl));
    const argv1 = opts.argv1 ?? process.argv[1];
    const cwd = opts.cwd ?? process.cwd();
    const packageRoot = resolveOriroPackageRootSync({
      argv1,
      moduleUrl,
      cwd,
    });
    if (packageRoot) {
      const candidate = path.join(packageRoot, "skills");
      if (looksLikeSkillsDir(candidate)) {
        return candidate;
      }
    }
    let current = moduleDir;
    for (let depth = 0; depth < 6; depth += 1) {
      const candidate = path.join(current, "skills");
      if (looksLikeSkillsDir(candidate)) {
        return candidate;
      }
      const next = path.dirname(current);
      if (next === current) {
        break;
      }
      current = next;
    }
  } catch {
    // ignore
  }

  return undefined;
}
