#!/usr/bin/env node
// ORIRO CLI — single-binary builder via BUN (`bun build --compile`).
//
// WHY (C2 lane: scripts/native/ + .github only — never src/):
// The SEA path (build-binary.mjs) bundles the entry to **CJS** before injecting,
// which cannot represent **ES modules with top-level `await`**. `bun build --compile`
// keeps ESM + TLA intact and embeds the runtime, so the binary "just runs" with no
// Node install — same end goal as SEA, but ESM/TLA-safe.
//
// Pipeline:  ensure dist/ → `bun build dist/index.js --compile --target=bun-<os>-<arch>`
//            → emit dist-native/bin/oriro-<os>-<arch>[.exe] → copy native .node sidecars.
//
// NATIVE ADDONS: @lydell/node-pty / koffi / fsevents / cpu-features are N-API .node
// files. They stay EXTERNAL and ride as sidecars next to the binary (same as SEA).
// Cross-compiled targets (via --target on a foreign host) get the JS+runtime but NOT
// foreign .node sidecars — so for a fully-working per-OS artifact, run this builder
// ON that OS in CI (the per-OS matrix in .github/workflows/oriro-binary-bun-release.yml).
// That is the documented fallback for "bun fights native addons."
//
// Usage:
//   node scripts/native/build-binary-bun.mjs            # host target, with native sidecars
//   node scripts/native/build-binary-bun.mjs --all      # cross-compile JS binaries for all targets (no foreign sidecars)
//   BUN=/path/to/bun node scripts/native/build-binary-bun.mjs

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync, rmSync, readdirSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BUN = process.env.BUN || (process.platform === "win32" ? "bun.exe" : "bun");
const ENTRY = join(ROOT, "dist", "index.js");
const OUT_BASE = join(ROOT, "dist-native", "bin");

// Keep this list identical to build-binary.mjs (SEA) so both paths sidecar the same natives.
const NATIVE_EXTERNALS = ["@lydell/node-pty", "node-pty", "koffi", "fsevents", "cpu-features"];

// node platform/arch -> bun --target token + our asset os/arch label.
// Asset names: oriro-<os>-<arch>[.exe]  (os: linux|darwin|windows, arch: x64|arm64)
const TARGETS = {
  "linux-x64": { bun: "bun-linux-x64", exe: "" },
  "linux-arm64": { bun: "bun-linux-arm64", exe: "" },
  "darwin-x64": { bun: "bun-darwin-x64", exe: "" },
  "darwin-arm64": { bun: "bun-darwin-arm64", exe: "" },
  "windows-x64": { bun: "bun-windows-x64", exe: ".exe" },
  // NOTE: bun has no windows-arm64 --compile target yet → keep SEA for win-arm64.
};

const nodeOs = process.platform === "win32" ? "windows" : process.platform; // darwin|linux|windows
const hostKey = `${nodeOs}-${process.arch}`;
const wantAll = process.argv.includes("--all");

function log(s, m) {
  process.stdout.write(`  [${s}] ${m}\n`);
}
function run(cmd, args, opts = {}) {
  const useShell = process.platform === "win32" && /\.(cmd|bat)$/i.test(cmd);
  return execFileSync(cmd, args, { stdio: "inherit", cwd: ROOT, shell: useShell, ...opts });
}

function ensureDist() {
  if (existsSync(ENTRY)) {
    log("1/3", "dist/ present — reusing.");
    return;
  }
  log("1/3", "building dist/ (pnpm build)…");
  run(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["build"]);
}

function bunAvailable() {
  try {
    execFileSync(BUN, ["--version"], { stdio: "ignore", shell: process.platform === "win32" });
    return true;
  } catch {
    return false;
  }
}

function compile(key) {
  const t = TARGETS[key];
  if (!t) {
    log("skip", `no bun target for ${key}`);
    return null;
  }
  const outDir = join(OUT_BASE, key);
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, `oriro-${key}${t.exe}`);
  rmSync(out, { force: true });
  log("2/3", `bun --compile → ${basename(out)} (target ${t.bun})`);
  run(BUN, [
    "build",
    ENTRY,
    "--compile",
    `--target=${t.bun}`,
    `--outfile=${out}`,
    ...NATIVE_EXTERNALS.flatMap((p) => ["--external", p]),
    "--external",
    "*.node",
  ]);
  return { key, out, outDir };
}

// Copy this host's native .node sidecars next to the binary (host target only).
function copyNativeSidecars(outDir) {
  const dest = join(outDir, "native");
  mkdirSync(dest, { recursive: true });
  let n = 0;
  for (const pkg of NATIVE_EXTERNALS) {
    const base = join(ROOT, "node_modules", pkg);
    if (!existsSync(base)) continue;
    const stack = [base];
    while (stack.length) {
      const dir = stack.pop();
      for (const e of readdirSync(dir)) {
        const p = join(dir, e);
        const st = statSync(p);
        if (st.isDirectory()) stack.push(p);
        else if (e.endsWith(".node")) {
          copyFileSync(p, join(dest, basename(p)));
          n++;
        }
      }
    }
  }
  log("3/3", `copied ${n} native sidecar(s) → native/`);
  return n;
}

console.log(
  `\n  ORIRO bun single-binary build — host ${hostKey}${wantAll ? " (+ --all cross targets)" : ""}\n`,
);
if (!bunAvailable()) {
  console.error(
    "  ✗ bun not found. Install bun (https://bun.sh) or set BUN=/path/to/bun.\n" +
      "    In CI use oven-sh/setup-bun. This script intentionally does not auto-install a toolchain.",
  );
  process.exit(2);
}
ensureDist();

const built = [];
if (wantAll) {
  for (const key of Object.keys(TARGETS)) {
    const r = compile(key);
    if (r) built.push(r);
  }
  log(
    "note",
    "cross targets are JS+runtime only — native sidecars added for the host target below.",
  );
}
// Always (re)build the host target and attach native sidecars for a fully-working artifact.
if (TARGETS[hostKey]) {
  const r = built.find((b) => b.key === hostKey) || compile(hostKey);
  if (r) {
    copyNativeSidecars(r.outDir);
    if (!built.includes(r)) built.push(r);
  }
} else {
  log(
    "warn",
    `host ${hostKey} has no bun --compile target (e.g. windows-arm64) — use SEA build-binary.mjs there.`,
  );
}

console.log(`\n  ✅ Built ${built.length} binary(ies):`);
for (const b of built) console.log(`     ${b.out}`);
console.log(`\n  Per-OS native correctness: run this builder on each OS in CI (matrix).\n`);
