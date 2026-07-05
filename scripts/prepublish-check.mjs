// PRE-PUBLISH GATE. Runs on `npm publish` (via the prepublishOnly script) AFTER build + smoke.
// Its one job: make it IMPOSSIBLE to publish anything except today's clean greenfield CLI — no
// src/, no spikes, no test fixtures, no old-fork ("openclaw"/"orirohub") content, no stray files.
// Any failure exits non-zero and aborts the publish.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const fail = (m) => { process.stderr.write(`❌ PUBLISH BLOCKED: ${m}\n`); process.exitCode = 1; };
const ok = (m) => process.stdout.write(`✅ ${m}\n`);
let bad = false;
const check = (cond, passMsg, failMsg) => { if (cond) ok(passMsg); else { fail(failMsg); bad = true; } };

// 1. The bundle exists and is the clean build.
const bundlePath = join(root, "dist", "cli.js");
check(existsSync(bundlePath), "dist/cli.js present", "dist/cli.js missing — run `npm run build`");
if (existsSync(bundlePath)) {
  const bundle = readFileSync(bundlePath, "utf8");
  const shebangs = (bundle.match(/#!\/usr\/bin\/env node/g) || []).length;
  check(shebangs === 1, "single shebang", `shebang count = ${shebangs} (must be exactly 1)`);
  for (const needle of ["spike-step", "spike-commands", "spike-channels", "_test-mcp", "openclaw", "orirohub"]) {
    check(!new RegExp(needle, "i").test(bundle), `bundle clean of "${needle}"`, `bundle contains "${needle}" — junk/old-fork leaked in`);
  }
  // P0-2 lane (incomplete on-device runtime) must NEVER ship. This is the automated version of the
  // manual "grep registerModelsCommand = 0" discipline — added after v0.3.9 leaked the lane because
  // a release was built without stashing it first. Markers cover its CLI commands + weights modules.
  for (const needle of ["registerModelsCommand", "registerLoginCommand", "node-llama-cpp", "weights/secure-load"]) {
    check(!bundle.includes(needle), `bundle clean of P0-2 "${needle}"`, `bundle contains P0-2 marker "${needle}" — stash the P0-2 lane (src/cli.ts + src/weights + src/commands/{login,models}.ts) and rebuild`);
  }
}

// 2. Package identity.
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
check(pkg.name === "@oriro/orirocli", `name = ${pkg.name}`, `name must be @oriro/orirocli (got ${pkg.name})`);
check(typeof pkg.version === "string" && pkg.version.length > 0, `version = ${pkg.version}`, "version missing");
check(pkg.bin?.oriro === "./dist/cli.js", "bin.oriro → ./dist/cli.js", `bin.oriro wrong: ${JSON.stringify(pkg.bin)}`);
check(pkg.publishConfig?.access === "public", "publishConfig.access = public", "publishConfig.access must be 'public' for a scoped package");

// 3. Skills actually ship — DYNAMIC: the on-disk count must equal what's COMMITTED to git. This
// adjusts automatically as the curated library grows/shrinks (no magic number to maintain) while
// still catching untracked cruft or a missing skill — so publishing always ships exactly the
// tracked set. (User-added skills live in ~/.oriro/skills at runtime and never enter this bundle.)
const skillsDir = join(root, "skills");
let skillCount = 0;
const walk = (d) => { for (const e of readdirSync(d)) { const p = join(d, e); statSync(p).isDirectory() ? walk(p) : (e === "SKILL.md" && skillCount++); } };
if (existsSync(skillsDir)) walk(skillsDir);
let committedSkills = 0;
try {
  committedSkills = execFileSync("git", ["ls-files", "skills"], { cwd: root, encoding: "utf8", shell: process.platform === "win32" })
    .split("\n").filter((f) => f.endsWith("SKILL.md")).length;
} catch { committedSkills = skillCount; } // no git (e.g. from a tarball) → trust the on-disk set
check(skillCount > 0 && skillCount === committedSkills, `skills shipping: ${skillCount} (matches git)`, `on-disk skills = ${skillCount} but ${committedSkills} committed — untracked/missing skills; publish from a clean tree`);

// 4. The packed file list is EXACTLY the allowed set — the real guarantee of what reaches users.
const ALLOWED = (p) => p === "package.json" || p === "README.md" || p === "LICENSE" || p === "ATTRIBUTION.md" || p === "dist/cli.js" || p.startsWith("skills/");
try {
  // --ignore-scripts so the `prepare` build doesn't print into the --json output; slice from the
  // first "[" to drop any leading npm notice noise before parsing.
  const out = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: root, encoding: "utf8", shell: process.platform === "win32" });
  const json = out.slice(out.indexOf("["));
  const files = (JSON.parse(json)[0]?.files ?? []).map((f) => f.path.replace(/\\/g, "/"));
  const stray = files.filter((f) => !ALLOWED(f));
  check(stray.length === 0, `tarball file list clean (${files.length} files, all whitelisted)`, `tarball would ship disallowed files: ${stray.slice(0, 10).join(", ")}`);
} catch (e) {
  fail(`could not run \`npm pack --dry-run\`: ${e instanceof Error ? e.message : String(e)}`); bad = true;
}

process.stdout.write(bad ? "\nPREPUBLISH-CHECK: FAIL ❌ — publish aborted\n" : "\nPREPUBLISH-CHECK: PASS ✅ — only the clean build would ship\n");
process.exit(bad ? 1 : 0);
