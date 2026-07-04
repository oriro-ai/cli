// V0.3.3 — `/init`: scaffold a starter AGENTS.md for the current project by detecting what's really
// there (name, languages, build/test commands, top-level layout). It's the write-side twin of the
// 0.3.1 ingestion: /init writes the file, and the next turn's system prompt reads it back. Every
// leading agent CLI ships /init; ORIRO now does too, keyless and local.
//
// Detection is read-only, bounded, and never throws — a weird tree yields a thinner file, never a crash.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";

const CODE_EXT: Record<string, string> = {
  ts: "TypeScript", tsx: "TypeScript", js: "JavaScript", jsx: "JavaScript", mjs: "JavaScript",
  py: "Python", go: "Go", rs: "Rust", java: "Java", kt: "Kotlin", rb: "Ruby", php: "PHP",
  c: "C", h: "C", cpp: "C++", cc: "C++", cs: "C#", swift: "Swift", sh: "Shell", sql: "SQL",
};
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", "out", "target", "__pycache__", ".venv", "venv", ".oriro"]);

export interface ProjectFacts {
  name: string;
  description?: string;
  languages: string[];
  commands: { label: string; cmd: string }[];
  topDirs: string[];
}

/** Read a JSON file, returning {} on any error (never throws). */
function readJson(p: string): Record<string, unknown> {
  try { return JSON.parse(readFileSync(p, "utf8")) as Record<string, unknown>; } catch { return {}; }
}

/** Detect project facts from `cwd` — bounded to the top level + a shallow language scan. */
export function detectProject(cwd: string): ProjectFacts {
  const facts: ProjectFacts = { name: basename(cwd) || "project", languages: [], commands: [], topDirs: [] };

  // Name / description / commands from the ecosystem manifest.
  const pkgPath = join(cwd, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = readJson(pkgPath);
    if (typeof pkg.name === "string" && pkg.name) facts.name = pkg.name;
    if (typeof pkg.description === "string" && pkg.description) facts.description = pkg.description;
    const scripts = (pkg.scripts && typeof pkg.scripts === "object" ? pkg.scripts : {}) as Record<string, string>;
    for (const key of ["dev", "build", "test", "lint", "start"]) {
      if (scripts[key]) facts.commands.push({ label: key, cmd: `npm run ${key}` });
    }
  } else if (existsSync(join(cwd, "pyproject.toml")) || existsSync(join(cwd, "requirements.txt"))) {
    if (!facts.description) facts.description = "Python project";
  } else if (existsSync(join(cwd, "Cargo.toml"))) {
    facts.commands.push({ label: "build", cmd: "cargo build" }, { label: "test", cmd: "cargo test" });
  } else if (existsSync(join(cwd, "go.mod"))) {
    facts.commands.push({ label: "build", cmd: "go build ./..." }, { label: "test", cmd: "go test ./..." });
  }

  // Top-level dirs + a shallow language tally (top level + one level into each source-ish dir).
  const langCount = new Map<string, number>();
  const tallyExt = (file: string): void => {
    const ext = file.split(".").pop()?.toLowerCase();
    const lang = ext && CODE_EXT[ext];
    if (lang) langCount.set(lang, (langCount.get(lang) ?? 0) + 1);
  };
  let entries: string[] = [];
  try { entries = readdirSync(cwd); } catch { /* unreadable cwd → thin file */ }
  for (const e of entries) {
    const full = join(cwd, e);
    let isDir = false;
    try { isDir = statSync(full).isDirectory(); } catch { continue; }
    if (isDir) {
      if (SKIP_DIRS.has(e) || e.startsWith(".")) continue;
      facts.topDirs.push(e);
      try {
        for (const f of readdirSync(full)) {
          try { if (statSync(join(full, f)).isFile()) tallyExt(f); } catch { /* skip */ }
        }
      } catch { /* skip unreadable dir */ }
    } else {
      tallyExt(e);
    }
  }
  facts.languages = [...langCount.entries()].sort((a, b) => b[1] - a[1]).map(([l]) => l);
  facts.topDirs.sort();
  return facts;
}

/** Render a starter AGENTS.md from detected facts. Deterministic; safe to diff/regenerate. */
export function generateAgentsMd(cwd: string): string {
  const f = detectProject(cwd);
  const lines: string[] = [];
  lines.push(`# ${f.name}`, "");
  lines.push(f.description ?? "_One-line description of what this project does._", "");
  lines.push("## Stack");
  lines.push(f.languages.length ? `- Languages: ${f.languages.join(", ")}` : "- Languages: _add the main languages_");
  if (f.topDirs.length) lines.push(`- Layout: ${f.topDirs.map((d) => `\`${d}/\``).join(", ")}`);
  lines.push("");
  lines.push("## Commands");
  if (f.commands.length) for (const c of f.commands) lines.push(`- ${c.label}: \`${c.cmd}\``);
  else lines.push("- _add build/test/run commands here_");
  lines.push("");
  lines.push("## Conventions");
  lines.push("- _House rules for this repo: style, patterns to follow, things never to touch._");
  lines.push("- _ORIRO reads this file automatically each session — keep it short and current._");
  lines.push("");
  return lines.join("\n");
}

export interface InitResult {
  path: string;
  created: boolean; // false → already existed, left untouched
  facts: ProjectFacts;
}

/**
 * Write AGENTS.md to `cwd` unless one already exists (never clobbers the user's file). Pass
 * `force` to overwrite. Returns the path + whether it was created + the detected facts.
 */
export function writeAgentsMd(cwd: string = process.cwd(), force = false): InitResult {
  const path = join(cwd, "AGENTS.md");
  const facts = detectProject(cwd);
  if (existsSync(path) && !force) return { path, created: false, facts };
  writeFileSync(path, generateAgentsMd(cwd), "utf8");
  return { path, created: true, facts };
}
