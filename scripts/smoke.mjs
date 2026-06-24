// Built-binary smoke gate. Runs the SHIPPED dist/cli.js (not source) so bundle-only bugs —
// duplicated shebang, wrong asset paths, swallowed unknown commands — can never ship silently.
// Source-running spikes cannot catch these (they resolve paths at source depth). Run: npm run smoke
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const bin = join(process.cwd(), "dist", "cli.js");
const state = mkdtempSync(join(tmpdir(), "oriro-smoke-"));
const env = { ...process.env, ORIRO_STATE_DIR: state, ORIRO_SCRIBE_DIR: state, ORIRO_SKILLS_DIR: "" };

let fails = 0;
function run(args, { expectExit = 0, contains } = {}) {
  const r = spawnSync(process.execPath, [bin, ...args], { encoding: "utf8", env, input: "" });
  // Strip ANSI so content checks aren't defeated by colour codes embedded mid-string.
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`.replace(/\x1b\[[0-9;]*m/g, "");
  const exitOk = r.status === expectExit;
  const textOk = contains ? out.includes(contains) : true;
  const ok = exitOk && textOk;
  if (!ok) fails++;
  const detail = !exitOk ? `exit ${r.status}≠${expectExit}` : !textOk ? `missing "${contains}"` : "";
  process.stdout.write(`${ok ? "✅" : "❌"} oriro ${args.join(" ") || "(repl)"}${detail ? `  — ${detail}` : ""}\n`);
}

run(["--version"], { contains: "0.1.0" });
run(["skills", "list"], { contains: "323 loaded" }); // bundle path must resolve the skills dir
run(["scribe", "status"], { contains: "Scriber" });
run(["connectors", "list"], { contains: "59 connectors" });
run(["routers", "list"], { contains: "active pool" });
run(["routers", "add", "oriro-gauss"], { expectExit: 1, contains: "coming soon" });
run(["channels", "start", "discord"], { expectExit: 0, contains: "not yet available" });
run(["bogus"], { expectExit: 1, contains: "unknown command" }); // must NOT fall through to the REPL
run(["--help"], { contains: "routers" });

process.stdout.write(`\nSMOKE: ${fails === 0 ? "PASS ✅" : `FAIL ❌ (${fails})`}\n`);
process.exit(fails === 0 ? 0 : 1);
