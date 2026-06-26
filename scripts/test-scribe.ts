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

// 3) WAL is compacted on the success path (not an unbounded plaintext transcript).
const wal = join(dir, "_wal.jsonl");
const walBytes = existsSync(wal) ? readFileSync(wal, "utf8").trim().length : 0;
walBytes <= 4 ? ok(`WAL compacted after ${SECRETS.length} commits (${walBytes} bytes)`) : bad(`WAL not compacted: ${walBytes} bytes (raw transcript risk)`);

// 4) Legit content is NOT mangled (no false-positive over-redaction of ordinary text/SHAs).
const legit = redact("Refactored parseConfig() in src/app.ts; commit a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2 fixes the bug.").text;
legit.includes("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2") && legit.includes("parseConfig") ? ok("legit text + git SHA preserved") : bad(`over-redacted legit text: ${legit.slice(0, 80)}`);

rmSync(dir, { recursive: true, force: true });
process.stdout.write(`\n${fails === 0 ? "SCRIBE TESTS: PASS ✅" : `SCRIBE TESTS: FAIL ❌ (${fails})`}\n`);
process.exit(fails === 0 ? 0 : 1);
