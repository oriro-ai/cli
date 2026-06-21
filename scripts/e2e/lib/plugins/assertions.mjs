// Assertions for plugin install/runtime E2E scenarios.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readBoundedResponseText } from "../bounded-response-text.mjs";
import { readPositiveIntEnv } from "../env-limits.mjs";
import {
  readPluginInstallIndex,
  readPluginInstallRecords,
  writePluginInstallIndexForE2E,
} from "../plugin-index-sqlite.mjs";
import { readTextFileTail } from "../text-file-utils.mjs";

const command = process.argv[2];
const scratchRoot = process.env.ORIRO_PLUGINS_TMP_DIR || os.tmpdir();
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const scratchFile = (name) => path.join(scratchRoot, name);
const ERROR_DETAIL_TAIL_BYTES = 16 * 1024;
const LOG_SCAN_CHUNK_BYTES = 64 * 1024;

function readOriroHubPreflightLimits() {
  return {
    bodyMaxBytes: readPositiveIntEnv(
      "ORIRO_PLUGINS_E2E_ORIROHUB_PREFLIGHT_BODY_MAX_BYTES",
      1024 * 1024,
    ),
    timeoutMs: readPositiveIntEnv("ORIRO_PLUGINS_E2E_ORIROHUB_PREFLIGHT_TIMEOUT_MS", 30_000),
  };
}

function createTimeoutError(label, timeoutMs) {
  const error = new Error(`${label} timed out after ${timeoutMs}ms`);
  error.code = "ETIMEDOUT";
  return error;
}

