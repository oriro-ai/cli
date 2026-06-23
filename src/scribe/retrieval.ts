// ORIRO Scribe — retrieval (5A.4). The router/user can pull any past entry on demand:
// the timeline skeleton (every day, injected) + full-text search across all journals +
// direct day reads. Deterministic, local, model-agnostic — works for any router.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { journalFile, scribeDir } from "./paths.js";

export interface ScribeHit {
  date: string;
  line: number;
  text: string;
}

/** All recorded days (YYYY-MM-DD), oldest → newest. */
export function listDays(): string[] {
  const dir = scribeDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
    .map((f) => f.replace(/\.md$/, ""))
    .sort();
}

/** Full text of one day's journal (empty string if none). */
export function readDay(date: string): string {
  const f = journalFile(date);
  return existsSync(f) ? readFileSync(f, "utf8") : "";
}

/** Case-insensitive full-text search across every day's journal (newest-first scan). */
export function searchScribe(query: string, limit = 100): ScribeHit[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const hits: ScribeHit[] = [];
  for (const date of listDays().reverse()) {
    const lines = readDay(date).split("\n");
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      if (ln && ln.toLowerCase().includes(q)) {
        hits.push({ date, line: i + 1, text: ln.trim().slice(0, 200) });
        if (hits.length >= limit) return hits;
      }
    }
  }
  return hits;
}
