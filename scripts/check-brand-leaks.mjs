#!/usr/bin/env node

// Brand-leak checker.
//
// Greps user-facing / public-view surfaces (src runtime strings, docs, README,
// install scripts) for retired pre-Oriro brand names and fails when one shows up
// outside the intentional allowlist. The allowlist covers three legitimate uses:
//   1. @openclaw/* npm package aliases (functional dependency aliases).
//   2. Migration / legacy-compat LOGIC that DETECTS old names so existing users
//      can migrate (legacy service names, old config dirs/files, legacy env
//      prefixes, doctor migrations, compat type aliases).
//   3. The attribution credit thanking @OpenClaw / @Moonshot.AI / @Claude and the
//      rename lore page.
//
// Anything else is treated as the old brand leaking into a user-visible surface
// as if it were the product, and the check exits non-zero (CI-usable):
//   node scripts/check-brand-leaks.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Retired brand names. Case-insensitive. "claw" subsumes claw/clawd/clawdbot/openclaw;
// "warelay" is the original WhatsApp-gateway name.
const BRAND_PATTERN = /claw|warelay/iu;

// Surfaces a user/operator can actually read: shipped runtime strings, published
// docs, the README, and the public install scripts. Build-internal and test files
// are out of scope.
const SCAN_GLOBS = [
  { dir: "src", exts: [".ts"], skip: (p) => p.endsWith(".test.ts") },
  { dir: "docs", exts: [".md", ".mdx"], skip: () => false },
  { dir: "scripts", exts: [".sh", ".mjs"], skip: () => false },
];
const SCAN_FILES = ["README.md"];

// Whole files exempted because their entire job is legacy detection/migration or
// attribution. Paths are repo-root-relative and use forward slashes.
const ALLOWLIST_FILES = new Map([
  // Legacy-compat name constants + detection logic (keep migration working).
  ["src/compat/legacy-names.ts", "legacy project-name constants for migration"],
  ["src/daemon/constants.ts", "legacy gateway systemd service-name detection"],
  ["src/daemon/inspect.ts", "legacy gateway service marker detection"],
  ["src/config/paths.ts", "legacy state dir + config filename migration"],
  ["src/shared/node-match.ts", "legacy client id prefix detection"],
  ["src/plugins/compat/registry.ts", "legacy plugin-sdk config type alias compat"],
  ["src/commands/doctor-config-preflight.ts", "legacy config migration in doctor"],
  ["src/gateway/server-startup-post-attach.ts", "legacy state dir migration"],
  [
    "src/gateway/env-deprecation.ts",
    "legacy env-prefix detection constant (warning text scrubbed)",
  ],
  ["src/gateway/auth-install-policy.ts", "reads legacy env password for install migration"],
  ["src/plugin-sdk/index.ts", "deprecated ClawdbotConfig SDK type alias (compat)"],
  [
    "src/channels/plugins/contracts/test-helpers/channel-plugin-catalog-contract-suites.ts",
    "test-support: legacy state-dir env var (compat)",
  ],
  ["scripts/install.sh", "legacy config-path detection for installer migration"],
  ["scripts/postinstall-bundled-plugins.mjs", "legacy state-root migration"],
  ["scripts/check-brand-leaks.mjs", "this checker (defines the patterns + allowlist)"],
  // Migration/legacy-compat documentation (documents detection, not the product).
  ["docs/tools/skills.md", "documents accepted legacy metadata block (compat)"],
  ["docs/plugins/compatibility.md", "documents legacy config type alias (compat)"],
  // Attribution + rename lore (intentional credit / history).
  ["README.md", "attribution credit to @OpenClaw foundation"],
  ["docs/reference/credits.md", "attribution credit to OpenClaw Foundation"],
  ["docs/start/lore.md", "rename origin story (Warelay -> Clawdbot -> Oriro)"],
  // Functional external reference (Railway deploy template slug, like an npm alias).
  ["docs/install/railway.mdx", "external Railway deploy-template URL slug (functional)"],
]);

// Per-line content exemptions for files that are otherwise in scope. Each entry is
// a substring that, when present on a matching line, marks that line as intentional.
const ALLOWLIST_LINE_SUBSTRINGS = [
  "@openclaw", // npm package aliases / GitHub handle in attribution
];

/** Recursively collect files under a directory matching the given extensions. */
function collectFiles(dir, exts, skip, acc) {
  const abs = path.join(REPO_ROOT, dir);
  if (!fs.existsSync(abs)) {
    return;
  }
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") {
        continue;
      }
      collectFiles(rel, exts, skip, acc);
      continue;
    }
    if (!exts.some((ext) => entry.name.endsWith(ext))) {
      continue;
    }
    if (skip(rel)) {
      continue;
    }
    acc.push(rel);
  }
}

/** Build the full list of repo-root-relative files to scan. */
export function listScanFiles() {
  const files = [];
  for (const glob of SCAN_GLOBS) {
    collectFiles(glob.dir, glob.exts, glob.skip, files);
  }
  for (const file of SCAN_FILES) {
    if (fs.existsSync(path.join(REPO_ROOT, file))) {
      files.push(file);
    }
  }
  return files;
}

/** Return true when a matching line is covered by a content-based allowlist. */
function isLineAllowlisted(line) {
  const lower = line.toLowerCase();
  return ALLOWLIST_LINE_SUBSTRINGS.some((needle) => lower.includes(needle.toLowerCase()));
}

/** Scan one file's content for non-allowlisted brand leaks. */
export function findLeaksInContent(relPath, content) {
  if (ALLOWLIST_FILES.has(relPath)) {
    return [];
  }
  const leaks = [];
  const lines = content.split(/\r?\n/u);
  for (const [index, line] of lines.entries()) {
    if (!BRAND_PATTERN.test(line)) {
      continue;
    }
    if (isLineAllowlisted(line)) {
      continue;
    }
    leaks.push({ relPath, line: index + 1, text: line.trim() });
  }
  return leaks;
}

/** Scan all in-scope files and return the list of leaks. */
export function findBrandLeaks() {
  const leaks = [];
  for (const relPath of listScanFiles()) {
    let content;
    try {
      content = fs.readFileSync(path.join(REPO_ROOT, relPath), "utf8");
    } catch {
      continue;
    }
    leaks.push(...findLeaksInContent(relPath, content));
  }
  return leaks;
}

function main() {
  const leaks = findBrandLeaks();
  if (leaks.length === 0) {
    const scanned = listScanFiles().length;
    console.log(`check:brand OK - no old-brand leaks in ${scanned} user-facing files.`);
    return;
  }
  console.error(`check:brand FAILED - ${leaks.length} old-brand leak(s) in user-facing surfaces:`);
  for (const leak of leaks) {
    console.error(`  ${leak.relPath}:${leak.line}  ${leak.text}`);
  }
  console.error(
    "\nIf a hit is intentional (npm @openclaw alias, legacy-compat detection, or attribution),",
  );
  console.error(
    "add the file to ALLOWLIST_FILES or the line marker to ALLOWLIST_LINE_SUBSTRINGS in this script.",
  );
  process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
