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

/** Capture one turn into the journal + digest + timeline. Synchronous and durable. */
export function captureTurn(rec: TurnRecord): CaptureResult {
  const safe = redact(renderTurn(rec));
  appendJournal(rec.date, `${safe.text}\n`);

  const summary = redact(`${rec.ts} · ${oneLineSummary(rec)}`).text;
  updateDigest(summary, rec.context ? redact(rec.context).text : undefined);
  updateTimeline(rec.date, redact(oneLineSummary(rec)).text);

  // Self-audit: re-scan what we just wrote; flag (don't crash) if anything slipped.
  const auditClean = !containsSecret(readJournal(rec.date));
  return {
    journalDate: rec.date,
    redactions: safe.redactions,
    bytes: Buffer.byteLength(safe.text, "utf8"),
    auditClean,
  };
}

/** Re-export digest reader for the (5A.2) injection layer + command. */
export { readDigest };
