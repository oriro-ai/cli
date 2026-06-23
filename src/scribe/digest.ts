// ORIRO Scribe — the "markdown of the markdown": a small, always-current digest
// distilled from the full journal, hard size-capped so it is always injectable
// "in a flash"; plus the compact full-history timeline (≈one line per day, day
// one → today) so the router can never forget that something happened.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { digestFile, scribeDir, timelineFile } from "./paths.js";

const DIGEST_CAP = 8192; // bytes — bounded so injection never bloats the prompt
const TIMELINE_DAY_CAP = 400; // chars per day line — keeps the skeleton tiny

function read(file: string): string {
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}

/** Prepend a recent-activity line to the digest and trim to the cap (newest kept). */
export function updateDigest(summary: string, context?: string): void {
  mkdirSync(scribeDir(), { recursive: true });
  const existing = read(digestFile());

  // Preserve an existing Context block unless a new one is supplied.
  let contextBlock = context?.trim();
  if (!contextBlock) {
    const m = existing.match(/## Context\n([\s\S]*?)\n## /);
    contextBlock = m?.[1]?.trim() ?? "_(not set yet)_";
  }

  const recentMatch = existing.match(/## Recent activity[^\n]*\n([\s\S]*)$/);
  const priorRecent = recentMatch?.[1]?.trim() ?? "";
  let recent = summary.trim() ? `- ${summary.trim()}\n${priorRecent}` : priorRecent;

  const header = `# ORIRO Scribe — Digest\n\n## Context\n${contextBlock}\n\n## Recent activity (newest first)\n`;
  // Trim oldest recent lines until the whole file fits the cap.
  let out = header + recent;
  while (Buffer.byteLength(out, "utf8") > DIGEST_CAP && recent.includes("\n")) {
    recent = recent.slice(0, recent.lastIndexOf("\n")).trimEnd();
    out = header + recent;
  }
  writeFileSync(digestFile(), out, "utf8");
}

/** Add/merge a one-line topic under the given day in the timeline skeleton. */
export function updateTimeline(date: string, topic: string): void {
  mkdirSync(scribeDir(), { recursive: true });
  const clean = topic.replace(/\s+/g, " ").trim();
  if (!clean) return;
  const lines = read(timelineFile()).split("\n").filter(Boolean);
  const header = "# ORIRO Scribe — Timeline";
  const body = lines.filter((l) => l !== header);
  const idx = body.findIndex((l) => l.startsWith(`- ${date} ·`));
  if (idx === -1) {
    body.push(`- ${date} · ${clean}`.slice(0, TIMELINE_DAY_CAP + date.length + 6));
  } else {
    let merged = `${body[idx]}; ${clean}`;
    if (merged.length > TIMELINE_DAY_CAP) merged = `${merged.slice(0, TIMELINE_DAY_CAP)}…`;
    body[idx] = merged;
  }
  body.sort(); // dates sort chronologically as YYYY-MM-DD
  writeFileSync(timelineFile(), `${header}\n${body.join("\n")}\n`, "utf8");
}

/** Read the current digest (for injection / the scribe command). */
export function readDigest(): string {
  return read(digestFile());
}

/** Read the timeline skeleton (for injection / the scribe command). */
export function readTimeline(): string {
  return read(timelineFile());
}
