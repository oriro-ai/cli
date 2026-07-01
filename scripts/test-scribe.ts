// Scriber redaction tests — the memory layer must NEVER write a raw secret to disk. Feeds every
// secret shape through redact() AND end-to-end through supervisedCapture, then scans every on-disk
// store (journal, digest, timeline, WAL) for the raw value. Run: npx tsx scripts/test-scribe.ts
import { mkdtempSync, readFileSync, existsSync, readdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "scribe-test-"));
process.env.ORIRO_SCRIBE_DIR = dir; // set BEFORE importing modules that read the scribe path
writeFileSync(join(dir, "consent.json"), JSON.stringify({ enabled: true }));

const { redact } = await import("../src/scribe/redact.js");
const { supervisedCapture } = await import("../src/scribe/supervisor.js");

let fails = 0;
const ok = (m: string) => process.stdout.write(`✅ ${m}\n`);
const bad = (m: string) => { fails++; process.stdout.write(`❌ ${m}\n`); };

// [label, raw-secret, distinctive core that must NOT survive on disk]
const SECRETS: Array<[string, string, string]> = [
  ["openai sk-", "sk-abcdefghijklmnopqrstuvwxyz0123456789", "abcdefghijklmnop"],
  ["anthropic", "sk-ant-api03-abcdefghijklmnopqrstuvwxyz012345", "abcdefghijklmnop"],
  ["aws akia", "AKIAIOSFODNN7EXAMPLE", "AKIAIOSFODNN7EXA"],
  ["github pat", "ghp_abcdefghijklmnopqrstuvwxyz0123456789", "abcdefghijklmnop"],
  ["bearer", "Bearer abc123DEF456ghi789JKL012mno345PQRstu", "abc123DEF456ghi7"],
  ["basic", "Authorization: Basic dXNlcjpwYXNzd29yZDEyMzQ1", "dXNlcjpwYXNzd29y"],
  ["password=", "password=hunter2supersecretvalue", "hunter2supersecr"],
  ["private-key", "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA1234567890abcdefXYZ\n-----END RSA PRIVATE KEY-----", "MIIEpAIBAAKCAQEA"],
  ["url-cred", "postgres://dbuser:dbpass123secret@db.example.com/db", "dbpass123secret"],
  ["32-char token", "tokAbCdEf0123456789xQpZmKw01234567", "tokAbCdEf0123456"],
  ["jwt", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghij", "eyJhbGciOiJIUzI1"],
];

// 1) redact() unit — the core must be gone.
for (const [label, secret, core] of SECRETS) {
  const out = redact(`note: my secret is ${secret} end`).text;
  out.includes(core) ? bad(`redact leak: ${label} (core "${core}" survives)`) : ok(`redact ${label}`);
}

// 2) End-to-end — capture each turn, then scan EVERY file on disk.
SECRETS.forEach(([_l, secret], i) => {
  supervisedCapture({ ts: `2026-06-26T00:00:${String(i).padStart(2, "0")}.000Z`, date: "2026-06-26", user: `remember ${secret}`, note: `acknowledged ${secret}`, router: "oriro-free" });
});
const leaks: string[] = [];
for (const f of readdirSync(dir)) {
  const content = readFileSync(join(dir, f), "utf8");
  for (const [label, _s, core] of SECRETS) if (content.includes(core)) leaks.push(`${f}:${label}`);
}
leaks.length ? bad(`ON-DISK LEAK: ${leaks.join(", ")}`) : ok("no raw secret on disk (journal/digest/timeline/WAL)");

// 2b) Private key SPLIT across fields (head in user, tail in note) — no fragment may reach disk.
supervisedCapture({ ts: "2026-06-26T01:00:00.000Z", date: "2026-06-26",
  user: "-----BEGIN RSA PRIVATE KEY-----\nMIIEhalfUNIQtopKEYxyz0123456789",
  note: "tailUNIQbottomKEYmaterial987654\n-----END RSA PRIVATE KEY-----" });
const splitLeaks: string[] = [];
for (const f of readdirSync(dir)) { const c = readFileSync(join(dir, f), "utf8"); for (const core of ["halfUNIQtopKEY", "tailUNIQbottomKEY"]) if (c.includes(core)) splitLeaks.push(`${f}:${core}`); }
splitLeaks.length ? bad(`split-field PEM leak: ${splitLeaks.join(", ")}`) : ok("split-field private key — no fragment on disk");

// 3) WAL is compacted on the success path (not an unbounded plaintext transcript).
const wal = join(dir, "_wal.jsonl");
const walBytes = existsSync(wal) ? readFileSync(wal, "utf8").trim().length : 0;
walBytes <= 4 ? ok(`WAL compacted after ${SECRETS.length} commits (${walBytes} bytes)`) : bad(`WAL not compacted: ${walBytes} bytes (raw transcript risk)`);

// 4) Legit content is NOT mangled (no false-positive over-redaction of ordinary text/SHAs).
const legit = redact("Refactored parseConfig() in src/app.ts; commit a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2 fixes the bug.").text;
legit.includes("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2") && legit.includes("parseConfig") ? ok("legit text + git SHA preserved") : bad(`over-redacted legit text: ${legit.slice(0, 80)}`);

// 5) Claude Code transcript adapter — distil the latest turn + scope guard.
const { lastTurnFromTranscript, shouldCapture, parseHookStdin } = await import("../src/scribe/transcript.js");
const transcript = join(dir, "transcript.jsonl");
writeFileSync(transcript, [
  JSON.stringify({ type: "user", timestamp: "2026-06-30T00:00:00.000Z", message: { role: "user", content: "fix the scribe bug" } }),
  JSON.stringify({ type: "assistant", timestamp: "2026-06-30T00:00:01.000Z", message: { role: "assistant", content: [
    { type: "text", text: "Editing the file; my key is sk-ant-api03-TRANSCRIPTLEAKzzzzzzzzzz012345 oops" },
    { type: "tool_use", name: "Edit", input: { file_path: "src/scribe/transcript.ts" } },
  ] } }),
].join("\n") + "\n");
const turn = lastTurnFromTranscript(transcript);
turn?.user === "fix the scribe bug" ? ok("transcript: user text extracted") : bad(`transcript user: ${turn?.user}`);
turn?.tools?.includes("Edit") ? ok("transcript: tool name extracted") : bad(`transcript tools: ${turn?.tools}`);
turn?.files?.includes("src/scribe/transcript.ts") ? ok("transcript: file path extracted") : bad(`transcript files: ${turn?.files}`);
// End-to-end: the secret in the transcript must be redacted before disk.
if (turn) supervisedCapture({ ts: turn.ts ?? "2026-06-30T00:00:02.000Z", date: "2026-06-30", user: turn.user, note: turn.note, tools: turn.tools, files: turn.files });
let tLeak = false;
for (const f of readdirSync(dir)) { if (f.endsWith(".jsonl")) continue; if (readFileSync(join(dir, f), "utf8").includes("TRANSCRIPTLEAK")) tLeak = true; }
tLeak ? bad("transcript secret leaked to disk") : ok("transcript secret redacted before disk");
// parseHookStdin tolerance + scope guard.
parseHookStdin('{"transcript_path":"x","cwd":"y","stop_hook_active":true}').stopHookActive === true ? ok("hook stdin parsed") : bad("hook stdin parse");
parseHookStdin("not json").stopHookActive === false ? ok("hook stdin junk-tolerant") : bad("hook stdin junk");
delete process.env.ORIRO_SCRIBE_ONLY;
shouldCapture("C:/Users/vinay/Downloads") === true ? ok("scope: default captures all") : bad("scope default");
process.env.ORIRO_SCRIBE_ONLY = "1";
shouldCapture("C:/Users/vinay/Downloads") === false ? ok("scope: ONLY excludes non-oriro") : bad("scope only-exclude");
shouldCapture("C:/Users/vinay/orirocli") === true ? ok("scope: ONLY allows oriro path") : bad("scope only-allow");
delete process.env.ORIRO_SCRIBE_ONLY;

rmSync(dir, { recursive: true, force: true });
process.stdout.write(`\n${fails === 0 ? "SCRIBE TESTS: PASS ✅" : `SCRIBE TESTS: FAIL ❌ (${fails})`}\n`);
process.exit(fails === 0 ? 0 : 1);
