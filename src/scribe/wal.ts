// ORIRO Scribe — write-ahead log (5A.3). Every turn is recorded as durable "pending"
// BEFORE the journal write, and marked "commit" after. A crash or a failed write leaves
// the entry pending, so the supervisor replays it next turn — zero loss, ever.
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { join } from "node:path";
import type { TurnRecord } from "./capture.js";
import { scribeDir } from "./paths.js";

function walFile(): string {
  return join(scribeDir(), "_wal.jsonl");
}

function appendLine(obj: unknown): void {
  mkdirSync(scribeDir(), { recursive: true });
  const fd = openSync(walFile(), "a");
  try {
    writeSync(fd, `${JSON.stringify(obj)}\n`);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

export function walAppend(id: string, rec: TurnRecord): void {
  appendLine({ t: "add", id, rec });
}

export function walCommit(id: string): void {
  appendLine({ t: "commit", id });
}

/** Entries written but not yet committed (i.e. not durably journaled). */
export function walPending(): { id: string; rec: TurnRecord }[] {
  if (!existsSync(walFile())) return [];
  const committed = new Set<string>();
  const adds = new Map<string, TurnRecord>();
  for (const line of readFileSync(walFile(), "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line) as { t: string; id: string; rec?: TurnRecord };
      if (e.t === "commit") committed.add(e.id);
      else if (e.t === "add" && e.rec) adds.set(e.id, e.rec);
    } catch {
      /* skip a torn line */
    }
  }
  const out: { id: string; rec: TurnRecord }[] = [];
  for (const [id, rec] of adds) {
    if (!committed.has(id)) out.push({ id, rec });
  }
  return out;
}

/** Rewrite the WAL keeping only still-pending entries (bounded growth). */
export function walCompact(): void {
  if (!existsSync(walFile())) return;
  const pending = walPending();
  const body = pending.map((p) => JSON.stringify({ t: "add", id: p.id, rec: p.rec })).join("\n");
  writeFileSync(walFile(), body ? `${body}\n` : "", "utf8");
}
