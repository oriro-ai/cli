// Built-binary smoke gate. Runs the SHIPPED dist/cli.js (not source) so bundle-only bugs —
// duplicated shebang, wrong asset paths, swallowed unknown commands — can never ship silently.
// Source-running spikes cannot catch these (they resolve paths at source depth). Run: npm run smoke
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const bin = join(process.cwd(), "dist", "cli.js");
const version = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")).version;
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

run(["--version"], { contains: version }); // read from package.json — never drifts on a version bump
run(["skills", "list"], { contains: "323 loaded" }); // bundle path must resolve the skills dir
run(["scribe", "status"], { contains: "Scriber" });
run(["connectors", "list"], { contains: "59 connectors" });
run(["routers", "list"], { contains: "active pool" });
run(["routers", "add", "oriro-gauss"], { expectExit: 1, contains: "coming soon" });
run(["channels", "add", "discord", "not-a-token"], { expectExit: 1, contains: "rejected" }); // bad token refused
run(["channels", "start", "discord"], { expectExit: 1, contains: "no discord bot configured" });
run(["channels", "start", "whatsapp"], { expectExit: 0, contains: "ToS" }); // refused without --accept-risk
run(["bogus"], { expectExit: 1, contains: "unknown command" }); // must NOT fall through to the REPL
run(["language", "es"], { expectExit: 0, contains: "terminal language" }); // onboarding hints `oriro language` — must exist
run(["language", "Spanish"], { expectExit: 0, contains: "terminal language" }); // by NAME (help promises code OR name)
run(["language", "--all"], { expectExit: 0, contains: "Languages" });
run(["language", "zzz"], { expectExit: 1, contains: "unknown language" });
run(["avatar", "--list"], { expectExit: 0, contains: "" }); // onboarding hints `oriro avatar` — must exist
run(["avatar", "not-a-real-avatar"], { expectExit: 1, contains: "unknown avatar" });
run(["connectors", "list", "ZzzNotACategory"], { expectExit: 0, contains: "unknown category" }); // category validated
run(["connectors", "remove", "never-added-xyz"], { expectExit: 0, contains: "nothing to remove" }); // no false-positive remove
run(["--help"], { contains: "routers" });

process.stdout.write(`\nSMOKE: ${fails === 0 ? "PASS ✅" : `FAIL ❌ (${fails})`}\n`);
process.exit(fails === 0 ? 0 : 1);
