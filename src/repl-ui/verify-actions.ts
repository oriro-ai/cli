// ORIRO — phantom-action guard. Weak keyless routers sometimes NARRATE tool use instead of doing
// it: they reply "Website files have been created ✅" without ever emitting a real write_file call,
// so nothing lands on disk. Rather than let the CLI mislead the user, we verify the claim against
// the filesystem: if the reply says it CREATED/WROTE/SAVED files that don't exist, we append a
// clear, honest warning (and point at BYOK for reliable tool use). Truth-checked, so it only fires
// on genuinely-absent claimed files — never on a real write or on mere suggestions.
import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

// Past-tense creation CLAIM (not a suggestion like "you can create" / "add a file").
const CLAIM = /\b(?:have|has)\s+been\s+created\b|\b(?:created|wrote|written|saved|generated)\b(?![ \t]*(?:by you|it yourself))/i;
const SUGGESTION = /\byou\s+(?:can|could|should|may)\s+(?:create|add|save|make|put)\b/i;

// File paths with a common code/text extension (absolute Windows/POSIX, ./ , or bare).
const PATH_RE =
  /(?:`|"|')?((?:[A-Za-z]:[\\/]|\.{0,2}[\\/])?[\w.\\/-]+\.(?:html?|css|json|m?[jt]sx?|py|md|txt|vue|svelte|go|rs|java|rb|php|sh|ya?ml|sql|toml|env|cpp|hpp|[ch])(?![A-Za-z0-9]))(?:`|"|')?/gi;

/**
 * Returns a warning string if the reply CLAIMS to have created files that are not on disk.
 * Empty string when there's nothing amiss (no claim, or every claimed file actually exists).
 */
export function phantomFileWarning(reply: string, cwd: string = process.cwd()): string {
  if (!reply || !CLAIM.test(reply)) return "";
  const missing = new Set<string>();
  for (const m of reply.matchAll(PATH_RE)) {
    const p = m[1];
    if (!p) continue;
    // ignore obvious non-targets (urls, node_modules, placeholders)
    if (/^https?:|node_modules|<[^>]+>|your-|example\./i.test(p)) continue;
    const abs = isAbsolute(p) ? p : resolve(cwd, p.replace(/^[.][\\/]/, ""));
    if (!existsSync(abs)) missing.add(p);
  }
  if (missing.size === 0) return "";
  // Only warn when a claim is present AND it isn't purely a "you can create" suggestion.
  if (SUGGESTION.test(reply) && !/\b(?:have|has)\s+been\s+created\b/i.test(reply)) return "";
  const list = [...missing].slice(0, 5).join(", ");
  const plural = missing.size > 1;
  return (
    `\n⚠ ORIRO said it ${plural ? "created files" : "created a file"} (${list}), but ` +
    `${plural ? "they're" : "it's"} not on disk — the free router may have described the write ` +
    `without actually running it. Retry, or add your own key with \`oriro routers\` for reliable coding.`
  );
}
