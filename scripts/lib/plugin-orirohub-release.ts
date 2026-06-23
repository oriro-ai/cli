// Plugin Orirohub Release script supports Oriro repository automation.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { validateExternalCodePluginPackageJson } from "../../packages/plugin-package-contract/src/index.ts";
import { readBoundedResponseText } from "./bounded-response.ts";
import {
  collectExtensionPackageJsonCandidates,
  collectChangedPathsFromGitRange,
  collectChangedExtensionIdsFromPaths,
  collectPublishablePluginPackageErrors,
  assertPluginReleaseVersionFloors,
  parsePluginReleaseArgs,
  resolvePublishablePluginVersion,
  resolveGitCommitSha,
  resolveChangedPublishablePluginPackages,
  resolveSelectedPublishablePluginPackages,
  type GitRangeSelection,
  type PluginReleaseSelectionMode,
} from "./plugin-npm-release.ts";

export { assertPluginReleaseVersionFloors, parsePluginReleaseArgs };

type PluginPackageJson = {
  name?: string;
  version?: string;
  private?: boolean;
  oriro?: {
    extensions?: string[];
    install?: {
      npmSpec?: string;
    };
    compat?: {
      pluginApi?: string;
      minGatewayVersion?: string;
    };
    build?: {
      oriroVersion?: string;
      pluginSdkVersion?: string;
    };
    release?: {
      publishToOriroHub?: boolean;
      publishToNpm?: boolean;
    };
  };
};

export type PublishablePluginPackage = {
  extensionId: string;
  packageDir: string;
  packageName: string;
  version: string;
  channel: "stable" | "alpha" | "beta";
  publishTag: "latest" | "alpha" | "beta";
};

type PluginReleasePlanItem = PublishablePluginPackage & {
  alreadyPublished: boolean;
  artifactName: string;
};

type PluginReleasePlan = {
  all: PluginReleasePlanItem[];
  candidates: PluginReleasePlanItem[];
  bootstrapCandidates: PluginReleasePlanItem[];
  missingTrustedPublisher: PluginReleasePlanItem[];
  skippedPublished: PluginReleasePlanItem[];
};

type OriroHubTrustedPublisherDetail = {
  trustedPublisher?: unknown;
};

type OriroHubTrustedPublisherConfig = {
  repository?: unknown;
  workflowFilename?: unknown;
  environment?: unknown;
};

type PluginReleasePlanItemWithPackageState = PluginReleasePlanItem & {
  packageExists: boolean;
  hasTrustedPublisher: boolean;
};

type OriroHubPublishablePluginPackageFilters = {
  extensionIds?: readonly string[];
  packageNames?: readonly string[];
};

const ORIROHUB_DEFAULT_REGISTRY = "https://orirohub.ai";
const ORIROHUB_REQUEST_TIMEOUT_MS = 30_000;
const ORIROHUB_RESPONSE_BODY_MAX_BYTES = 64 * 1024;
const ORIROHUB_RATE_LIMIT_RETRY_DELAYS_MS = [1_000, 3_000, 10_000] as const;
const ORIROHUB_MAX_RETRY_AFTER_MS = 60_000;
const ORIRO_PLUGIN_ORIROHUB_REPOSITORY = "oriro/oriro";
const ORIRO_PLUGIN_ORIROHUB_WORKFLOW_FILENAME = "plugin-orirohub-release.yml";
const SAFE_EXTENSION_ID_RE = /^[a-z0-9][a-z0-9._-]*$/;
const ORIROHUB_SHARED_RELEASE_INPUT_PATHS = [
  ".github/workflows/plugin-orirohub-release.yml",
  ".github/actions/setup-node-env",
  "package.json",
  "pnpm-lock.yaml",
  "packages/plugin-package-contract/src/index.ts",
  "scripts/lib/bounded-response.ts",
  "scripts/lib/npm-publish-plan.mjs",
  "scripts/lib/plugin-npm-release.ts",
  "scripts/lib/plugin-orirohub-release.ts",
  "scripts/oriro-npm-release-check.ts",
  "scripts/plugin-orirohub-publish.sh",
  "scripts/plugin-orirohub-release-check.ts",
  "scripts/plugin-orirohub-release-plan.ts",
] as const;

function getRegistryBaseUrl(explicit?: string) {
  return (
    explicit?.trim() ||
    process.env.ORIROHUB_REGISTRY?.trim() ||
    process.env.ORIROHUB_SITE?.trim() ||
    ORIROHUB_DEFAULT_REGISTRY
  );
}

