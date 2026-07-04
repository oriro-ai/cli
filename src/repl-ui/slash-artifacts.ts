// UX-12: /review + /save — the artifact review loop. /review lists the code/SVG artifacts from the
// last reply; /save <n> [path] writes one to disk (the explicit approve→apply step; typing /save IS
// the approval, and it never overwrites without a fresh path). Pure string-in/lines-out.
import { existsSync, writeFileSync } from "node:fs";
import { getArtifacts } from "./artifacts.js";
import { accent, dim, fgHex, PALETTE } from "../ui/theme.js";

export function isArtifactSlash(cmd: string): boolean {
  return /^\/(review|artifacts?|save)(\s|$)/i.test(cmd.trim());
}

export function handleArtifactSlash(raw: string): string[] {
  const parts = raw.trim().split(/\s+/);
  const head = (parts[0] ?? "").toLowerCase();
  const arts = getArtifacts();

  if (head === "/save") {
    const idx = parseInt(parts[1] ?? "", 10);
    if (!Number.isInteger(idx) || idx < 1 || idx > arts.length) {
      return [dim("  usage: /save <n> [path] — run /review to see the artifacts")];
    }
    const art = arts[idx - 1];
    if (!art) return [dim("  no such artifact")];
    const dest = parts[2] || art.suggestedName;
    if (existsSync(dest)) return [dim(`  ✗ ${dest} already exists — give a different path: /save ${idx} <path>`)];
    try {
      writeFileSync(dest, art.content, "utf8");
    } catch (e) {
      return [dim(`  ✗ could not write ${dest}: ${e instanceof Error ? e.message : String(e)}`)];
    }
    return [`  ${fgHex(PALETTE.success, "✓")} saved artifact ${accent(String(idx))} → ${accent(dest)} ${dim(`(${art.content.length} bytes)`)}`];
  }

  // /review or /artifacts
  if (!arts.length) return [dim("  no artifacts in the last reply — ask for code or an SVG, then /review")];
  const lines: string[] = [dim("  Artifacts from the last reply — save one with /save <n> [path]:")];
  arts.forEach((a, i) => {
    const nlines = a.content.split("\n").length;
    const preview = (a.content.split("\n")[0] ?? "").slice(0, 48).replace(/\s+/g, " ");
    lines.push(`    ${accent(String(i + 1))}. ${a.kind}${a.lang ? `/${a.lang}` : ""} · ${nlines} lines · → ${dim(a.suggestedName)}  ${dim(preview)}`);
  });
  return lines;
}
