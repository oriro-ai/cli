// V0.3.3 — `/init` slash: scaffold AGENTS.md for the current project (see context/init-agents.ts).
// Never clobbers an existing file unless `/init --force`. Reports what was detected so the user
// knows the starter is grounded in the real repo, then that ORIRO reads it back next turn.
import { writeAgentsMd } from "../context/init-agents.js";
import { accent, dim, fgHex, PALETTE } from "../ui/theme.js";

export function isInitSlash(cmd: string): boolean {
  return /^\/init(\s|$)/i.test(cmd.trim());
}

/** Handle `/init [--force]`. Pure of I/O errors — writeAgentsMd is bounded and safe. */
export function handleInit(cmd: string, cwd: string = process.cwd()): string[] {
  const force = /(^|\s)--force(\s|$)/i.test(cmd);
  let res;
  try {
    res = writeAgentsMd(cwd, force);
  } catch (e) {
    return [`  ${fgHex(PALETTE.error, "init failed")}: ${dim(e instanceof Error ? e.message : String(e))}`];
  }
  const lines: string[] = [];
  if (!res.created) {
    lines.push(`  ${dim("AGENTS.md already exists")} ${accent(res.path)} ${dim("— use /init --force to overwrite.")}`);
    return lines;
  }
  const f = res.facts;
  lines.push(`  ${fgHex(PALETTE.success, "✓ wrote")} ${accent(res.path)}`);
  lines.push(dim(`    detected: ${f.languages.length ? f.languages.join(", ") : "no languages"}` +
    `${f.commands.length ? ` · ${f.commands.length} command${f.commands.length === 1 ? "" : "s"}` : ""}` +
    `${f.topDirs.length ? ` · ${f.topDirs.length} dir${f.topDirs.length === 1 ? "" : "s"}` : ""}`));
  lines.push(dim("    edit it to add house rules — ORIRO reads it automatically each session."));
  return lines;
}
