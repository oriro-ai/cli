// UX-12 (2026-07-04): an artifact review surface for the terminal agent. Antigravity's headline is
// that the agent shows its work (plan / diffs / code) and the human approves before it lands. ORIRO
// already gates TOOL writes (Guardian + Plan/Accept-Edits postures); this adds the missing piece for
// work the model produces as TEXT — the code blocks and SVGs in a reply become numbered artifacts you
// can /review and then /save (approve → write to disk). Bounded + pure (extraction is unit-tested); it
// never auto-writes — saving is always an explicit, confirmed step.
export interface Artifact {
  kind: "code" | "svg";
  lang: string;           // "python", "svg", "" …
  content: string;
  suggestedName: string;  // e.g. "artifact-1.py"
}

const LANG_EXT: Record<string, string> = {
  python: "py", py: "py", javascript: "js", js: "js", typescript: "ts", ts: "ts",
  tsx: "tsx", jsx: "jsx", html: "html", css: "css", json: "json", yaml: "yaml", yml: "yml",
  bash: "sh", sh: "sh", shell: "sh", sql: "sql", go: "go", rust: "rs", rs: "rs", java: "java",
  c: "c", cpp: "cpp", "c++": "cpp", ruby: "rb", rb: "rb", php: "php", markdown: "md", md: "md", svg: "svg",
};

function extFor(lang: string): string {
  return LANG_EXT[lang.toLowerCase()] ?? "txt";
}

/** Extract fenced code blocks + top-level <svg> blocks from an assistant reply, in order. */
export function extractArtifacts(text: string): Artifact[] {
  const out: Artifact[] = [];
  if (!text) return out;

  // Fenced code blocks: ```lang\n … \n```
  const fence = /```([\w+#.-]*)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(text)) !== null) {
    const lang = (m[1] ?? "").trim();
    const content = (m[2] ?? "").replace(/\n$/, "");
    if (!content.trim()) continue;
    const isSvg = lang.toLowerCase() === "svg" || /^\s*<svg[\s>]/.test(content);
    out.push({
      kind: isSvg ? "svg" : "code",
      lang: lang || (isSvg ? "svg" : ""),
      content,
      suggestedName: `artifact-${out.length + 1}.${isSvg ? "svg" : extFor(lang)}`,
    });
  }

  // Bare top-level <svg>…</svg> not already inside a fence.
  const svg = /<svg[\s>][\s\S]*?<\/svg>/gi;
  while ((m = svg.exec(text)) !== null) {
    const content = m[0];
    if (out.some((a) => a.content.includes(content))) continue; // already captured via a fence
    out.push({ kind: "svg", lang: "svg", content, suggestedName: `artifact-${out.length + 1}.svg` });
  }

  return out;
}

// ── Per-session store: the artifacts from the most recent reply. ──
let current: Artifact[] = [];
export function setArtifacts(a: Artifact[]): void { current = a; }
export function getArtifacts(): Artifact[] { return current; }
