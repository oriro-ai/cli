// ORIRO Scribe — capture orchestrator. One straight line:
//   render turn → redact → durable append → update digest + timeline → self-audit.
// Hot-path and guaranteed; oversized content is kept in full in a side artifact
// (referenced + excerpted) so the journal file stays bounded but nothing is lost.
import { closeSync, fsyncSync, mkdirSync, openSync, writeSync } from "node:fs";
import { join } from "node:path";
import { readDigest, updateDigest, updateTimeline } from "./digest.js";
import { appendJournal, readJournal } from "./journal.js";
import { artifactsDir } from "./paths.js";
import { containsSecret, redact, type RedactionSummary } from "./redact.js";

const INLINE_CAP = 4000; // chars; larger fields are side-filed and referenced

export interface TurnRecord {
  /** ISO timestamp; caller supplies it (runtime has real time). */
  ts: string;
  /** YYYY-MM-DD bucket for the dated journal. */
  date: string;
  user?: string;
  router?: string;
  tools?: string[];
  files?: string[];
  note?: string;
  /** Optional context refresh (who/where/goal) for the digest. */
  context?: string;
}

export interface CaptureResult {
  journalDate: string;
  redactions: RedactionSummary[];
  bytes: number;
  auditClean: boolean;
}

function sideFile(date: string, ts: string, kind: string, full: string): string {
  mkdirSync(artifactsDir(), { recursive: true });
  const name = `${date}_${ts.replace(/[:.]/g, "-")}_${kind}.md`;
  const p = join(artifactsDir(), name);
  const fd = openSync(p, "w");
  try {
    writeSync(fd, full);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  return p;
}

function field(date: string, ts: string, label: string, value: string | undefined): string {
  if (!value || !value.trim()) return "";
  if (value.length > INLINE_CAP) {
    const ref = sideFile(date, ts, label.toLowerCase().replace(/\s+/g, "-"), value);
    return `**${label}** (full → ${ref}):\n${value.slice(0, INLINE_CAP)}\n…(truncated; full content in artifact)\n\n`;
  }
  return `**${label}:**\n${value}\n\n`;
}

function renderTurn(rec: TurnRecord): string {
  let md = `## ${rec.ts}\n\n`;
  md += field(rec.date, rec.ts, "User", rec.user);
  md += field(rec.date, rec.ts, "Router", rec.router);
  if (rec.tools?.length) md += `**Tools:** ${rec.tools.join(", ")}\n\n`;
  if (rec.files?.length) md += `**Files:** ${rec.files.join(", ")}\n\n`;
  md += field(rec.date, rec.ts, "Note", rec.note);
  return `${md}---\n`;
}

function oneLineSummary(rec: TurnRecord): string {
  const bits: string[] = [];
  if (rec.user) bits.push(rec.user.replace(/\s+/g, " ").slice(0, 80));
  if (rec.files?.length) bits.push(`files: ${rec.files.slice(0, 3).join(", ")}`);
  if (rec.note) bits.push(rec.note.replace(/\s+/g, " ").slice(0, 60));
  return bits.join(" · ") || "(activity)";
}

/** Redact EVERY raw field of a turn record ONCE, up front — BEFORE any truncation/summarization.
 *  (Truncating/whitespace-collapsing first defeated the multiline private-key and long-token
 *  patterns and leaked real key material into the digest/timeline/WAL.) Idempotent: re-redacting
 *  an already-redacted record is a no-op, so the WAL can safely store the redacted form. */
export function redactRecord(rec: TurnRecord): { rec: TurnRecord; redactions: RedactionSummary[] } {
  const tally = new Map<string, number>();
  const rd = (s: string | undefined): string | undefined => {
    if (!s) return s;
    const r = redact(s);
    for (const x of r.redactions) tally.set(x.label, (tally.get(x.label) ?? 0) + x.count);
    return r.text;
  };
  const safeRec: TurnRecord = {
    ...rec,
    user: rd(rec.user),
    note: rd(rec.note),
    router: rd(rec.router),
    context: rd(rec.context),
    files: rec.files?.map((f) => rd(f) ?? f),
  };
  return { rec: safeRec, redactions: [...tally.entries()].map(([label, count]) => ({ label, count })) };
}

/** Capture one turn into the journal + digest + timeline. Synchronous and durable. */
export function captureTurn(rec: TurnRecord): CaptureResult {
  const { rec: safeRec, redactions } = redactRecord(rec);

  const journal = renderTurn(safeRec);
  appendJournal(rec.date, `${journal}\n`);
  updateDigest(`${safeRec.ts} · ${oneLineSummary(safeRec)}`, safeRec.context);
  updateTimeline(safeRec.date, oneLineSummary(safeRec));

  // Self-audit across the stores we just wrote (journal AND digest), not just the journal.
  const auditClean = !containsSecret(readJournal(rec.date)) && !containsSecret(readDigest() ?? "");
  return {
    journalDate: rec.date,
    redactions,
    bytes: Buffer.byteLength(journal, "utf8"),
    auditClean,
  };
}

/** Re-export digest reader for the (5A.2) injection layer + command. */
export { readDigest };