type OriroHubRequestOptions = {
  fetchImpl?: typeof fetch;
  requestTimeoutMs?: number;
};

async function fetchOriroHubRequest(
  url: URL,
  options: OriroHubRequestOptions = {},
): Promise<{
  clearTimeout: () => void;
  response: Response;
  signal: AbortSignal;
  timeoutPromise: Promise<never>;
}> {
  const timeoutMs = options.requestTimeoutMs ?? ORIROHUB_REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutError = Object.assign(
    new Error(`OriroHub request timed out after ${timeoutMs}ms: ${url.href}`),
    { code: "ETIMEDOUT" },
  );
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort(timeoutError);
      reject(timeoutError);
    }, timeoutMs);
    timeout.unref?.();
  });

  try {
    const response = await Promise.race([
      (options.fetchImpl ?? fetch)(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      }),
      timeoutPromise,
    ]);
    return {
      clearTimeout: () => clearTimeout(timeout),
      response,
      signal: controller.signal,
      timeoutPromise,
    };
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

async function cancelOriroHubResponseBody(response: Response): Promise<void> {
  await response.body?.cancel().catch(() => undefined);
}

function formatOriroHubPackageArtifactName(
  plugin: Pick<PublishablePluginPackage, "packageName" | "version">,
) {
  const safeName = plugin.packageName
    .replace(/^@/u, "")
    .replace(/[^A-Za-z0-9_.-]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  return `orirohub-package-${safeName}-${plugin.version}`;
}

export function collectOriroHubPublishablePluginPackages(
  rootDir = resolve("."),
  filters: OriroHubPublishablePluginPackageFilters = {},
): PublishablePluginPackage[] {
  const publishable: PublishablePluginPackage[] = [];
  const validationErrors: string[] = [];
  const selectedExtensionIds = new Set(filters.extensionIds ?? []);
  const selectedPackageNames = new Set(filters.packageNames ?? []);
  const hasSelectedExtensionIds = Array.isArray(filters.extensionIds);
  const hasSelectedPackageNames = Array.isArray(filters.packageNames);

  for (const candidate of collectExtensionPackageJsonCandidates(rootDir)) {
    const { extensionId, packageDir, packageJson } = candidate;
    if (hasSelectedExtensionIds && !selectedExtensionIds.has(extensionId)) {
      continue;
    }
    const packageName = packageJson.name?.trim() ?? "";
    if (hasSelectedPackageNames && !selectedPackageNames.has(packageName)) {
      continue;
    }
    if (packageJson.oriro?.release?.publishToOriroHub !== true) {
      continue;
    }
    if (!SAFE_EXTENSION_ID_RE.test(extensionId)) {
      validationErrors.push(
        `${extensionId}: extension directory name must match ^[a-z0-9][a-z0-9._-]*$ for OriroHub publish.`,
      );
      continue;
    }

    const errors = collectPublishablePluginPackageErrors(candidate);
    if (errors.length > 0) {
      validationErrors.push(...errors.map((error) => `${extensionId}: ${error}`));
      continue;
    }
    const contractValidation = validateExternalCodePluginPackageJson(packageJson);
    if (contractValidation.issues.length > 0) {
      validationErrors.push(
        ...contractValidation.issues.map((issue) => `${extensionId}: ${issue.message}`),
      );
      continue;
    }

    const resolvedVersion = resolvePublishablePluginVersion({
      extensionId,
      packageJson,
      validationErrors,
    });
    if (!resolvedVersion) {
      continue;
    }
    const { version, parsedVersion } = resolvedVersion;

    publishable.push({
      extensionId,
      packageDir,
      packageName,
      version,
      channel: parsedVersion.channel,
      publishTag:
        parsedVersion.channel === "alpha"
          ? "alpha"
          : parsedVersion.channel === "beta"
            ? "beta"
            : "latest",
    });
  }

  if (validationErrors.length > 0) {
    throw new Error(
      `Publishable OriroHub plugin metadata validation failed:\n${validationErrors.map((error) => `- ${error}`).join("\n")}`,
    );
  }

  return publishable.toSorted((left, right) => left.packageName.localeCompare(right.packageName));
}

export function collectPluginOriroHubReleasePathsFromGitRange(params: {
  rootDir?: string;
  gitRange: GitRangeSelection;
}): string[] {
  return collectPluginOriroHubReleasePathsFromGitRangeForPathspecs(params, ["extensions"]);
}

function collectPluginOriroHubRelevantPathsFromGitRange(params: {
  rootDir?: string;
  gitRange: GitRangeSelection;
}): string[] {
  return collectPluginOriroHubReleasePathsFromGitRangeForPathspecs(params, [
    "extensions",
    ...ORIROHUB_SHARED_RELEASE_INPUT_PATHS,
  ]);
}

function collectPluginOriroHubReleasePathsFromGitRangeForPathspecs(
  params: {
    rootDir?: string;
    gitRange: GitRangeSelection;
  },
  pathspecs: readonly string[],
): string[] {
  return collectChangedPathsFromGitRange({
    rootDir: params.rootDir,
    gitRange: params.gitRange,
    pathspecs,
  });
}

function hasSharedOriroHubReleaseInputChanges(changedPaths: readonly string[]) {
  return changedPaths.some((path) =>
    ORIROHUB_SHARED_RELEASE_INPUT_PATHS.some(
      (sharedPath) => path === sharedPath || path.startsWith(`${sharedPath}/`),
    ),
  );
}

export function resolveChangedOriroHubPublishablePluginPackages(params: {
  plugins: PublishablePluginPackage[];
  changedPaths: readonly string[];
}): PublishablePluginPackage[] {
  return resolveChangedPublishablePluginPackages({
    plugins: params.plugins,
    changedExtensionIds: collectChangedExtensionIdsFromPaths(params.changedPaths),
  });
}

export function resolveSelectedOriroHubPublishablePluginPackages(params: {
  plugins: PublishablePluginPackage[];
  selection?: string[];
  selectionMode?: PluginReleaseSelectionMode;
  gitRange?: GitRangeSelection;
  rootDir?: string;
}): PublishablePluginPackage[] {
  if (params.selectionMode === "all-publishable") {
    return params.plugins;
  }
  if (params.selection && params.selection.length > 0) {
    return resolveSelectedPublishablePluginPackages({
      plugins: params.plugins,
      selection: params.selection,
    });
  }
  if (params.gitRange) {
    const changedPaths = collectPluginOriroHubRelevantPathsFromGitRange({
      rootDir: params.rootDir,
      gitRange: params.gitRange,
    });
    if (hasSharedOriroHubReleaseInputChanges(changedPaths)) {
      return params.plugins;
    }
    return resolveChangedOriroHubPublishablePluginPackages({
      plugins: params.plugins,
      changedPaths,
    });
  }
  return params.plugins;
}

function readPackageManifestAtGitRef(params: {
  rootDir?: string;
  ref: string;
  packageDir: string;
}): PluginPackageJson | null {
  const rootDir = params.rootDir ?? resolve(".");
  const commitSha = resolveGitCommitSha(rootDir, params.ref, "ref");
  try {
    const raw = execFileSync("git", ["show", `${commitSha}:${params.packageDir}/package.json`], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return JSON.parse(raw) as PluginPackageJson;
  } catch {
    return null;
  }
}

export function collectOriroHubVersionGateErrors(params: {
  plugins: PublishablePluginPackage[];
  gitRange: GitRangeSelection;
  rootDir?: string;
}): string[] {
  const changedPaths = collectPluginOriroHubReleasePathsFromGitRange({
    rootDir: params.rootDir,
    gitRange: params.gitRange,
  });
  const changedPlugins = resolveChangedOriroHubPublishablePluginPackages({
    plugins: params.plugins,
    changedPaths,
  });

  const errors: string[] = [];
  for (const plugin of changedPlugins) {
    const baseManifest = readPackageManifestAtGitRef({
      rootDir: params.rootDir,
      ref: params.gitRange.baseRef,
      packageDir: plugin.packageDir,
    });
    if (baseManifest?.oriro?.release?.publishToOriroHub !== true) {
      continue;
    }
    const baseVersion =
      typeof baseManifest.version === "string" && baseManifest.version.trim()
        ? baseManifest.version.trim()
        : null;
    if (baseVersion === null || baseVersion !== plugin.version) {
      continue;
    }
    errors.push(
      `${plugin.packageName}@${plugin.version}: changed publishable plugin still has the same version in package.json.`,
    );
  }

  return errors;
}

async function isPluginVersionPublishedOnOriroHub(
  packageName: string,
  version: string,
  options: {
    fetchImpl?: typeof fetch;
    registryBaseUrl?: string;
    requestTimeoutMs?: number;
  } = {},
): Promise<boolean> {
  const url = new URL(
    `/api/v1/packages/${encodeURIComponent(packageName)}/versions/${encodeURIComponent(version)}`,
    getRegistryBaseUrl(options.registryBaseUrl),
  );
  const request = await fetchOriroHubRequest(url, {
    fetchImpl: options.fetchImpl,
    requestTimeoutMs: options.requestTimeoutMs,
  });
  const { response } = request;

  try {
    if (response.status === 404) {
      return false;
    }
    if (response.ok) {
      return true;
    }

    throw new Error(
      `Failed to query OriroHub for ${packageName}@${version}: ${response.status} ${response.statusText}`,
    );
  } finally {
    await cancelOriroHubResponseBody(response);
    request.clearTimeout();
  }
}

async function doesOriroHubPackageExist(
  packageName: string,
  options: {
    fetchImpl?: typeof fetch;
    registryBaseUrl?: string;
    requestTimeoutMs?: number;
  } = {},
): Promise<boolean> {
  const url = new URL(
    `/api/v1/packages/${encodeURIComponent(packageName)}`,
    getRegistryBaseUrl(options.registryBaseUrl),
  );
  const request = await fetchOriroHubRequest(url, {
    fetchImpl: options.fetchImpl,
    requestTimeoutMs: options.requestTimeoutMs,
  });
  const { response } = request;

  try {
    if (response.status === 404) {
      return false;
    }
    if (!response.ok) {
      throw new Error(
        `Failed to query OriroHub package ${packageName}: ${response.status} ${response.statusText}`,
      );
    }

    return true;
  } finally {
    await cancelOriroHubResponseBody(response);
    request.clearTimeout();
  }
}

async function hasOriroHubTrustedPublisher(
  packageName: string,
  options: {
    fetchImpl?: typeof fetch;
    registryBaseUrl?: string;
    requestTimeoutMs?: number;
  } = {},
): Promise<boolean> {
  const url = new URL(
    `/api/v1/packages/${encodeURIComponent(packageName)}/trusted-publisher`,
    getRegistryBaseUrl(options.registryBaseUrl),
  );
  for (let attempt = 0; ; attempt += 1) {
    const request = await fetchOriroHubRequest(url, {
      fetchImpl: options.fetchImpl,
      requestTimeoutMs: options.requestTimeoutMs,
    });
    const { response } = request;

    const retryRateLimit =
      response.status === 429 && attempt < ORIROHUB_RATE_LIMIT_RETRY_DELAYS_MS.length;
    try {
      if (!retryRateLimit) {
        if (!response.ok) {
          throw new Error(
            `Failed to query OriroHub trusted publisher for ${packageName}: ${response.status} ${response.statusText}`,
          );
        }

        let trustedPublisherDetail: OriroHubTrustedPublisherDetail;
        const text = await readBoundedResponseText(
          response,
          `OriroHub trusted publisher ${packageName}`,
          ORIROHUB_RESPONSE_BODY_MAX_BYTES,
          {
            signal: request.signal,
            timeoutPromise: request.timeoutPromise,
          },
        );
        try {
          trustedPublisherDetail = JSON.parse(text) as OriroHubTrustedPublisherDetail;
        } catch (error) {
          throw new Error(`Failed to parse OriroHub trusted publisher ${packageName} response.`, {
            cause: error,
          });
        }

        return isOriroPluginTrustedPublisher(trustedPublisherDetail.trustedPublisher);
      }
    } finally {
      request.clearTimeout();
    }

    await response.body?.cancel().catch(() => undefined);
    await delay(oriroHubRetryDelayMs(response, attempt));
  }
}

function oriroHubRetryDelayMs(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after")?.trim();
  if (retryAfter) {
    const retryAfterSeconds = Number(retryAfter);
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
      const retryAfterMs = Math.round(retryAfterSeconds * 1_000);
      if (retryAfterMs <= ORIROHUB_MAX_RETRY_AFTER_MS) {
        return retryAfterMs;
      }
    }
    const retryAfterAt = Date.parse(retryAfter);
    if (Number.isFinite(retryAfterAt)) {
      const retryAfterMs = Math.max(0, retryAfterAt - Date.now());
      if (retryAfterMs <= ORIROHUB_MAX_RETRY_AFTER_MS) {
        return retryAfterMs;
      }
    }
  }
  return ORIROHUB_RATE_LIMIT_RETRY_DELAYS_MS[attempt] ?? 0;
}

async function delay(ms: number): Promise<void> {
  await new Promise<void>((resolveDelay) => {
    setTimeout(resolveDelay, ms);
  });
}

function isOriroPluginTrustedPublisher(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const trustedPublisher = value as OriroHubTrustedPublisherConfig;
  return (
    trustedPublisher.repository === ORIRO_PLUGIN_ORIROHUB_REPOSITORY &&
    trustedPublisher.workflowFilename === ORIRO_PLUGIN_ORIROHUB_WORKFLOW_FILENAME &&
    trustedPublisher.environment == null
  );
}

function stripPackageReleaseState(
  item: PluginReleasePlanItemWithPackageState,
): PluginReleasePlanItem {
  const {
    packageExists: _packageExists,
    hasTrustedPublisher: _hasTrustedPublisher,
    ...planItem
  } = item;
  return planItem;
}

export async function collectPluginOriroHubReleasePlan(params?: {
  rootDir?: string;
  selection?: string[];
  selectionMode?: PluginReleaseSelectionMode;
  gitRange?: GitRangeSelection;
  registryBaseUrl?: string;
  fetchImpl?: typeof fetch;
  requestTimeoutMs?: number;
}): Promise<PluginReleasePlan> {
  const rootDir = params?.rootDir;
  const selection = params?.selection ?? [];
  const changedPaths = params?.gitRange
    ? collectPluginOriroHubRelevantPathsFromGitRange({
        rootDir,
        gitRange: params.gitRange,
      })
    : [];
  const sharedInputChanged = hasSharedOriroHubReleaseInputChanges(changedPaths);
  const extensionIds =
    params?.selectionMode === "all-publishable" || !params?.gitRange || sharedInputChanged
      ? undefined
      : collectChangedExtensionIdsFromPaths(changedPaths);
  const allPublishable = collectOriroHubPublishablePluginPackages(rootDir, {
    extensionIds,
    packageNames: selection.length > 0 ? selection : undefined,
  });
  const selectedPublishable = resolveSelectedOriroHubPublishablePluginPackages({
    plugins: allPublishable,
    selection,
    selectionMode: params?.selectionMode,
    gitRange: params?.gitRange,
    rootDir,
  });

  const explicitPublishSelection = params?.selectionMode !== undefined || selection.length > 0;
  if (explicitPublishSelection) {
    assertPluginReleaseVersionFloors(selectedPublishable, "Plugin OriroHub release plan");
  }

  const planned: PluginReleasePlanItemWithPackageState[] = [];
  for (const plugin of selectedPublishable) {
    const packageExists = await doesOriroHubPackageExist(plugin.packageName, {
      registryBaseUrl: params?.registryBaseUrl,
      fetchImpl: params?.fetchImpl,
      requestTimeoutMs: params?.requestTimeoutMs,
    });
    const hasTrustedPublisher = packageExists
      ? await hasOriroHubTrustedPublisher(plugin.packageName, {
          registryBaseUrl: params?.registryBaseUrl,
          fetchImpl: params?.fetchImpl,
          requestTimeoutMs: params?.requestTimeoutMs,
        })
      : false;
    const alreadyPublished = packageExists
      ? await isPluginVersionPublishedOnOriroHub(plugin.packageName, plugin.version, {
          registryBaseUrl: params?.registryBaseUrl,
          fetchImpl: params?.fetchImpl,
          requestTimeoutMs: params?.requestTimeoutMs,
        })
      : false;

    planned.push({
      extensionId: plugin.extensionId,
      packageDir: plugin.packageDir,
      packageName: plugin.packageName,
      version: plugin.version,
      channel: plugin.channel,
      publishTag: plugin.publishTag,
      packageExists,
      hasTrustedPublisher,
      alreadyPublished,
      artifactName: formatOriroHubPackageArtifactName(plugin),
    });
  }
  const all = planned.map(stripPackageReleaseState);

  return {
    all,
    candidates: planned
      .filter(
        (plugin) => plugin.packageExists && plugin.hasTrustedPublisher && !plugin.alreadyPublished,
      )
      .map(stripPackageReleaseState),
    bootstrapCandidates: planned
      .filter((plugin) => !plugin.packageExists)
      .map(stripPackageReleaseState),
    missingTrustedPublisher: planned
      .filter((plugin) => plugin.packageExists && !plugin.hasTrustedPublisher)
      .map(stripPackageReleaseState),
    skippedPublished: planned
      .filter((plugin) => plugin.alreadyPublished)
      .map(stripPackageReleaseState),
  };
}