async function withTimeout(label, timeoutMs, run) {
  const controller = new AbortController();
  const timeoutError = createTimeoutError(label, timeoutMs);
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort(timeoutError);
      reject(timeoutError);
    }, timeoutMs);
    timeout.unref?.();
  });
  try {
    return await Promise.race([run(controller.signal, timeoutPromise), timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function resolveHomePath(value) {
  if (value === "~") {
    return process.env.HOME;
  }
  if (value?.startsWith("~/") || value?.startsWith("~\\")) {
    return path.join(process.env.HOME, value.slice(2));
  }
  return value;
}

function comparablePath(value) {
  const resolved = path.resolve(resolveHomePath(value));
  try {
    return fs.realpathSync.native(resolved);
  } catch {
    return resolved;
  }
}

function pathsEqual(left, right) {
  return comparablePath(left) === comparablePath(right);
}

function fileContainsText(file, needle) {
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return false;
  }
  if (!stat.isFile() || stat.size <= 0) {
    return false;
  }
  const fd = fs.openSync(file, "r");
  try {
    const buffer = Buffer.alloc(Math.min(LOG_SCAN_CHUNK_BYTES, stat.size));
    let carry = "";
    let offset = 0;
    while (offset < stat.size) {
      const bytesToRead = Math.min(buffer.length, stat.size - offset);
      const bytesRead = fs.readSync(fd, buffer, 0, bytesToRead, offset);
      if (bytesRead <= 0) {
        break;
      }
      offset += bytesRead;
      const text = carry + buffer.subarray(0, bytesRead).toString("utf8");
      if (text.includes(needle)) {
        return true;
      }
      carry = text.slice(-Math.max(0, needle.length - 1));
    }
    return false;
  } finally {
    fs.closeSync(fd);
  }
}

function getInstallRecords() {
  const configPath = oriroConfigPath();
  const config = readOriroConfig();
  const allowLegacyCompat = process.env.ORIRO_PACKAGE_ACCEPTANCE_LEGACY_COMPAT === "1";
  const index = readPluginInstallIndex({
    configPath,
    fallbackRecords: allowLegacyCompat ? (config.plugins?.installs ?? {}) : {},
  });
  if (!allowLegacyCompat && !index.installRecords) {
    throw new Error("expected modern installRecords in installed plugin index");
  }
  return index.installRecords ?? {};
}

function oriroConfigPath() {
  return path.join(process.env.HOME, ".oriro", "oriro.json");
}

function readOriroConfig() {
  const configPath = oriroConfigPath();
  return fs.existsSync(configPath) ? readRequiredOriroConfig() : {};
}

function readRequiredOriroConfig() {
  const configPath = oriroConfigPath();
  try {
    return readJson(configPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`failed to read Oriro config ${configPath}: ${message}`, { cause: error });
  }
}

function assertPluginRemoved(params) {
  const list = readJson(params.listFile);
  if ((list.plugins || []).some((entry) => entry.id === params.pluginId)) {
    throw new Error(`${params.pluginId} still listed after uninstall`);
  }

  const installRecords = getInstallRecords();
  if (installRecords[params.pluginId]) {
    throw new Error(`${params.pluginId} install record still present after uninstall`);
  }

  const config = readOriroConfig();
  if (config.plugins?.entries?.[params.pluginId]) {
    throw new Error(`${params.pluginId} config entry still present after uninstall`);
  }
  if ((config.plugins?.allow || []).includes(params.pluginId)) {
    throw new Error(`${params.pluginId} allowlist entry still present after uninstall`);
  }
  if ((config.plugins?.deny || []).includes(params.pluginId)) {
    throw new Error(`${params.pluginId} denylist entry still present after uninstall`);
  }
}

function rememberPluginInstallPath(params) {
  const record = getInstallRecords()[params.pluginId];
  if (!record) {
    throw new Error(`missing install record for ${params.pluginId}`);
  }
  if (params.source && record.source !== params.source) {
    throw new Error(`unexpected source for ${params.pluginId}: ${record.source}`);
  }
  if (params.sourcePath && !pathsEqual(record.sourcePath, params.sourcePath)) {
    throw new Error(
      `unexpected source path for ${params.pluginId}: ${record.sourcePath}, expected ${params.sourcePath}`,
    );
  }
  const installPath = resolveHomePath(record.installPath);
  if (!installPath || !fs.existsSync(installPath)) {
    throw new Error(`${params.pluginId} install path missing on disk: ${installPath}`);
  }
  fs.writeFileSync(params.installPathFile, installPath, "utf8");
  if (params.sourcePathFile && params.sourcePath) {
    fs.writeFileSync(params.sourcePathFile, params.sourcePath, "utf8");
  }
  return { installPath, record };
}

function assertManagedInstallRemoved(params) {
  const installPath = fs.readFileSync(params.installPathFile, "utf8").trim();
  const sourcePath =
    params.sourcePathFile && fs.existsSync(params.sourcePathFile)
      ? fs.readFileSync(params.sourcePathFile, "utf8").trim()
      : "";
  assertPluginRemoved({
    pluginId: params.pluginId,
    listFile: params.listFile,
  });
  if (sourcePath && !fs.existsSync(sourcePath)) {
    throw new Error(`${params.pluginId} source path was deleted during uninstall: ${sourcePath}`);
  }
  const installPathIsSourcePath = sourcePath ? pathsEqual(installPath, sourcePath) : false;
  if (!installPathIsSourcePath && fs.existsSync(installPath)) {
    throw new Error(
      `${params.pluginId} managed install path still exists after uninstall: ${installPath}`,
    );
  }
}

function recordFixturePluginTrust() {
  const pluginId = process.argv[3];
  const pluginRoot = process.argv[4];
  const enabled = process.argv[5] === "1";
  const configPath = path.join(process.env.HOME, ".oriro", "oriro.json");
  const config = fs.existsSync(configPath) ? readJson(configPath) : {};
  const plugins = (config.plugins ??= {});
  const entries = (plugins.entries ??= {});
  entries[pluginId] = { ...entries[pluginId], enabled };
  delete plugins.installs;
  plugins.allow = Array.from(new Set([...(plugins.allow ?? []), pluginId])).toSorted((a, b) =>
    a.localeCompare(b),
  );
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

  const installRecords = readPluginInstallRecords();
  installRecords[pluginId] = {
    ...installRecords[pluginId],
    source: "path",
    installPath: pluginRoot,
    sourcePath: pluginRoot,
  };
  writePluginInstallIndexForE2E({ installRecords });
}

function assertDemoPlugin() {
  const data = readJson(scratchFile("plugins.json"));
  const inspect = readJson(scratchFile("plugins-inspect.json"));
  const plugin = (data.plugins || []).find((entry) => entry.id === "demo-plugin");
  if (!plugin) {
    throw new Error("plugin not found");
  }
  if (plugin.status !== "loaded") {
    throw new Error(`unexpected status: ${plugin.status}`);
  }

  const assertIncludes = (list, value, label) => {
    if (!Array.isArray(list) || !list.includes(value)) {
      throw new Error(`${label} missing: ${value}`);
    }
  };

  const inspectToolNames = Array.isArray(inspect.tools)
    ? inspect.tools.flatMap((entry) => (Array.isArray(entry?.names) ? entry.names : []))
    : [];
  assertIncludes(inspectToolNames, "demo_tool", "tool");
  assertIncludes(inspect.gatewayMethods, "demo.ping", "gateway method");
  assertIncludes(inspect.cliCommands, "demo", "cli command");
  assertIncludes(inspect.services, "demo-service", "service");

  const diagErrors = (data.diagnostics || []).filter((diag) => diag.level === "error");
  if (diagErrors.length > 0) {
    throw new Error(`diagnostics errors: ${diagErrors.map((diag) => diag.message).join("; ")}`);
  }
}

function assertSimplePlugin(jsonFile, inspectFile, pluginId, method) {
  const data = readJson(jsonFile);
  const inspect = readJson(inspectFile);
  const plugin = (data.plugins || []).find((entry) => entry.id === pluginId);
  if (!plugin) {
    throw new Error(`${pluginId} plugin not found`);
  }
  if (plugin.status !== "loaded") {
    throw new Error(`unexpected status: ${plugin.status}`);
  }
  if (!Array.isArray(inspect.gatewayMethods) || !inspect.gatewayMethods.includes(method)) {
    throw new Error(`expected gateway method ${method}`);
  }
}

function assertTextFileIncludes(file, expectedSnippet, label) {
  if (fileContainsText(file, expectedSnippet)) {
    return;
  }
  const outputTail = readTextFileTail(file, ERROR_DETAIL_TAIL_BYTES);
  throw new Error(
    `expected ${label} to include ${JSON.stringify(expectedSnippet)}. Output tail:\n${outputTail}`,
  );
}

function assertUpdateOutput(logFile, expectedSnippet) {
  assertTextFileIncludes(logFile, expectedSnippet, "update output");
}

function assertClaudeBundleDisabled() {
  const data = readJson(scratchFile("plugins-bundle-disabled.json"));
  const plugin = (data.plugins || []).find((entry) => entry.id === "claude-bundle-e2e");
  if (!plugin) {
    throw new Error("Claude bundle plugin not found");
  }
  if (plugin.status !== "disabled") {
    throw new Error(`expected disabled bundle before enable, got ${plugin.status}`);
  }
}

function assertClaudeBundleInspect() {
  const inspect = readJson(scratchFile("plugins-bundle-inspect.json"));
  if (inspect.plugin?.bundleFormat !== "claude") {
    throw new Error(`expected Claude bundle format, got ${inspect.plugin?.bundleFormat}`);
  }
  if (inspect.plugin?.enabled !== true || inspect.plugin?.status !== "loaded") {
    throw new Error(
      `expected enabled loaded Claude bundle, got enabled=${inspect.plugin?.enabled} status=${inspect.plugin?.status}`,
    );
  }
}

function assertSlashInstall() {
  const inspect = readJson(scratchFile("plugin-command-install-show.json"));
  if (inspect.plugin?.status !== "loaded") {
    throw new Error(`expected loaded status after install, got ${inspect.plugin?.status}`);
  }
  if (inspect.plugin?.enabled !== true) {
    throw new Error(`expected enabled status after install, got ${inspect.plugin?.enabled}`);
  }
  if (!inspect.gatewayMethods.includes("demo.slash.install")) {
    throw new Error(`expected installed gateway method, got ${inspect.gatewayMethods.join(", ")}`);
  }
}

function parseOriroHubPackageName(rawSpec) {
  const value = rawSpec.slice("orirohub:".length).trim();
  const slashIndex = value.lastIndexOf("/");
  const atIndex = value.lastIndexOf("@");
  return atIndex > 0 && atIndex > slashIndex ? value.slice(0, atIndex) : value;
}

function assertMarketplaceList() {
  const data = readJson(scratchFile("marketplace-list.json"));
  const names = (data.plugins || []).map((entry) => entry.name).toSorted();
  if (data.name !== "Fixture Marketplace") {
    throw new Error(`unexpected marketplace name: ${data.name}`);
  }
  if (!names.includes("marketplace-shortcut") || !names.includes("marketplace-direct")) {
    throw new Error(`unexpected marketplace plugins: ${names.join(", ")}`);
  }
}

function assertMarketplaceInstalled() {
  const data = readJson(scratchFile("plugins-marketplace.json"));
  const shortcutInspect = readJson(scratchFile("plugins-marketplace-shortcut-inspect.json"));
  const directInspect = readJson(scratchFile("plugins-marketplace-direct-inspect.json"));
  const getPlugin = (id) => {
    const plugin = (data.plugins || []).find((entry) => entry.id === id);
    if (!plugin) {
      throw new Error(`plugin not found: ${id}`);
    }
    if (plugin.status !== "loaded") {
      throw new Error(`unexpected status for ${id}: ${plugin.status}`);
    }
    return plugin;
  };

  const shortcut = getPlugin("marketplace-shortcut");
  const direct = getPlugin("marketplace-direct");
  if (shortcut.version !== "0.0.1") {
    throw new Error(`unexpected shortcut version: ${shortcut.version}`);
  }
  if (direct.version !== "0.0.1") {
    throw new Error(`unexpected direct version: ${direct.version}`);
  }
  if (!shortcutInspect.gatewayMethods.includes("demo.marketplace.shortcut.v1")) {
    throw new Error("expected marketplace shortcut gateway method");
  }
  if (!directInspect.gatewayMethods.includes("demo.marketplace.direct.v1")) {
    throw new Error("expected marketplace direct gateway method");
  }
}

function assertMarketplaceRecords() {
  const installRecords = getInstallRecords();
  for (const id of ["marketplace-shortcut", "marketplace-direct"]) {
    const record = installRecords[id];
    if (!record) {
      if (allowLegacyCompat) {
        console.log(`legacy package did not persist marketplace install record for ${id}`);
        continue;
      }
      throw new Error(`missing marketplace install record for ${id}`);
    }
    if (record.source !== "marketplace") {
      throw new Error(`unexpected source for ${id}: ${record.source}`);
    }
    if (record.marketplaceSource !== "claude-fixtures") {
      throw new Error(`unexpected marketplace source for ${id}: ${record.marketplaceSource}`);
    }
    if (record.marketplacePlugin !== id) {
      throw new Error(`unexpected marketplace plugin for ${id}: ${record.marketplacePlugin}`);
    }
  }
}

function assertPluginTgz() {
  assertSimplePlugin(
    scratchFile("plugins2.json"),
    scratchFile("plugins2-inspect.json"),
    "demo-plugin-tgz",
    "demo.tgz",
  );
  rememberPluginInstallPath({
    pluginId: "demo-plugin-tgz",
    installPathFile: scratchFile("plugins2-install-path.txt"),
    source: "archive",
  });
}

function assertPluginTgzRemoved() {
  assertManagedInstallRemoved({
    pluginId: "demo-plugin-tgz",
    listFile: scratchFile("plugins2-uninstalled.json"),
    installPathFile: scratchFile("plugins2-install-path.txt"),
  });
}

function assertPluginDir() {
  const sourceDir = process.argv[3];
  assertSimplePlugin(
    scratchFile("plugins3.json"),
    scratchFile("plugins3-inspect.json"),
    "demo-plugin-dir",
    "demo.dir",
  );
  rememberPluginInstallPath({
    pluginId: "demo-plugin-dir",
    installPathFile: scratchFile("plugins3-install-path.txt"),
    sourcePathFile: scratchFile("plugins3-source-path.txt"),
    source: "path",
    sourcePath: sourceDir,
  });
}

function assertPluginDirRemoved() {
  assertManagedInstallRemoved({
    pluginId: "demo-plugin-dir",
    listFile: scratchFile("plugins3-uninstalled.json"),
    installPathFile: scratchFile("plugins3-install-path.txt"),
    sourcePathFile: scratchFile("plugins3-source-path.txt"),
  });
}

function assertGitPlugin() {
  const repoUrl = process.argv[3];
  const gitRef = process.argv[4];
  assertSimplePlugin(
    scratchFile("plugins-git.json"),
    scratchFile("plugins-git-inspect.json"),
    "demo-plugin-git",
    "demo.git",
  );

  const inspect = readJson(scratchFile("plugins-git-inspect.json"));
  if (!Array.isArray(inspect.cliCommands) || !inspect.cliCommands.includes("demo-git")) {
    throw new Error(`expected demo-git cli command, got ${inspect.cliCommands?.join(", ")}`);
  }

  assertTextFileIncludes(
    scratchFile("plugins-git-cli.txt"),
    "demo-plugin-git:pong",
    "git plugin CLI output",
  );

  const record = getInstallRecords()["demo-plugin-git"];
  if (!record) {
    throw new Error("missing git install record for demo-plugin-git");
  }
  if (record.source !== "git") {
    throw new Error(`unexpected git install source: ${record.source}`);
  }
  if (record.gitUrl !== repoUrl) {
    throw new Error(`unexpected git url: ${record.gitUrl}, expected ${repoUrl}`);
  }
  if (record.gitRef !== gitRef) {
    throw new Error(`unexpected git ref: ${record.gitRef}, expected ${gitRef}`);
  }
  if (record.gitCommit !== gitRef) {
    throw new Error(`unexpected git commit: ${record.gitCommit}, expected ${gitRef}`);
  }
  if (record.spec !== `git:${repoUrl}@${gitRef}`) {
    throw new Error(`unexpected git spec: ${record.spec}`);
  }

  const installPath = resolveHomePath(record.installPath);
  if (!installPath || !fs.existsSync(installPath)) {
    throw new Error(`git install path missing on disk: ${installPath}`);
  }
  const gitRoot = path.join(process.env.HOME, ".oriro", "git");
  if (!installPath.endsWith(`${path.sep}repo`)) {
    throw new Error(`git install path should point at cloned repo root: ${installPath}`);
  }
  assertRealPathInside(gitRoot, installPath, "git install path");
  const dependencyPackagePath = path.join(installPath, "node_modules", "is-number", "package.json");
  if (!fs.existsSync(dependencyPackagePath)) {
    throw new Error(`missing git plugin installed dependency: ${dependencyPackagePath}`);
  }
  assertRealPathInside(installPath, dependencyPackagePath, "git plugin installed dependency");
  fs.writeFileSync(scratchFile("plugins-git-install-path.txt"), installPath, "utf8");
  fs.writeFileSync(
    scratchFile("plugins-git-install-parent.txt"),
    path.dirname(installPath),
    "utf8",
  );
}

function assertGitPluginRemoved() {
  const installPath = fs.readFileSync(scratchFile("plugins-git-install-path.txt"), "utf8").trim();
  const installParent = fs
    .readFileSync(scratchFile("plugins-git-install-parent.txt"), "utf8")
    .trim();
  assertPluginRemoved({
    pluginId: "demo-plugin-git",
    listFile: scratchFile("plugins-git-uninstalled.json"),
  });
  if (fs.existsSync(installPath)) {
    throw new Error(`git managed repo still exists after uninstall: ${installPath}`);
  }
  if (fs.existsSync(installParent)) {
    throw new Error(
      `empty git managed install parent still exists after uninstall: ${installParent}`,
    );
  }
}

function assertRealPathInside(parentPath, childPath, label) {
  const parentRealPath = fs.realpathSync(parentPath);
  const childRealPath = fs.realpathSync(childPath);
  if (
    childRealPath !== parentRealPath &&
    !childRealPath.startsWith(`${parentRealPath}${path.sep}`)
  ) {
    throw new Error(`${label} resolved outside ${parentPath}: ${childRealPath}`);
  }
}

function assertOriroHubExternalInstallContract(installPath) {
  const oriroPeerPath = path.join(installPath, "node_modules", "oriro");
  if (!fs.existsSync(oriroPeerPath)) {
    throw new Error(`missing OriroHub oriro peer symlink: ${oriroPeerPath}`);
  }
  if (!fs.lstatSync(oriroPeerPath).isSymbolicLink()) {
    throw new Error(`OriroHub oriro peer is not a symlink: ${oriroPeerPath}`);
  }
  const hostRoot = fs.realpathSync(process.cwd());
  const linkedHostRoot = fs.realpathSync(oriroPeerPath);
  if (linkedHostRoot !== hostRoot) {
    throw new Error(`expected OriroHub oriro peer ${linkedHostRoot} to target ${hostRoot}`);
  }

  const dependencyPackagePath = path.join(installPath, "node_modules", "is-number", "package.json");
  if (fs.existsSync(dependencyPackagePath)) {
    assertRealPathInside(installPath, dependencyPackagePath, "OriroHub isolated dependency");
  }
}

function assertOriroHubArtifactMetadata(record, pluginId) {
  if (record.artifactKind === "legacy-zip") {
    if (record.artifactFormat !== "zip") {
      throw new Error(
        `missing OriroHub legacy ZIP artifact metadata for ${pluginId}: ${JSON.stringify(record)}`,
      );
    }
    return;
  }

  if (record.artifactKind !== "npm-pack" || record.artifactFormat !== "tgz") {
    throw new Error(`missing OriroHub artifact metadata for ${pluginId}: ${JSON.stringify(record)}`);
  }
  if (!record.oriropackSha256 || typeof record.oriropackSize !== "number") {
    throw new Error(`missing OriroHub OriroPack metadata for ${pluginId}: ${JSON.stringify(record)}`);
  }
  if (!record.npmIntegrity || !record.npmShasum || !record.npmTarballName) {
    throw new Error(
      `missing OriroHub npm artifact metadata for ${pluginId}: ${JSON.stringify(record)}`,
    );
  }
}

function assertPluginDirDeps() {
  const sourceDir = process.argv[3];
  assertSimplePlugin(
    scratchFile("plugins-dir-deps.json"),
    scratchFile("plugins-dir-deps-inspect.json"),
    "demo-plugin-dir-deps",
    "demo.dir.deps",
  );

  const record = getInstallRecords()["demo-plugin-dir-deps"];
  if (!record) {
    throw new Error("missing local dependency plugin install record");
  }
  if (record.source !== "path") {
    throw new Error(`unexpected local dependency plugin source: ${record.source}`);
  }
  if (!pathsEqual(record.sourcePath, sourceDir)) {
    throw new Error(`unexpected local dependency plugin source path: ${record.sourcePath}`);
  }
  const installPath = resolveHomePath(record.installPath);
  if (!installPath || !fs.existsSync(installPath)) {
    throw new Error(`local dependency plugin install path missing on disk: ${installPath}`);
  }
  const dependencyPackagePath = path.join(installPath, "node_modules", "is-number", "package.json");
  if (!fs.existsSync(dependencyPackagePath)) {
    throw new Error(`missing copied local plugin dependency: ${dependencyPackagePath}`);
  }
  assertRealPathInside(installPath, dependencyPackagePath, "local plugin copied dependency");
  rememberPluginInstallPath({
    pluginId: "demo-plugin-dir-deps",
    installPathFile: scratchFile("plugins-dir-deps-install-path.txt"),
    sourcePathFile: scratchFile("plugins-dir-deps-source-path.txt"),
    source: "path",
    sourcePath: sourceDir,
  });
}

function assertPluginDirDepsRemoved() {
  assertManagedInstallRemoved({
    pluginId: "demo-plugin-dir-deps",
    listFile: scratchFile("plugins-dir-deps-uninstalled.json"),
    installPathFile: scratchFile("plugins-dir-deps-install-path.txt"),
    sourcePathFile: scratchFile("plugins-dir-deps-source-path.txt"),
  });
}

function assertLocalPathUpdateSkipped() {
  assertUpdateOutput(
    scratchFile("plugins-dir-update.log"),
    'Skipping "demo-plugin-dir" (source: path).',
  );
}

function assertNpmPlugin() {
  assertSimplePlugin(
    scratchFile("plugins-npm.json"),
    scratchFile("plugins-npm-inspect.json"),
    "demo-plugin-npm",
    "demo.npm",
  );

  const inspect = readJson(scratchFile("plugins-npm-inspect.json"));
  if (!Array.isArray(inspect.cliCommands) || !inspect.cliCommands.includes("demo-npm")) {
    throw new Error(`expected demo-npm cli command, got ${inspect.cliCommands?.join(", ")}`);
  }

  assertTextFileIncludes(
    scratchFile("plugins-npm-cli.txt"),
    "demo-plugin-npm:pong",
    "npm plugin CLI output",
  );

  const record = getInstallRecords()["demo-plugin-npm"];
  if (!record) {
    throw new Error("missing npm install record for demo-plugin-npm");
  }
  if (record.source !== "npm") {
    throw new Error(`unexpected npm install source: ${record.source}`);
  }
  if (record.spec !== "@oriro/demo-plugin-npm@0.0.1") {
    throw new Error(`unexpected npm spec: ${record.spec}`);
  }
  if (record.resolvedName !== "@oriro/demo-plugin-npm") {
    throw new Error(`unexpected npm resolved name: ${record.resolvedName}`);
  }
  if (record.resolvedVersion !== "0.0.1") {
    throw new Error(`unexpected npm resolved version: ${record.resolvedVersion}`);
  }
  const installPath = resolveHomePath(record.installPath);
  if (!installPath || !fs.existsSync(installPath)) {
    throw new Error(`npm install path missing on disk: ${installPath}`);
  }
  const nodeModulesRoot = path.dirname(path.dirname(installPath));
  const npmRoot = path.dirname(nodeModulesRoot);
  const dependencyPackagePath = path.join(nodeModulesRoot, "is-number", "package.json");
  if (!fs.existsSync(dependencyPackagePath)) {
    throw new Error(`missing npm plugin installed dependency: ${dependencyPackagePath}`);
  }
  assertRealPathInside(npmRoot, dependencyPackagePath, "npm plugin installed dependency");
  fs.writeFileSync(scratchFile("plugins-npm-install-path.txt"), installPath, "utf8");
  fs.writeFileSync(scratchFile("plugins-npm-dependency-path.txt"), dependencyPackagePath, "utf8");
}

function assertNpmPluginUpdateUnchanged() {
  assertUpdateOutput(
    scratchFile("plugins-npm-update.log"),
    "demo-plugin-npm is up to date (0.0.1).",
  );
  assertNpmPlugin();
}

function assertPluginFile() {
  const sourceDir = process.argv[3];
  assertSimplePlugin(
    scratchFile("plugins4.json"),
    scratchFile("plugins4-inspect.json"),
    "demo-plugin-file",
    "demo.file",
  );
  rememberPluginInstallPath({
    pluginId: "demo-plugin-file",
    installPathFile: scratchFile("plugins4-install-path.txt"),
    sourcePathFile: scratchFile("plugins4-source-path.txt"),
    source: "path",
    sourcePath: sourceDir,
  });
}

function assertPluginFileRemoved() {
  assertManagedInstallRemoved({
    pluginId: "demo-plugin-file",
    listFile: scratchFile("plugins4-uninstalled.json"),
    installPathFile: scratchFile("plugins4-install-path.txt"),
    sourcePathFile: scratchFile("plugins4-source-path.txt"),
  });
}

function assertNpmPluginRemoved() {
  const installPath = fs.readFileSync(scratchFile("plugins-npm-install-path.txt"), "utf8").trim();
  const dependencyPackagePath = fs
    .readFileSync(scratchFile("plugins-npm-dependency-path.txt"), "utf8")
    .trim();
  assertPluginRemoved({
    pluginId: "demo-plugin-npm",
    listFile: scratchFile("plugins-npm-uninstalled.json"),
  });
  if (fs.existsSync(installPath)) {
    throw new Error(`npm managed package still exists after uninstall: ${installPath}`);
  }
  if (fs.existsSync(dependencyPackagePath)) {
    throw new Error(
      `npm managed dependency still exists after uninstall: ${dependencyPackagePath}`,
    );
  }
}

function assertInvalidOriroExtensionsRejected() {
  const pluginId = "demo-plugin-invalid-metadata";
  for (const expected of ["oriro.extensions[1]", "non-empty string"]) {
    assertTextFileIncludes(
      scratchFile("plugins-invalid-oriro-extensions.log"),
      expected,
      "malformed metadata install output",
    );
  }

  const list = readJson(scratchFile("plugins-invalid-oriro-extensions-list.json"));
  if ((list.plugins || []).some((entry) => entry.id === pluginId)) {
    throw new Error(`${pluginId} listed after rejected install`);
  }

  const installRecords = getInstallRecords();
  if (installRecords[pluginId]) {
    throw new Error(`${pluginId} install record persisted after rejected install`);
  }

  const managedInstallPath = path.join(process.env.HOME, ".oriro", "extensions", pluginId);
  if (fs.existsSync(managedInstallPath)) {
    throw new Error(`${pluginId} managed install directory exists after rejected install`);
  }
}

function assertMarketplaceUpdated() {
  const data = readJson(scratchFile("plugins-marketplace-updated.json"));
  const inspect = readJson(scratchFile("plugins-marketplace-updated-inspect.json"));
  const plugin = (data.plugins || []).find((entry) => entry.id === "marketplace-shortcut");
  if (!plugin) {
    throw new Error("updated marketplace plugin not found");
  }
  if (plugin.version !== "0.0.2") {
    throw new Error(`unexpected updated version: ${plugin.version}`);
  }
  if (!inspect.gatewayMethods.includes("demo.marketplace.shortcut.v2")) {
    throw new Error(`expected updated gateway method, got ${inspect.gatewayMethods.join(", ")}`);
  }
}

function assertGitPluginUpdated() {
  const beforeCommit = process.argv[3];
  assertSimplePlugin(
    scratchFile("plugins-git-update.json"),
    scratchFile("plugins-git-update-inspect.json"),
    "demo-plugin-git-update",
    "demo.git.update.v2",
  );

  const inspect = readJson(scratchFile("plugins-git-update-inspect.json"));
  if (!Array.isArray(inspect.cliCommands) || !inspect.cliCommands.includes("demo-git-update")) {
    throw new Error(`expected demo-git-update cli command, got ${inspect.cliCommands?.join(", ")}`);
  }

  assertTextFileIncludes(
    scratchFile("plugins-git-update-cli.txt"),
    "demo-plugin-git-update:pong-v2",
    "updated git plugin CLI output",
  );

  const record = getInstallRecords()["demo-plugin-git-update"];
  if (!record) {
    throw new Error("missing git update install record for demo-plugin-git-update");
  }
  if (record.source !== "git") {
    throw new Error(`unexpected git update source: ${record.source}`);
  }
  if (record.gitRef !== "main") {
    throw new Error(`unexpected git update ref: ${record.gitRef}`);
  }
  if (!record.gitCommit || record.gitCommit === beforeCommit) {
    throw new Error(
      `expected git update commit to advance from ${beforeCommit}, got ${record.gitCommit}`,
    );
  }
  if (record.version !== "0.0.2") {
    throw new Error(`unexpected git update version: ${record.version}`);
  }
  assertUpdateOutput(
    scratchFile("plugins-git-update.log"),
    "Updated demo-plugin-git-update: 0.0.1 -> 0.0.2.",
  );
}

async function assertOriroHubPreflight() {
  const spec = process.env.ORIROHUB_PLUGIN_SPEC;
  if (!spec?.startsWith("orirohub:")) {
    throw new Error(`expected orirohub: spec, got ${spec}`);
  }

  const limits = readOriroHubPreflightLimits();
  const packageName = parseOriroHubPackageName(spec);
  const baseUrl = (
    process.env.ORIRO_ORIROHUB_URL ||
    process.env.ORIROHUB_URL ||
    "https://orirohub.ai"
  ).replace(/\/+$/, "");
  const token =
    process.env.ORIRO_ORIROHUB_TOKEN ||
    process.env.ORIROHUB_TOKEN ||
    process.env.ORIROHUB_AUTH_TOKEN ||
    "";
  const preflightUrl = `${baseUrl}/api/v1/packages/${encodeURIComponent(packageName)}`;
  const response = await withTimeout(
    `OriroHub package preflight for ${packageName}`,
    limits.timeoutMs,
    (signal) =>
      fetch(preflightUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        signal,
      }),
  );
  if (!response.ok) {
    const body = await withTimeout(
      `OriroHub package preflight response for ${packageName}`,
      limits.timeoutMs,
      (_signal, timeoutPromise) =>
        readBoundedResponseText(
          response,
          `OriroHub package preflight response for ${packageName}`,
          limits.bodyMaxBytes,
          timeoutPromise,
        ),
    );
    throw new Error(
      `OriroHub package preflight failed for ${packageName}: ${response.status} ${body}`,
    );
  }
  const rawDetail = await withTimeout(
    `OriroHub package preflight response for ${packageName}`,
    limits.timeoutMs,
    (_signal, timeoutPromise) =>
      readBoundedResponseText(
        response,
        `OriroHub package preflight response for ${packageName}`,
        limits.bodyMaxBytes,
        timeoutPromise,
      ),
  );
  const detail = await withTimeout(
    `OriroHub package preflight JSON for ${packageName}`,
    limits.timeoutMs,
    () => JSON.parse(rawDetail),
  );
  const family = detail.package?.family;
  if (family !== "code-plugin" && family !== "bundle-plugin") {
    throw new Error(`OriroHub package ${packageName} is not installable as a plugin: ${family}`);
  }
  if (detail.package?.runtimeId && detail.package.runtimeId !== process.env.ORIROHUB_PLUGIN_ID) {
    throw new Error(
      `OriroHub package ${packageName} runtimeId ${detail.package.runtimeId} does not match expected ${process.env.ORIROHUB_PLUGIN_ID}`,
    );
  }
  console.log(`Using OriroHub package ${packageName} (${family}).`);
}

function assertOriroHubInstalled() {
  const pluginId = process.env.ORIROHUB_PLUGIN_ID;
  const spec = process.env.ORIROHUB_PLUGIN_SPEC;
  const packageName = parseOriroHubPackageName(spec);
  const list = readJson(scratchFile("plugins-orirohub-installed.json"));
  const inspect = readJson(scratchFile("plugins-orirohub-inspect.json"));
  const plugin = (list.plugins || []).find((entry) => entry.id === pluginId);
  if (!plugin) {
    throw new Error(`OriroHub plugin not found after install: ${pluginId}`);
  }
  if (plugin.status !== "loaded") {
    throw new Error(`unexpected OriroHub plugin status for ${pluginId}: ${plugin.status}`);
  }
  if (inspect.plugin?.id !== pluginId) {
    throw new Error(`unexpected OriroHub inspect plugin id: ${inspect.plugin?.id}`);
  }

  const configPath = path.join(process.env.HOME, ".oriro", "oriro.json");
  const config = fs.existsSync(configPath) ? readJson(configPath) : {};
  const allowLegacyCompat = process.env.ORIRO_PACKAGE_ACCEPTANCE_LEGACY_COMPAT === "1";
  const index = readPluginInstallIndex({
    configPath,
    fallbackRecords: allowLegacyCompat ? (config.plugins?.installs ?? {}) : {},
  });
  if (!allowLegacyCompat && !index.installRecords) {
    throw new Error("expected modern installRecords in installed plugin index");
  }
  const installRecords = index.installRecords ?? {};
  const record = installRecords[pluginId];
  if (!record) {
    throw new Error(`missing OriroHub install record for ${pluginId}`);
  }
  if (record.source !== "orirohub") {
    throw new Error(`unexpected OriroHub install source for ${pluginId}: ${record.source}`);
  }
  if (record.orirohubPackage !== packageName) {
    throw new Error(
      `unexpected OriroHub package for ${pluginId}: ${record.orirohubPackage}, expected ${packageName}`,
    );
  }
  if (record.orirohubFamily !== "code-plugin" && record.orirohubFamily !== "bundle-plugin") {
    throw new Error(`unexpected OriroHub family for ${pluginId}: ${record.orirohubFamily}`);
  }
  if (typeof record.installPath !== "string" || record.installPath.length === 0) {
    throw new Error(`missing OriroHub install path for ${pluginId}`);
  }
  assertOriroHubArtifactMetadata(record, pluginId);

  const installPath = resolveHomePath(record.installPath);
  if (!fs.existsSync(installPath)) {
    throw new Error(`OriroHub install path missing on disk: ${installPath}`);
  }
  const extensionsRoot = path.join(process.env.HOME, ".oriro", "extensions");
  assertRealPathInside(extensionsRoot, installPath, "OriroHub install path");
  if (record.artifactKind === "npm-pack") {
    assertOriroHubExternalInstallContract(installPath);
  }
  fs.writeFileSync(scratchFile("plugins-orirohub-install-path.txt"), installPath, "utf8");
}

function assertOriroHubRemoved() {
  const pluginId = process.env.ORIROHUB_PLUGIN_ID;
  const installPath = fs
    .readFileSync(scratchFile("plugins-orirohub-install-path.txt"), "utf8")
    .trim();
  const list = readJson(scratchFile("plugins-orirohub-uninstalled.json"));
  if ((list.plugins || []).some((entry) => entry.id === pluginId)) {
    throw new Error(`OriroHub plugin still listed after uninstall: ${pluginId}`);
  }

  const configPath = path.join(process.env.HOME, ".oriro", "oriro.json");
  const config = fs.existsSync(configPath) ? readJson(configPath) : {};
  const installRecords = readPluginInstallRecords({
    configPath,
    fallbackRecords: config.plugins?.installs ?? {},
  });
  if (installRecords[pluginId]) {
    throw new Error(`OriroHub install record still present after uninstall: ${pluginId}`);
  }

  const configAfterUninstallPath = path.join(process.env.HOME, ".oriro", "oriro.json");
  const configAfterUninstall = fs.existsSync(configAfterUninstallPath)
    ? readJson(configAfterUninstallPath)
    : {};
  if (configAfterUninstall.plugins?.entries?.[pluginId]) {
    throw new Error(`OriroHub config entry still present after uninstall: ${pluginId}`);
  }
  if ((configAfterUninstall.plugins?.allow || []).includes(pluginId)) {
    throw new Error(`OriroHub allowlist entry still present after uninstall: ${pluginId}`);
  }
  if ((configAfterUninstall.plugins?.deny || []).includes(pluginId)) {
    throw new Error(`OriroHub denylist entry still present after uninstall: ${pluginId}`);
  }
  if (fs.existsSync(installPath)) {
    throw new Error(
      `OriroHub managed install directory still exists after uninstall: ${installPath}`,
    );
  }
}

function assertOriroHubUpdated() {
  assertTextFileIncludes(
    scratchFile("plugins-orirohub-update.log"),
    `${process.env.ORIROHUB_PLUGIN_ID} already at `,
    "OriroHub update output",
  );
  assertOriroHubInstalled();
}

const commands = {
  "record-fixture-plugin-trust": recordFixturePluginTrust,
  "demo-plugin": assertDemoPlugin,
  "plugin-tgz": assertPluginTgz,
  "plugin-tgz-removed": assertPluginTgzRemoved,
  "plugin-dir": assertPluginDir,
  "plugin-dir-removed": assertPluginDirRemoved,
  "plugin-dir-update-skipped": assertLocalPathUpdateSkipped,
  "plugin-dir-deps": assertPluginDirDeps,
  "plugin-dir-deps-removed": assertPluginDirDepsRemoved,
  "plugin-file": assertPluginFile,
  "plugin-file-removed": assertPluginFileRemoved,
  "plugin-npm": assertNpmPlugin,
  "plugin-npm-update": assertNpmPluginUpdateUnchanged,
  "plugin-npm-removed": assertNpmPluginRemoved,
  "invalid-oriro-extensions": assertInvalidOriroExtensionsRejected,
  "bundle-disabled": assertClaudeBundleDisabled,
  "bundle-inspect": assertClaudeBundleInspect,
  "slash-install": assertSlashInstall,
  "plugin-git": assertGitPlugin,
  "plugin-git-removed": assertGitPluginRemoved,
  "plugin-git-updated": assertGitPluginUpdated,
  "marketplace-list": assertMarketplaceList,
  "marketplace-installed": assertMarketplaceInstalled,
  "marketplace-records": assertMarketplaceRecords,
  "marketplace-updated": assertMarketplaceUpdated,
  "orirohub-preflight": assertOriroHubPreflight,
  "orirohub-installed": assertOriroHubInstalled,
  "orirohub-updated": assertOriroHubUpdated,
  "orirohub-removed": assertOriroHubRemoved,
};

const fn = commands[command];
if (!fn) {
  throw new Error(`unknown plugins assertion command: ${command}`);
}
await fn();
