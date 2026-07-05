// Unit test for V0.3.4 sessions (src/sessions/store.ts + src/repl-ui/slash-sessions.ts). tsx.
// Run: tsx scripts/test-sessions.ts   — uses a throwaway ORIRO_STATE_DIR so real ~/.oriro is untouched.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "oriro-sess-"));
process.env.ORIRO_STATE_DIR = tmp; // must be set BEFORE importing store (oriroDir reads it)

const { shortWhen, formatSessionList, sessionRows, resolveSessionManager, sessionsDir } = await import("../src/sessions/store.js");
const { isSessionsSlash, isUndoSlash } = await import("../src/repl-ui/slash-sessions.js");

let fails = 0;
function ok(cond: boolean, label: string): void {
  process.stdout.write(`${cond ? "✅" : "❌"} ${label}\n`);
  if (!cond) fails++;
}

// slash recognition
ok(isSessionsSlash("/sessions") && isSessionsSlash("/session"), "recognizes /sessions and /session");
ok(isUndoSlash("/undo"), "recognizes /undo");
ok(!isSessionsSlash("/sessionx") && !isUndoSlash("/undoing"), "word-boundary: no false matches");

// sessionsDir honors ORIRO_STATE_DIR
ok(sessionsDir().startsWith(tmp), "sessionsDir under ORIRO_STATE_DIR (local, isolated)");

// shortWhen format
{
  const d = new Date(2026, 6, 4, 9, 5); // Jul 04 09:05
  ok(shortWhen(d) === "Jul 04 09:05", "shortWhen formats 'Mon DD HH:MM' zero-padded");
}

// formatSessionList: empty → helpful, non-throwing
{
  const empty = formatSessionList([]);
  ok(empty.length === 1 && empty[0]!.includes("no saved sessions"), "empty list → helpful hint");
}
// formatSessionList + sessionRows with fabricated SessionInfo-shaped rows
{
  const infos = [
    { path: "/x/a.jsonl", id: "abcdef1234567890", cwd: "/proj", created: new Date(2026, 6, 4, 8, 0), modified: new Date(2026, 6, 4, 10, 0), messageCount: 12, firstMessage: "fix the auth bug", allMessagesText: "" },
    { path: "/x/b.jsonl", id: "99aa88bb77cc66dd", cwd: "/proj", created: new Date(2026, 6, 3, 8, 0), modified: new Date(2026, 6, 3, 9, 0), messageCount: 3, firstMessage: "add a button", allMessagesText: "" },
  ] as unknown as Parameters<typeof formatSessionList>[0];
  const lines = formatSessionList(infos);
  const joined = lines.join("\n");
  ok(joined.includes("abcdef12") && joined.includes("fix the auth bug"), "renders short id + first message");
  ok(joined.includes("12 msg") && joined.includes("2 session"), "renders message count + footer count");
  ok(joined.includes("oriro -c") && joined.includes("oriro --resume"), "footer shows resume hints");

  const rows = sessionRows(infos);
  ok(rows.length === 2 && rows[0]!.id === "abcdef1234567890" && rows[0]!.messages === 12, "sessionRows maps id + messages");
  ok(typeof rows[0]!.modified === "string" && (rows[0]!.modified as string).includes("2026"), "sessionRows serializes modified to ISO");
}

// resolveSessionManager: ephemeral + default notes; resume-miss throws helpfully
{
  const eph = await resolveSessionManager(tmp, { ephemeral: true });
  ok(eph.note.includes("NOT saved"), "ephemeral → 'NOT saved' note");
  const fresh = await resolveSessionManager(tmp, {});
  ok(fresh.note.includes("new session") && !!fresh.sm, "default → persisted new session + SM returned");
  let threw = "";
  try { await resolveSessionManager(tmp, { resumeId: "doesnotexist" }); } catch (e) { threw = e instanceof Error ? e.message : String(e); }
  ok(threw.includes("no session") && threw.includes("doesnotexist"), "resume unknown id → helpful throw");
}

rmSync(tmp, { recursive: true, force: true });
process.stdout.write(fails === 0 ? "\nsessions: ALL PASS\n" : `\nsessions: ${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
