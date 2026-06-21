#!/usr/bin/env node
// ORIRO CLI — single-binary builder (Step 0). Produces a standalone `oriro`
// executable that runs with NO Node.js install — the whole point: a non-technical
// user downloads one file and runs it. Uses Node's built-in SEA (Single Executable
// Application), the same approach as Kimi Code, so no new toolchain is required.
//
// Pipeline:  build dist → esbuild-bundle the entry into ONE cjs → SEA blob →
//            copy the host node → postject-inject the blob → signed binary.
//
// Native modules (@lydell/node-pty etc.) cannot be inlined into JS; they ride along
// as .node sidecars next to the binary (the install scripts place the whole folder).
// Full asset-embedding (Kimi-style) is a later polish; this ships a working binary.
//
// Run in release CI per platform:  node scripts/native/build-binary.mjs
// Output:  dist-native/bin/<platform>-<arch>/oriro[.exe]  (+ native/ sidecars)

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  copyFileSync,
  rmSync,
  writeFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { createRequire } from "node:module";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PLATFORM = process.platform; // 'win32' | 'darwin' | 'linux'
const ARCH = process.arch; // 'x64' | 'arm64'
const EXE = PLATFORM === "win32" ? ".exe" : "";
const FUSE = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2";

const OUT_DIR = join(ROOT, "dist-native", "bin", `${PLATFORM}-${ARCH}`);
const WORK = join(ROOT, "dist-native", "intermediates");
const BUNDLE = join(WORK, "oriro.cjs");
const BLOB = join(WORK, "oriro.blob");
const SEA_CONFIG = join(WORK, "sea-config.json");
const BIN = join(OUT_DIR, `oriro${EXE}`);

// Native packages that must stay external (.node binaries) — shipped as sidecars.
const NATIVE_EXTERNALS = ["@lydell/node-pty", "node-pty", "koffi", "fsevents", "cpu-features"];

function log(step, msg) {
  process.stdout.write(`  [${step}] ${msg}\n`);
}

function run(cmd, args, opts = {}) {
  // On Windows, .cmd/.bat wrappers (pnpm.cmd, npx.cmd) can't be spawned directly via
  // execFileSync (EINVAL) — run them through a shell. Native exes (node) run directly.
  const useShell = process.platform === "win32" && /\.(cmd|bat)$/i.test(cmd);
  return execFileSync(cmd, args, { stdio: "inherit", cwd: ROOT, shell: useShell, ...opts });
}

// 1) Ensure the project is built (dist/). Skip if already present.
function ensureDist() {
  if (existsSync(join(ROOT, "dist", "index.js"))) {
    log("1/6", "dist/ present — reusing.");
    return;
  }
  log("1/6", "building dist/ (pnpm build)…");
  run(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["build"]);
}

// 2) Bundle the built entry into a single CJS with esbuild, externalizing natives.
function bundle() {
  mkdirSync(WORK, { recursive: true });
  // Invoke esbuild's JS entry via node (cross-platform; avoids the Windows .cmd spawn issue).
  const esbuildBin = join(ROOT, "node_modules", "esbuild", "bin", "esbuild");
  const entry = join(ROOT, "dist", "index.js");
  log("2/6", "esbuild → single oriro.cjs…");
  run(process.execPath, [
    esbuildBin,
    entry,
    "--bundle",
    "--platform=node",
    "--format=cjs",
    "--target=node22",
    `--outfile=${BUNDLE}`,
    ...NATIVE_EXTERNALS.map((p) => `--external:${p}`),
    "--external:*.node",
    "--log-level=error",
  ]);
}

// 3) Generate the SEA config + 4) the blob.
function seaBlob() {
  writeFileSync(
    SEA_CONFIG,
    JSON.stringify(
      { main: BUNDLE, output: BLOB, disableExperimentalSEAWarning: true, useSnapshot: false },
      null,
      2,
    ),
  );
  log("3/6", "node --experimental-sea-config → blob…");
  run(process.execPath, ["--experimental-sea-config", SEA_CONFIG]);
}

// 5) Copy the host node binary and postject-inject the blob.
function inject() {
  mkdirSync(OUT_DIR, { recursive: true });
  rmSync(BIN, { force: true });
  copyFileSync(process.execPath, BIN);
  log("5/6", "postject inject NODE_SEA_BLOB…");
  const pjArgs = [BIN, "NODE_SEA_BLOB", BLOB, "--sentinel-fuse", FUSE];
  if (PLATFORM === "darwin") pjArgs.push("--macho-segment-name", "NODE_SEA");
  // Resolve postject locally if present, else fetch via npx (no hard dependency).
  let postjectCli = null;
  try {
    postjectCli = require.resolve("postject/dist/cli.js");
  } catch {
    /* fall back to npx */
  }
  if (postjectCli) {
    run(process.execPath, [postjectCli, ...pjArgs]);
  } else {
    run(PLATFORM === "win32" ? "npx.cmd" : "npx", ["-y", "postject", ...pjArgs]);
  }
}

// 6) Copy native sidecars next to the binary so the standalone exe can load them.
function copyNativeSidecars() {
  const dest = join(OUT_DIR, "native");
  mkdirSync(dest, { recursive: true });
  let count = 0;
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
          count++;
        }
      }
    }
  }
  log("6/6", `copied ${count} native sidecar(s) → native/`);
}

console.log(`\n  ORIRO single-binary build — ${PLATFORM}-${ARCH}\n`);
ensureDist();
bundle();
seaBlob();
inject();
copyNativeSidecars();
console.log(`\n  ✅ Built: ${BIN}\n     Run it directly — no Node.js required.\n`);
