/** Facade-backed doctor checks and cleanup for bundled browser plugin state. */
import fs from "node:fs";
import path from "node:path";
import { note } from "../../packages/terminal-core/src/note.js";
import type { OriroConfig } from "../config/types.oriro.js";
import { loadBundledPluginPublicSurfaceModuleSync } from "../plugin-sdk/facade-loader.js";
import { resolveConfigDir } from "../utils.js";

type BrowserDoctorDeps = {
  platform?: NodeJS.Platform;
  noteFn?: typeof note;
  env?: NodeJS.ProcessEnv;
  getUid?: () => number;
  resolveManagedExecutable?: (
    resolved: unknown,
    platform: NodeJS.Platform,
  ) => { path: string } | null;
  resolveChromeExecutable?: (platform: NodeJS.Platform) => { path: string } | null;
  readVersion?: (executablePath: string) => string | null;
  configDir?: string;
  pathExists?: (targetPath: string) => boolean;
};

type BrowserDoctorRepairDeps = {
  env?: NodeJS.ProcessEnv;
  configDir?: string;
  pathExists?: (targetPath: string) => boolean;
  movePathToTrash?: (targetPath: string) => Promise<string>;
};

/** Legacy browser profile paths detected before cleanup moves them aside. */
export type LegacyOrirodBrowserProfileResidue = {
  legacyProfileDir: string;
  legacyUserDataDir: string;
  canonicalUserDataDir: string;
};

type BrowserDoctorSurface = {
  noteChromeMcpBrowserReadiness: (cfg: OriroConfig, deps?: BrowserDoctorDeps) => Promise<void>;
  detectLegacyOrirodBrowserProfileResidue?: (
    cfg: OriroConfig,
    deps?: BrowserDoctorRepairDeps,
  ) => LegacyOrirodBrowserProfileResidue | null;
  maybeArchiveLegacyOrirodBrowserProfileResidue?: (
    cfg: OriroConfig,
    deps?: BrowserDoctorRepairDeps,
  ) => Promise<{ changes: string[]; warnings: string[] }>;
};

function loadBrowserDoctorSurface(): BrowserDoctorSurface {
  return loadBundledPluginPublicSurfaceModuleSync<BrowserDoctorSurface>({
    dirName: "browser",
    artifactBasename: "browser-doctor.js",
  });
}

function mayHaveLegacyOrirodBrowserProfileResidue(deps?: BrowserDoctorRepairDeps): boolean {
  const configDir = deps?.configDir ?? resolveConfigDir(deps?.env ?? process.env);
  const legacyProfileDir = path.join(configDir, "browser", "orirod");
  const legacyUserDataDir = path.join(legacyProfileDir, "user-data");
  const pathExists = deps?.pathExists ?? fs.existsSync;
  try {
    return pathExists(legacyProfileDir) || pathExists(legacyUserDataDir);
  } catch {
    return true;
  }
}

/** Emits browser readiness notes through the bundled browser plugin doctor surface. */
export async function noteChromeMcpBrowserReadiness(cfg: OriroConfig, deps?: BrowserDoctorDeps) {
  try {
    await loadBrowserDoctorSurface().noteChromeMcpBrowserReadiness(cfg, deps);
  } catch (error) {
    const noteFn = deps?.noteFn ?? note;
    const message = error instanceof Error ? error.message : String(error);
    noteFn(`- Browser health check is unavailable: ${message}`, "Browser");
  }
}

/** Detects old orirod browser profile residue without loading plugin cleanup when paths are absent. */
export async function detectLegacyOrirodBrowserProfileResidue(
  cfg: OriroConfig,
  deps?: BrowserDoctorRepairDeps,
): Promise<LegacyOrirodBrowserProfileResidue | null> {
  if (!mayHaveLegacyOrirodBrowserProfileResidue(deps)) {
    return null;
  }
  const detect = loadBrowserDoctorSurface().detectLegacyOrirodBrowserProfileResidue;
  if (!detect) {
    return null;
  }
  return detect(cfg, deps);
}

/** Archives legacy orirod browser profile residue through the browser plugin repair hook. */
export async function maybeArchiveLegacyOrirodBrowserProfileResidue(
  cfg: OriroConfig,
  deps?: BrowserDoctorRepairDeps,
): Promise<{ changes: string[]; warnings: string[] }> {
  if (!mayHaveLegacyOrirodBrowserProfileResidue(deps)) {
    return { changes: [], warnings: [] };
  }
  try {
    const repair = loadBrowserDoctorSurface().maybeArchiveLegacyOrirodBrowserProfileResidue;
    if (!repair) {
      return { changes: [], warnings: [] };
    }
    return await repair(cfg, deps);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      changes: [],
      warnings: [`Browser profile cleanup is unavailable: ${message}`],
    };
  }
}
