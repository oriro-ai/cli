// V0.3.4 — session continuity. Until now assembleOriroSession used SessionManager.inMemory(), so every
// session vanished on exit ("start it, lose it"). This persists sessions LOCALLY under ~/.oriro/sessions
// (on-device, never uploaded — same footprint as the Scribe journal, Cardinal Rule 2) and resolves the
// right SessionManager for a fresh / continued / resumed / forked launch. List + resume + fork all ride
// the Pi harness's own SessionManager — we don't re-implement the session tree.
import { join } from "node:path";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import type { SessionInfo } from "@earendil-works/pi-coding-agent";
import { oriroDir } from "../config/paths.js";
import { accent, dim, fgHex, PALETTE } from "../ui/theme.js";

/** Where session JSONL trees live — local, per-machine, never synced. */
export function sessionsDir(): string {
  return join(oriroDir(), "sessions");
}

export interface ResumeOpts {
  /** -c/--continue: pick up the most recent session for this cwd. */
  continue?: boolean;
  /** --resume <id>: reopen a specific session (id or unique prefix). */
  resumeId?: string;
  /** --fork <id>: branch a new session from an existing one. */
  forkId?: string;
  /** --no-session: don't persist (ephemeral, privacy). */
  ephemeral?: boolean;
}

export interface ResolvedSession {
  sm: SessionManager;
  note: string;
}

/** Find a session by exact id or unique id-prefix; throws a helpful error if absent/ambiguous. */
async function findByIdPrefix(cwd: string, idish: string, verb: string): Promise<SessionInfo> {
  const infos = await SessionManager.list(cwd, sessionsDir());
  const exact = infos.find((s) => s.id === idish);
  if (exact) return exact;
  const pref = infos.filter((s) => s.id.startsWith(idish));
  if (pref.length === 1) return pref[0] as SessionInfo;
  if (pref.length > 1) throw new Error(`'${idish}' matches ${pref.length} sessions — use a longer id (oriro sessions)`);
  throw new Error(`no session '${idish}' to ${verb} here — see: oriro sessions`);
}

/**
 * Resolve the SessionManager for a launch. Default = a fresh PERSISTED session. Async only because
 * resume/fork by id must read the session list first.
 */
export async function resolveSessionManager(cwd: string, opts: ResumeOpts = {}): Promise<ResolvedSession> {
  const dir = sessionsDir();
  if (opts.ephemeral) return { sm: SessionManager.inMemory(cwd), note: "ephemeral — this session is NOT saved" };
  if (opts.continue) return { sm: SessionManager.continueRecent(cwd, dir), note: "continuing your most recent session" };
  if (opts.resumeId) {
    const hit = await findByIdPrefix(cwd, opts.resumeId, "resume");
    return { sm: SessionManager.open(hit.path, dir), note: `resumed ${hit.id.slice(0, 8)} (${hit.messageCount} msgs)` };
  }
  if (opts.forkId) {
    const hit = await findByIdPrefix(cwd, opts.forkId, "fork");
    return { sm: SessionManager.forkFrom(hit.path, cwd, dir), note: `forked a new session from ${hit.id.slice(0, 8)}` };
  }
  return { sm: SessionManager.create(cwd, dir), note: "new session (saved locally — resume with `oriro -c`)" };
}

/** List sessions for a cwd (most-recent first), newest by modified time. */
export async function listSessions(cwd: string = process.cwd()): Promise<SessionInfo[]> {
  const infos = await SessionManager.list(cwd, sessionsDir());
  return infos.sort((a, b) => b.modified.getTime() - a.modified.getTime());
}

/** A short, human date like "Jul 04 14:22" (local). Pure. */
export function shortWhen(d: Date): string {
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()] ?? "";
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${mon} ${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Render the session list for the REPL / `oriro sessions` (text mode). Pure + testable. */
export function formatSessionList(infos: SessionInfo[]): string[] {
  if (!infos.length) return [dim("  no saved sessions yet — they're created as you chat. Resume the last with `oriro -c`.")];
  const lines: string[] = [];
  for (const s of infos) {
    const id = s.id.slice(0, 8);
    const first = (s.firstMessage ?? s.name ?? "(empty)").replace(/\s+/g, " ").trim().slice(0, 56);
    lines.push(`  ${accent(id)} ${dim(shortWhen(s.modified).padEnd(12))} ${dim(`${String(s.messageCount).padStart(3)} msg`)}  ${first}`);
  }
  lines.push(dim(`  ${infos.length} session${infos.length === 1 ? "" : "s"} · resume: `) + accent("oriro --resume <id>") + dim(" · continue last: ") + accent("oriro -c"));
  return lines;
}

/** Machine rows for `oriro sessions --output json|csv` (shared with the CLI output renderer). */
export function sessionRows(infos: SessionInfo[]): Record<string, unknown>[] {
  return infos.map((s) => ({
    id: s.id, messages: s.messageCount, modified: s.modified.toISOString(),
    cwd: s.cwd, first: (s.firstMessage ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
  }));
}

export { fgHex, PALETTE };
