// Fetches and validates OriroHub package metadata and artifacts.
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readResponseWithLimit } from "@oriro/media-core/read-response-with-limit";
import {
  normalizeLowercaseStringOrEmpty,
  normalizeOptionalString,
} from "@oriro/normalization-core/string-coerce";
import { normalizeStringEntries } from "@oriro/normalization-core/string-normalization";
import { parseStrictPositiveInteger } from "./parse-finite-number.js";
import { isAtLeast, parseSemver } from "./runtime-guard.js";
import { compareComparableSemver, parseComparableSemver } from "./semver-compare.js";
import { createTempDownloadTarget } from "./temp-download.js";
export { parseOriroHubPluginSpec } from "./orirohub-spec.js";

const DEFAULT_ORIROHUB_URL = "https://orirohub.ai";
const DEFAULT_GITHUB_CODELOAD_URL = "https://codeload.github.com";
const DEFAULT_FETCH_TIMEOUT_MS = 30_000;
const SKILL_CARD_MAX_BYTES = 256 * 1024;

export type OriroHubPackageFamily = "skill" | "code-plugin" | "bundle-plugin";
export type OriroHubPackageChannel = "official" | "community" | "private";
// Keep aligned with @oriro/plugin-package-contract ExternalPluginCompatibility.
export type OriroHubPackageCompatibility = {
  pluginApiRange?: string;
  builtWithOriroVersion?: string;
  pluginSdkVersion?: string;
  minGatewayVersion?: string;
};
export type OriroHubPackageHostTarget = {
  os?: string | null;
  arch?: string | null;
  libc?: string | null;
  key?: string | null;
};
export type OriroHubPackageEnvironmentSummary = {
  requiresLocalDesktop?: boolean;
  requiresBrowser?: boolean;
  requiresAudioDevice?: boolean;
  requiresNetwork?: boolean;
  requiresExternalServices?: string[];
  requiresOsPermissions?: string[];
  supportsRemoteHost?: boolean;
  knownUnsupported?: string[];
};
export type OriroHubPackageArtifactSummary = {
  kind?: string | null;
  sha256?: string | null;
  size?: number | null;
  format?: string | null;
  npmIntegrity?: string | null;
  npmShasum?: string | null;
  npmTarballName?: string | null;
  npmUnpackedSize?: number | null;
  npmFileCount?: number | null;
  downloadUrl?: string | null;
  tarballUrl?: string | null;
  legacyDownloadUrl?: string | null;
};
export type OriroHubArtifactKind = "legacy-zip" | "npm-pack";
export type OriroHubArtifactScanState =
  | "pending"
  | "clean"
  | "suspicious"
  | "malicious"
  | "not-run"
  | (string & {});
export type OriroHubArtifactModerationState = "approved" | "quarantined" | "revoked" | (string & {});
export type OriroHubResolvedArtifact =
  | {
      source: "orirohub";
      artifactKind: "legacy-zip";
      packageName: string;
      version: string;
      downloadUrl?: string | null;
      artifactSha256?: string | null;
      scanState?: OriroHubArtifactScanState | null;
      moderationState?: OriroHubArtifactModerationState | null;
    }
  | {
      source: "orirohub";
      artifactKind: "npm-pack";
      packageName: string;
      version: string;
      downloadUrl?: string | null;
      npmIntegrity: string;
      npmShasum?: string | null;
      artifactSha256?: string | null;
      scanState?: OriroHubArtifactScanState | null;
      moderationState?: OriroHubArtifactModerationState | null;
    };
export type OriroHubPackageArtifactResolverResponse = {
  package?: {
    name?: string | null;
    displayName?: string | null;
    family?: OriroHubPackageFamily | (string & {}) | null;
  } | null;
  version?:
    | ({
        version?: string | null;
        createdAt?: number | null;
        changelog?: string | null;
        distTags?: string[];
        files?: unknown[];
        sha256hash?: string | null;
        compatibility?: OriroHubPackageCompatibility | null;
        artifact?: OriroHubPackageArtifactSummary | null;
        oriropack?: OriroHubPackageOriroPackSummary | null;
      } & Record<string, unknown>)
    | string
    | null;
  artifact?: OriroHubResolvedArtifact | null;
};
export type OriroHubPackageOriroPackSummary = {
  available: boolean;
  specVersion?: number | null;
  format?: string | null;
  sha256?: string | null;
  size?: number | null;
  fileCount?: number | null;
  manifestSha256?: string | null;
  npmIntegrity?: string | null;
  npmShasum?: string | null;
  npmTarballName?: string | null;
  builtAt?: number | null;
  buildVersion?: string | null;
  hostTargets?: OriroHubPackageHostTarget[];
  environment?: OriroHubPackageEnvironmentSummary | null;
  runtimeBundles?: unknown[];
};
export type OriroHubPackageListItem = {
  name: string;
  displayName: string;
  family: OriroHubPackageFamily;
  runtimeId?: string | null;
  channel: OriroHubPackageChannel;
  isOfficial: boolean;
  summary?: string | null;
  ownerHandle?: string | null;
  createdAt: number;
  updatedAt: number;
  latestVersion?: string | null;
  capabilityTags?: string[];
  executesCode?: boolean;
  verificationTier?: string | null;
  oriropackAvailable?: boolean;
  hostTargetKeys?: string[];
  environmentFlags?: string[];
  artifact?: OriroHubPackageArtifactSummary | null;
  oriropack?: OriroHubPackageOriroPackSummary;
};
export type OriroHubPackageDetail = {
  package:
    | (OriroHubPackageListItem & {
        tags?: Record<string, string>;
        compatibility?: OriroHubPackageCompatibility | null;
        capabilities?: {
          executesCode?: boolean;
          runtimeId?: string;
          capabilityTags?: string[];
          bundleFormat?: string;
          hostTargets?: string[];
          pluginKind?: string;
          channels?: string[];
          providers?: string[];
          hooks?: string[];
          bundledSkills?: string[];
        } | null;
        verification?: {
          tier?: string;
          scope?: string;
          summary?: string;
          sourceRepo?: string;
          sourceCommit?: string;
          hasProvenance?: boolean;
          scanStatus?: string;
        } | null;
        artifact?: OriroHubPackageArtifactSummary | null;
        oriropack?: OriroHubPackageOriroPackSummary;
      })
    | null;
  owner?: {
    handle?: string | null;
    displayName?: string | null;
    image?: string | null;
  } | null;
};

export type OriroHubPackageVersion = {
  package: {
    name: string;
    displayName: string;
    family: OriroHubPackageFamily;
  } | null;
  version: {
    version: string;
    createdAt: number;
    changelog: string;
    distTags?: string[];
    files?: Array<{
      path: string;
      size?: number;
      sha256: string;
      contentType?: string;
    }>;
    sha256hash?: string | null;
    compatibility?: OriroHubPackageCompatibility | null;
    capabilities?: OriroHubPackageDetail["package"] extends infer T
      ? T extends { capabilities?: infer C }
        ? C
        : never
      : never;
    verification?: OriroHubPackageDetail["package"] extends infer T
      ? T extends { verification?: infer C }
        ? C
        : never
      : never;
    artifact?: OriroHubPackageArtifactSummary | null;
    oriropack?: OriroHubPackageOriroPackSummary;
  } | null;
};

export type OriroHubPackageSearchResult = {
  score: number;
  package: OriroHubPackageListItem;
};

export type OriroHubSkillSearchResult = {
  score: number;
  slug: string;
  displayName: string;
  summary?: string;
  version?: string;
  updatedAt?: number;
};

export type OriroHubSkillDetail = {
  skill: {
    slug: string;
    displayName: string;
    summary?: string;
    tags?: Record<string, string>;
    createdAt: number;
    updatedAt: number;
  } | null;
  latestVersion?: {
    version: string;
    createdAt: number;
    changelog?: string;
  } | null;
  metadata?: {
    os?: string[] | null;
    systems?: string[] | null;
  } | null;
  owner?: {
    handle?: string | null;
    displayName?: string | null;
    image?: string | null;
  } | null;
};

export type OriroHubSkillInstallResolutionResponse =
  | {
      ok: true;
      slug: string;
      installKind: "archive";
      archive: {
        version: string;
        downloadUrl: string;
      };
    }
  | {
      ok: true;
      slug: string;
      installKind: "github";
      github: {
        repo: string;
        path: string;
        commit: string;
        contentHash: string;
        sourceUrl: string;
      };
    }
  | {
      ok: false;
      slug: string;
      reason: string;
      message: string;
      status: number;
    };

export type OriroHubSkillVerificationDecision = "pass" | "fail" | (string & {});

export type OriroHubSkillVerificationResponse = {
  schema: "orirohub.skill.verify.v1";
  ok: boolean;
  decision: OriroHubSkillVerificationDecision;
  reasons: string[];
  skill: unknown;
  publisher: unknown;
  version: unknown;
  card: unknown;
  artifact: unknown;
  provenance: unknown;
  security: unknown;
  signature: unknown;
};

export type OriroHubSkillSecurityVerdictRequestItem = {
  slug: string;
  version: string;
};

export type OriroHubSkillSecurityVerdictItem = {
  ok: boolean;
  decision: OriroHubSkillVerificationDecision;
  reasons: string[];
  requestedSlug: string;
  requestedVersion: string;
  slug?: string | null;
  version?: string | null;
  displayName?: string | null;
  publisherHandle?: string | null;
  publisherDisplayName?: string | null;
  createdAt?: number | null;
  checkedAt?: number | null;
  skillUrl?: string | null;
  securityAuditUrl?: string | null;
  security?: unknown;
  error?: {
    code?: string;
    message?: string;
  };
};

export type OriroHubSkillSecurityVerdictsResponse = {
  schema: "orirohub.skill.security-verdicts.v1";
  items: OriroHubSkillSecurityVerdictItem[];
};

export type OriroHubDownloadResult = {
  archivePath: string;
  integrity: string;
  sha256Hex: string;
  artifact: "archive" | "oriropack";
  oriropackHeaderSha256?: string;
  oriropackHeaderSpecVersion?: number;
  npmIntegrity?: string;
  npmShasum?: string;
  npmTarballName?: string;
  cleanup: () => Promise<void>;
};

export type OriroHubInstallTelemetrySkill = {
  version?: string | null;
};

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

type OriroHubRequestParams = {
  baseUrl?: string;
  path?: string;
  url?: string;
  method?: "GET" | "POST";
  json?: unknown;
  token?: string;
  timeoutMs?: number;
  search?: Record<string, string | undefined>;
  fetchImpl?: FetchLike;
  skipAuth?: boolean;
};

type OriroHubConfigLike = {
  token?: unknown;
  accessToken?: unknown;
  authToken?: unknown;
  apiToken?: unknown;
  auth?: OriroHubConfigLike | null;
  session?: OriroHubConfigLike | null;
  credentials?: OriroHubConfigLike | null;
  user?: OriroHubConfigLike | null;
};

export class OriroHubRequestError extends Error {
  readonly status: number;
  readonly requestPath: string;
  readonly responseBody: string;

  constructor(params: { path: string; status: number; body: string }) {
    super(`OriroHub ${params.path} failed (${params.status}): ${params.body}`);
    this.name = "OriroHubRequestError";
    this.status = params.status;
    this.requestPath = params.path;
    this.responseBody = params.body;
  }
}

function normalizeBaseUrl(baseUrl?: string): string {
  const envValue =
    normalizeOptionalString(process.env.ORIRO_ORIROHUB_URL) ||
    normalizeOptionalString(process.env.ORIROHUB_URL) ||
    DEFAULT_ORIROHUB_URL;
  const value = (normalizeOptionalString(baseUrl) || envValue).replace(/\/+$/, "");
  return value || DEFAULT_ORIROHUB_URL;
}

function normalizeGitHubCodeloadBaseUrl(): string {
  const value =
    normalizeOptionalString(process.env.ORIRO_ORIROHUB_GITHUB_CODELOAD_BASE_URL) ||
    normalizeOptionalString(process.env.ORIROHUB_GITHUB_CODELOAD_BASE_URL) ||
    DEFAULT_GITHUB_CODELOAD_URL;
  return value.replace(/\/+$/, "") || DEFAULT_GITHUB_CODELOAD_URL;
}

function extractTokenFromOriroHubConfig(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as OriroHubConfigLike;
  return (
    normalizeOptionalString(record.accessToken) ??
    normalizeOptionalString(record.authToken) ??
    normalizeOptionalString(record.apiToken) ??
    normalizeOptionalString(record.token) ??
    extractTokenFromOriroHubConfig(record.auth) ??
    extractTokenFromOriroHubConfig(record.session) ??
    extractTokenFromOriroHubConfig(record.credentials) ??
    extractTokenFromOriroHubConfig(record.user)
  );
}

function resolveOriroHubConfigPaths(): string[] {
  const explicit =
    normalizeOptionalString(process.env.ORIRO_ORIROHUB_CONFIG_PATH) ||
    normalizeOptionalString(process.env.ORIROHUB_CONFIG_PATH) ||
    normalizeOptionalString(process.env.ORIRODHUB_CONFIG_PATH); // legacy misspelling from older orirohub CLI builds; keep for back-compat
  if (explicit) {
    return [explicit];
  }

  const xdgConfigHome = normalizeOptionalString(process.env.XDG_CONFIG_HOME);
  const configHome =
    xdgConfigHome && xdgConfigHome.length > 0 ? xdgConfigHome : path.join(os.homedir(), ".config");
  const xdgPath = path.join(configHome, "orirohub", "config.json");

  if (process.platform === "darwin") {
    return [
      path.join(os.homedir(), "Library", "Application Support", "orirohub", "config.json"),
      xdgPath,
    ];
  }

  return [xdgPath];
}

export async function resolveOriroHubAuthToken(): Promise<string | undefined> {
  const envToken =
    normalizeOptionalString(process.env.ORIRO_ORIROHUB_TOKEN) ||
    normalizeOptionalString(process.env.ORIROHUB_TOKEN) ||
    normalizeOptionalString(process.env.ORIROHUB_AUTH_TOKEN);
  if (envToken) {
    return envToken;
  }

  for (const configPath of resolveOriroHubConfigPaths()) {
    try {
      const raw = await fs.readFile(configPath, "utf8");
      const token = extractTokenFromOriroHubConfig(JSON.parse(raw));
      if (token) {
        return token;
      }
    } catch {
      // Try the next candidate path.
    }
  }
  return undefined;
}

function normalizePartialComparableVersion(version: string): {
  version: string;
  isPartial: boolean;
} {
  const trimmed = version.trim();
  return /^[vV]?[0-9]+\.[0-9]+$/.test(trimmed)
    ? { version: `${trimmed}.0`, isPartial: true }
    : { version: trimmed, isPartial: false };
}

function compareSemver(left: string, right: string): number | null {
  return compareComparableSemver(
    parseComparableSemver(normalizePartialComparableVersion(left).version),
    parseComparableSemver(normalizePartialComparableVersion(right).version),
  );
}

function upperBoundForCaret(version: string): string | null {
  const parsed = parseComparableSemver(normalizePartialComparableVersion(version).version);
  if (!parsed) {
    return null;
  }
  if (parsed.major > 0) {
    return `${parsed.major + 1}.0.0`;
  }
  if (parsed.minor > 0) {
    return `0.${parsed.minor + 1}.0`;
  }
  return `0.0.${parsed.patch + 1}`;
}

function matchWildcardComparator(token: string): "any" | "none" | null {
  const match = /^(>=|<=|>|<|=|\^|~)?\s*([*xX])$/.exec(token);
  if (!match) {
    return null;
  }
  const operator = match[1];
  return operator === ">" || operator === "<" ? "none" : "any";
}

function shouldPreservePluginApiPrereleaseFloor(target: string): boolean {
  return Boolean(
    parseComparableSemver(normalizePartialComparableVersion(target).version)?.prerelease?.length,
  );
}

function normalizePluginApiVersionForComparator(version: string, target: string): string {
  const normalizedCorrection = normalizeOriroNumericCorrectionForPluginApi(version);
  if (normalizedCorrection) {
    return normalizedCorrection;
  }
  return shouldPreservePluginApiPrereleaseFloor(target)
    ? version
    : normalizeOriroReleaseSuffixForPluginApi(version);
}

function satisfiesComparator(version: string, token: string): boolean {
  const trimmed = token.trim();
  if (!trimmed) {
    return true;
  }
  const wildcard = matchWildcardComparator(trimmed);
  if (wildcard) {
    return wildcard === "any" && parseComparableSemver(version) != null;
  }
  if (trimmed.startsWith("^")) {
    const base = trimmed.slice(1).trim();
    const upperBound = upperBoundForCaret(base);
    const comparableVersion = normalizePluginApiVersionForComparator(version, base);
    const lowerCmp = compareSemver(comparableVersion, base);
    const upperCmp = upperBound ? compareSemver(comparableVersion, upperBound) : null;
    return lowerCmp != null && upperCmp != null && lowerCmp >= 0 && upperCmp < 0;
  }

  const match = /^(>=|<=|>|<|=)?\s*(.+)$/.exec(trimmed);
  if (!match) {
    return false;
  }
  const operator = match[1];
  const target = match[2]?.trim();
  if (!target) {
    return false;
  }
  const comparableVersion = normalizePluginApiVersionForComparator(version, target);
  const normalizedTarget = normalizePartialComparableVersion(target);
  const cmp = compareSemver(comparableVersion, normalizedTarget.version);
  if (cmp == null) {
    return false;
  }
  switch (operator) {
    case ">=":
      return cmp >= 0;
    case "<=":
      return cmp <= 0;
    case ">":
      return cmp > 0;
    case "<":
      return cmp < 0;
    default:
      return normalizedTarget.isPartial && !operator ? cmp >= 0 : cmp === 0;
  }
}

function satisfiesSemverRange(version: string, range: string): boolean {
  const tokens = normalizeStringEntries(range.trim().split(/\s+/));
  if (tokens.length === 0) {
    return false;
  }
  return tokens.every((token) => satisfiesComparator(version, token));
}

const ORIRO_RELEASE_SUFFIX_PATTERN =
  /^[vV]?(\d{4}\.[1-9]\d?\.[1-9]\d*)(?:-\d+|-(?:alpha|beta|rc)\.\d+)$/i;
const ORIRO_NUMERIC_CORRECTION_PATTERN = /^[vV]?(\d{4}\.[1-9]\d?\.[1-9]\d*)-\d+$/;

function normalizeOriroNumericCorrectionForPluginApi(
  pluginApiVersion: string,
): string | undefined {
  return ORIRO_NUMERIC_CORRECTION_PATTERN.exec(pluginApiVersion.trim())?.[1];
}

function normalizeOriroReleaseSuffixForPluginApi(pluginApiVersion: string): string {
  const match = ORIRO_RELEASE_SUFFIX_PATTERN.exec(pluginApiVersion.trim());
  return match?.[1] ?? pluginApiVersion;
}

function buildUrl(params: Pick<OriroHubRequestParams, "baseUrl" | "path" | "search" | "url">): URL {
  if (params.url) {
    const url = new URL(params.url, `${normalizeBaseUrl(params.baseUrl)}/`);
    for (const [key, value] of Object.entries(params.search ?? {})) {
      if (!value) {
        continue;
      }
      url.searchParams.set(key, value);
    }
    return url;
  }
  if (!params.path) {
    throw new Error("OriroHub request path is required");
  }
  const url = new URL(`${normalizeBaseUrl(params.baseUrl)}/`);
  const basePath = url.pathname.replace(/\/+$/, "");
  const requestPath = params.path.startsWith("/") ? params.path : `/${params.path}`;
  url.pathname = `${basePath}${requestPath}`;
  for (const [key, value] of Object.entries(params.search ?? {})) {
    if (!value) {
      continue;
    }
    url.searchParams.set(key, value);
  }
  return url;
}

async function orirohubRequest(
  params: OriroHubRequestParams,
): Promise<{ response: Response; url: URL; hasToken: boolean }> {
  const url = buildUrl(params);
  const token = params.skipAuth
    ? undefined
    : normalizeOptionalString(params.token) || (await resolveOriroHubAuthToken());
  const controller = new AbortController();
  const timeout = setTimeout(
    () =>
      controller.abort(
        new Error(
          `OriroHub request timed out after ${params.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS}ms`,
        ),
      ),
    params.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS,
  );
  try {
    const headers = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(params.json === undefined ? {} : { "Content-Type": "application/json" }),
    };
    const init: RequestInit = { signal: controller.signal };
    if (params.method) {
      init.method = params.method;
    }
    if (Object.keys(headers).length > 0) {
      init.headers = headers;
    }
    if (params.json !== undefined) {
      init.body = JSON.stringify(params.json);
    }
    const response = await (params.fetchImpl ?? fetch)(url, init);
    return { response, url, hasToken: Boolean(token) };
  } finally {
    clearTimeout(timeout);
  }
}

async function readErrorBody(response: Response): Promise<string> {
  try {
    const text = (await response.text()).trim();
    return text || response.statusText || `HTTP ${response.status}`;
  } catch {
    return response.statusText || `HTTP ${response.status}`;
  }
}

async function buildOriroHubError(
  response: Response,
  url: URL,
  hasToken: boolean,
): Promise<OriroHubRequestError> {
  let body = await readErrorBody(response);
  if (response.status === 429) {
    const suffix = formatRateLimitSuffix(response.headers, hasToken);
    if (suffix) {
      body = `${body} ${suffix}`;
    }
  }
  return new OriroHubRequestError({
    path: url.pathname,
    status: response.status,
    body,
  });
}

function formatRateLimitSuffix(headers: Headers, hasToken: boolean): string {
  const reset =
    normalizeHeaderValue(headers.get("RateLimit-Reset")) ??
    normalizeHeaderValue(headers.get("Retry-After"));
  const segments: string[] = [];
  if (reset && Number.isFinite(Number(reset))) {
    segments.push(`(resets in ${reset}s)`);
  }
  if (!hasToken) {
    segments.push("Sign in for higher rate limits.");
  }
  return segments.join(" ");
}

async function fetchJson<T>(params: OriroHubRequestParams): Promise<T> {
  const { response, url, hasToken } = await orirohubRequest(params);
  if (!response.ok) {
    throw await buildOriroHubError(response, url, hasToken);
  }
  try {
    return (await response.json()) as T;
  } catch (cause) {
    throw new Error(`OriroHub ${url.pathname} returned malformed JSON`, { cause });
  }
}

async function readOriroHubResponseBytes(params: {
  response: Response;
  maxBytes?: number;
  timeoutMs?: number;
  resourceLabel: string;
}): Promise<Uint8Array> {
  const timeoutMs = params.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  return await readResponseWithLimit(params.response, params.maxBytes ?? Number.MAX_SAFE_INTEGER, {
    chunkTimeoutMs: timeoutMs,
    onOverflow: ({ size, maxBytes }) =>
      new Error(
        `OriroHub ${params.resourceLabel} exceeded ${maxBytes} bytes (${size} bytes received)`,
      ),
    onIdleTimeout: ({ chunkTimeoutMs }) =>
      new Error(`OriroHub ${params.resourceLabel} body stalled after ${chunkTimeoutMs}ms`),
  });
}

/** Resolves the configured OriroHub base URL, falling back to the default public host. */
export function resolveOriroHubBaseUrl(baseUrl?: string): string {
  return normalizeBaseUrl(baseUrl);
}

export function isDefaultOriroHubBaseUrl(baseUrl?: string): boolean {
  return normalizeBaseUrl(baseUrl) === normalizeBaseUrl(DEFAULT_ORIROHUB_URL);
}

function buildVersionOrTagSearch(params: {
  version?: string;
  tag?: string;
  ownerHandle?: string;
}): { version?: string; tag?: string; ownerHandle?: string } | undefined {
  const version = normalizeOptionalString(params.version);
  const ownerHandle = normalizeOptionalString(params.ownerHandle);
  if (version) {
    return { version, ...(ownerHandle ? { ownerHandle } : {}) };
  }
  const tag = normalizeOptionalString(params.tag);
  if (tag) {
    return { tag, ...(ownerHandle ? { ownerHandle } : {}) };
  }
  return ownerHandle ? { ownerHandle } : undefined;
}

function buildGitHubZipUrl(repo: string, commit: string): string {
  const url = new URL(`${normalizeGitHubCodeloadBaseUrl()}/`);
  const basePath = url.pathname.replace(/\/+$/, "");
  const repoPath = repo
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  url.pathname = `${basePath}/${repoPath}/zip/${encodeURIComponent(commit)}`;
  return url.toString();
}

function formatSha256Integrity(bytes: Uint8Array): string {
  const digest = createHash("sha256").update(bytes).digest("base64");
  return `sha256-${digest}`;
}

function formatSha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function formatSha512Integrity(bytes: Uint8Array): string {
  const digest = createHash("sha512").update(bytes).digest("base64");
  return `sha512-${digest}`;
}

function formatSha1Hex(bytes: Uint8Array): string {
  return createHash("sha1").update(bytes).digest("hex");
}

function normalizeHeaderValue(value: string | null): string | undefined {
  const normalized = normalizeOptionalString(value);
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function safePackageTarballName(name: string, version: string): string {
  const base = name
    .replace(/^@/, "")
    .replace(/[\\/]+/g, "-")
    .replace(/[^A-Za-z0-9._-]/g, "-");
  return `${base || "package"}-${version}.tgz`;
}

/** Normalizes OriroHub SHA-256 metadata into Subresource Integrity format. */
export function normalizeOriroHubSha256Integrity(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const prefixedBase64 = /^sha256-([A-Za-z0-9+/]+={0,1})$/.exec(trimmed);
  if (prefixedBase64?.[1]) {
    try {
      const decoded = Buffer.from(prefixedBase64[1], "base64");
      if (decoded.length === 32) {
        return `sha256-${decoded.toString("base64")}`;
      }
    } catch {
      return null;
    }
    return null;
  }
  const prefixedHex = /^sha256:([A-Fa-f0-9]{64})$/.exec(trimmed);
  if (prefixedHex?.[1]) {
    return `sha256-${Buffer.from(prefixedHex[1], "hex").toString("base64")}`;
  }
  if (/^[A-Fa-f0-9]{64}$/.test(trimmed)) {
    return `sha256-${Buffer.from(trimmed, "hex").toString("base64")}`;
  }
  return null;
}

/** Normalizes OriroHub SHA-256 metadata into lowercase hex form. */
export function normalizeOriroHubSha256Hex(value: string): string | null {
  const trimmed = value.trim();
  if (!/^[A-Fa-f0-9]{64}$/.test(trimmed)) {
    return null;
  }
  return normalizeLowercaseStringOrEmpty(trimmed);
}

export async function fetchOriroHubPackageDetail(params: {
  name: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}): Promise<OriroHubPackageDetail> {
  return await fetchJson<OriroHubPackageDetail>({
    baseUrl: params.baseUrl,
    path: `/api/v1/packages/${encodeURIComponent(params.name)}`,
    token: params.token,
    timeoutMs: params.timeoutMs,
    fetchImpl: params.fetchImpl,
  });
}

export async function fetchOriroHubPackageVersion(params: {
  name: string;
  version: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}): Promise<OriroHubPackageVersion> {
  return await fetchJson<OriroHubPackageVersion>({
    baseUrl: params.baseUrl,
    path: `/api/v1/packages/${encodeURIComponent(params.name)}/versions/${encodeURIComponent(
      params.version,
    )}`,
    token: params.token,
    timeoutMs: params.timeoutMs,
    fetchImpl: params.fetchImpl,
  });
}

export async function fetchOriroHubPackageArtifact(params: {
  name: string;
  version: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}): Promise<OriroHubPackageArtifactResolverResponse> {
  return await fetchJson<OriroHubPackageArtifactResolverResponse>({
    baseUrl: params.baseUrl,
    path: `/api/v1/packages/${encodeURIComponent(params.name)}/versions/${encodeURIComponent(
      params.version,
    )}/artifact`,
    token: params.token,
    timeoutMs: params.timeoutMs,
    fetchImpl: params.fetchImpl,
  });
}

export async function searchOriroHubPackages(params: {
  query: string;
  family?: OriroHubPackageFamily;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
  limit?: number;
}): Promise<OriroHubPackageSearchResult[]> {
  const result = await fetchJson<{ results: OriroHubPackageSearchResult[] }>({
    baseUrl: params.baseUrl,
    path: "/api/v1/packages/search",
    token: params.token,
    timeoutMs: params.timeoutMs,
    fetchImpl: params.fetchImpl,
    search: {
      q: params.query.trim(),
      family: params.family,
      limit: params.limit ? String(params.limit) : undefined,
    },
  });
  return result.results ?? [];
}

export async function searchOriroHubSkills(params: {
  query: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
  limit?: number;
}): Promise<OriroHubSkillSearchResult[]> {
  const result = await fetchJson<{ results: OriroHubSkillSearchResult[] }>({
    baseUrl: params.baseUrl,
    path: "/api/v1/search",
    token: params.token,
    timeoutMs: params.timeoutMs,
    fetchImpl: params.fetchImpl,
    search: {
      q: params.query.trim(),
      limit: params.limit ? String(params.limit) : undefined,
    },
  });
  return result.results ?? [];
}

export async function fetchOriroHubSkillDetail(params: {
  slug: string;
  ownerHandle?: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}): Promise<OriroHubSkillDetail> {
  return await fetchJson<OriroHubSkillDetail>({
    baseUrl: params.baseUrl,
    path: `/api/v1/skills/${encodeURIComponent(params.slug)}`,
    token: params.token,
    timeoutMs: params.timeoutMs,
    fetchImpl: params.fetchImpl,
    search: params.ownerHandle ? { ownerHandle: params.ownerHandle } : undefined,
  });
}

export async function fetchOriroHubSkillInstallResolution(params: {
  slug: string;
  ownerHandle?: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
  forceInstall?: boolean;
}): Promise<OriroHubSkillInstallResolutionResponse> {
  const { response, url, hasToken } = await orirohubRequest({
    baseUrl: params.baseUrl,
    path: `/api/v1/skills/${encodeURIComponent(params.slug)}/install`,
    token: params.token,
    timeoutMs: params.timeoutMs,
    fetchImpl: params.fetchImpl,
    search: {
      ownerHandle: params.ownerHandle,
      forceInstall: params.forceInstall ? "1" : undefined,
    },
  });
  const isStructuredBlock = [403, 409, 410, 423].includes(response.status);
  if (!response.ok && !isStructuredBlock) {
    throw await buildOriroHubError(response, url, hasToken);
  }
  try {
    return (await response.json()) as OriroHubSkillInstallResolutionResponse;
  } catch (cause) {
    throw new Error(`OriroHub ${url.pathname} returned malformed JSON`, { cause });
  }
}

export async function fetchOriroHubSkillVerification(params: {
  slug: string;
  ownerHandle?: string;
  version?: string;
  tag?: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}): Promise<OriroHubSkillVerificationResponse> {
  return await fetchJson<OriroHubSkillVerificationResponse>({
    baseUrl: params.baseUrl,
    path: `/api/v1/skills/${encodeURIComponent(params.slug)}/verify`,
    token: params.token,
    timeoutMs: params.timeoutMs,
    fetchImpl: params.fetchImpl,
    search: buildVersionOrTagSearch(params),
  });
}

export async function fetchOriroHubSkillSecurityVerdicts(params: {
  items: OriroHubSkillSecurityVerdictRequestItem[];
  baseUrl?: string;
  token?: string;
  skipAuth?: boolean;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}): Promise<OriroHubSkillSecurityVerdictsResponse> {
  return await fetchJson<OriroHubSkillSecurityVerdictsResponse>({
    baseUrl: params.baseUrl,
    path: "/api/v1/skills/-/security-verdicts",
    method: "POST",
    json: { items: params.items },
    token: params.token,
    skipAuth: params.skipAuth,
    timeoutMs: params.timeoutMs,
    fetchImpl: params.fetchImpl,
  });
}

export async function fetchOriroHubSkillCard(params: {
  slug?: string;
  ownerHandle?: string;
  url?: string;
  version?: string;
  tag?: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}): Promise<string> {
  const cardUrl = normalizeOptionalString(params.url);
  const slug = normalizeOptionalString(params.slug);
  if (!cardUrl && !slug) {
    throw new Error("OriroHub skill card fetch requires a slug or card URL");
  }
  const explicitToken = normalizeOptionalString(params.token);
  const skipAuth =
    cardUrl != null &&
    explicitToken == null &&
    new URL(cardUrl, `${normalizeBaseUrl(params.baseUrl)}/`).origin !==
      new URL(`${normalizeBaseUrl(params.baseUrl)}/`).origin;
  const { response, url, hasToken } = await orirohubRequest({
    baseUrl: params.baseUrl,
    url: cardUrl,
    path: slug ? `/api/v1/skills/${encodeURIComponent(slug)}/card` : undefined,
    token: explicitToken,
    timeoutMs: params.timeoutMs,
    fetchImpl: params.fetchImpl,
    search: cardUrl ? undefined : buildVersionOrTagSearch(params),
    skipAuth,
  });
  if (!response.ok) {
    throw await buildOriroHubError(response, url, hasToken);
  }
  const bytes = await readOriroHubResponseBytes({
    response,
    maxBytes: SKILL_CARD_MAX_BYTES,
    timeoutMs: params.timeoutMs,
    resourceLabel: slug ? `skill card for ${slug}` : `skill card at ${url.pathname}`,
  });
  return new TextDecoder().decode(bytes);
}

export async function downloadOriroHubPackageArchive(params: {
  name: string;
  version?: string;
  tag?: string;
  artifact?: "archive" | "oriropack";
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}): Promise<OriroHubDownloadResult> {
  if (params.artifact === "oriropack") {
    if (!params.version) {
      throw new Error("OriroPack package downloads require an explicit version.");
    }
    const { response, url, hasToken } = await orirohubRequest({
      baseUrl: params.baseUrl,
      path: `/api/v1/packages/${encodeURIComponent(params.name)}/versions/${encodeURIComponent(
        params.version,
      )}/artifact/download`,
      token: params.token,
      timeoutMs: params.timeoutMs,
      fetchImpl: params.fetchImpl,
    });
    if (!response.ok) {
      throw await buildOriroHubError(response, url, hasToken);
    }
    const bytes = await readOriroHubResponseBytes({
      response,
      timeoutMs: params.timeoutMs,
      resourceLabel: `OriroPack download for ${params.name}@${params.version}`,
    });
    const sha256Hex = formatSha256Hex(bytes);
    const npmIntegrity = formatSha512Integrity(bytes);
    const npmShasum = formatSha1Hex(bytes);
    const headerSha256 = normalizeOriroHubSha256Hex(
      response.headers.get("X-OriroHub-Artifact-Sha256") ??
        response.headers.get("X-OriroHub-OriroPack-Sha256") ??
        "",
    );
    if (!headerSha256) {
      throw new Error(
        `OriroHub OriroPack download for "${params.name}@${params.version}" is missing X-OriroHub-Artifact-Sha256.`,
      );
    }
    if (headerSha256 !== sha256Hex) {
      throw new Error(
        `OriroHub OriroPack download for "${params.name}@${params.version}" declared sha256 ${headerSha256}, got ${sha256Hex}.`,
      );
    }
    const headerNpmIntegrity = normalizeHeaderValue(
      response.headers.get("X-OriroHub-Npm-Integrity"),
    );
    if (headerNpmIntegrity && headerNpmIntegrity !== npmIntegrity) {
      throw new Error(
        `OriroHub OriroPack download for "${params.name}@${params.version}" declared npm integrity ${headerNpmIntegrity}, got ${npmIntegrity}.`,
      );
    }
    const headerNpmShasum = normalizeHeaderValue(response.headers.get("X-OriroHub-Npm-Shasum"));
    if (headerNpmShasum && headerNpmShasum !== npmShasum) {
      throw new Error(
        `OriroHub OriroPack download for "${params.name}@${params.version}" declared npm shasum ${headerNpmShasum}, got ${npmShasum}.`,
      );
    }
    const npmTarballName =
      normalizeHeaderValue(response.headers.get("X-OriroHub-Npm-Tarball-Name")) ??
      safePackageTarballName(params.name, params.version);
    const rawSpecVersion = response.headers.get("X-OriroHub-OriroPack-Spec-Version");
    const specVersion = parseStrictPositiveInteger(rawSpecVersion);
    const target = await createTempDownloadTarget({
      prefix: "oriro-orirohub-oriropack",
      fileName: npmTarballName,
      tmpDir: os.tmpdir(),
    });
    await fs.writeFile(target.path, bytes);
    return {
      archivePath: target.path,
      integrity: normalizeOriroHubSha256Integrity(sha256Hex) ?? formatSha256Integrity(bytes),
      sha256Hex,
      artifact: "oriropack",
      oriropackHeaderSha256: headerSha256,
      ...(typeof specVersion === "number" && Number.isSafeInteger(specVersion) && specVersion >= 0
        ? { oriropackHeaderSpecVersion: specVersion }
        : {}),
      npmIntegrity,
      npmShasum,
      npmTarballName,
      cleanup: target.cleanup,
    };
  }
  const search = params.version
    ? { version: params.version }
    : params.tag
      ? { tag: params.tag }
      : undefined;
  const { response, url, hasToken } = await orirohubRequest({
    baseUrl: params.baseUrl,
    path: `/api/v1/packages/${encodeURIComponent(params.name)}/download`,
    search,
    token: params.token,
    timeoutMs: params.timeoutMs,
    fetchImpl: params.fetchImpl,
  });
  if (!response.ok) {
    throw await buildOriroHubError(response, url, hasToken);
  }
  const bytes = await readOriroHubResponseBytes({
    response,
    timeoutMs: params.timeoutMs,
    resourceLabel: `package archive download for ${params.name}`,
  });
  const sha256Hex = formatSha256Hex(bytes);
  const target = await createTempDownloadTarget({
    prefix: "oriro-orirohub-package",
    fileName: `${params.name}.zip`,
    tmpDir: os.tmpdir(),
  });
  await fs.writeFile(target.path, bytes);
  return {
    archivePath: target.path,
    integrity: formatSha256Integrity(bytes),
    sha256Hex,
    artifact: "archive",
    cleanup: target.cleanup,
  };
}

export async function downloadOriroHubSkillArchive(params: {
  slug: string;
  ownerHandle?: string;
  version?: string;
  tag?: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}): Promise<OriroHubDownloadResult> {
  const { response, url, hasToken } = await orirohubRequest({
    baseUrl: params.baseUrl,
    path: "/api/v1/download",
    token: params.token,
    timeoutMs: params.timeoutMs,
    fetchImpl: params.fetchImpl,
    search: {
      slug: params.slug,
      ownerHandle: params.ownerHandle,
      version: params.version,
      tag: params.version ? undefined : params.tag,
    },
  });
  if (!response.ok) {
    throw await buildOriroHubError(response, url, hasToken);
  }
  const bytes = await readOriroHubResponseBytes({
    response,
    timeoutMs: params.timeoutMs,
    resourceLabel: `skill archive download for ${params.slug}`,
  });
  const sha256Hex = formatSha256Hex(bytes);
  const target = await createTempDownloadTarget({
    prefix: "oriro-orirohub-skill",
    fileName: `${params.slug}.zip`,
    tmpDir: os.tmpdir(),
  });
  await fs.writeFile(target.path, bytes);
  return {
    archivePath: target.path,
    integrity: formatSha256Integrity(bytes),
    sha256Hex,
    artifact: "archive",
    cleanup: target.cleanup,
  };
}

export async function downloadOriroHubSkillArchiveUrl(params: {
  url: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}): Promise<OriroHubDownloadResult> {
  const explicitToken = normalizeOptionalString(params.token);
  const requestUrl = new URL(params.url, `${normalizeBaseUrl(params.baseUrl)}/`);
  const registryOrigin = new URL(`${normalizeBaseUrl(params.baseUrl)}/`).origin;
  const skipAuth = explicitToken == null && requestUrl.origin !== registryOrigin;
  const { response, url, hasToken } = await orirohubRequest({
    baseUrl: params.baseUrl,
    url: params.url,
    token: explicitToken,
    timeoutMs: params.timeoutMs,
    fetchImpl: params.fetchImpl,
    skipAuth,
  });
  if (!response.ok) {
    throw await buildOriroHubError(response, url, hasToken);
  }
  const bytes = await readOriroHubResponseBytes({
    response,
    timeoutMs: params.timeoutMs,
    resourceLabel: `skill archive download at ${url.pathname}`,
  });
  const sha256Hex = formatSha256Hex(bytes);
  const target = await createTempDownloadTarget({
    prefix: "oriro-orirohub-skill",
    fileName: "skill.zip",
    tmpDir: os.tmpdir(),
  });
  await fs.writeFile(target.path, bytes);
  return {
    archivePath: target.path,
    integrity: formatSha256Integrity(bytes),
    sha256Hex,
    artifact: "archive",
    cleanup: target.cleanup,
  };
}

export async function downloadOriroHubGitHubSkillArchive(params: {
  repo: string;
  commit: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}): Promise<OriroHubDownloadResult> {
  const downloadUrl = buildGitHubZipUrl(params.repo, params.commit);
  const { response, url, hasToken } = await orirohubRequest({
    url: downloadUrl,
    skipAuth: true,
    timeoutMs: params.timeoutMs,
    fetchImpl: params.fetchImpl,
  });
  if (!response.ok) {
    throw await buildOriroHubError(response, url, hasToken);
  }
  const bytes = await readOriroHubResponseBytes({
    response,
    timeoutMs: params.timeoutMs,
    resourceLabel: `GitHub source archive for ${params.repo}@${params.commit}`,
  });
  const sha256Hex = formatSha256Hex(bytes);
  const target = await createTempDownloadTarget({
    prefix: "oriro-orirohub-github-skill",
    fileName: `${params.commit}.zip`,
    tmpDir: os.tmpdir(),
  });
  await fs.writeFile(target.path, bytes);
  return {
    archivePath: target.path,
    integrity: formatSha256Integrity(bytes),
    sha256Hex,
    artifact: "archive",
    cleanup: target.cleanup,
  };
}

export async function reportOriroHubSkillInstallTelemetry(params: {
  baseUrl?: string;
  token?: string;
  root: string;
  skills: Record<string, OriroHubInstallTelemetrySkill>;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}): Promise<void> {
  const token = normalizeOptionalString(params.token) ?? (await resolveOriroHubAuthToken());
  if (!token || isOriroHubTelemetryDisabled()) {
    return;
  }
  const skills = Object.entries(params.skills)
    .map(([slug, entry]) => ({
      slug,
      version: entry.version ?? null,
    }))
    .filter((entry) => entry.slug.length > 0);

  const { response, url, hasToken } = await orirohubRequest({
    baseUrl: params.baseUrl,
    path: "/api/cli/telemetry/install",
    method: "POST",
    token,
    timeoutMs: params.timeoutMs,
    fetchImpl: params.fetchImpl,
    json: {
      roots: [
        {
          rootId: createHash("sha256").update(path.resolve(params.root)).digest("hex"),
          label: formatTelemetryRootLabel(params.root),
          skills,
        },
      ],
    },
  });
  if (!response.ok) {
    throw await buildOriroHubError(response, url, hasToken);
  }
}

function isOriroHubTelemetryDisabled(): boolean {
  const raw = process.env.ORIROHUB_DISABLE_TELEMETRY ?? process.env.ORIRODHUB_DISABLE_TELEMETRY;
  if (!raw) {
    return false;
  }
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

function formatTelemetryRootLabel(root: string): string {
  const home = os.homedir();
  const absolute = path.resolve(root);
  if (absolute === home) {
    return "~";
  }
  const normalized = absolute.replaceAll("\\", "/");
  const normalizedHome = home.replaceAll("\\", "/");
  const withinHome = normalized.startsWith(`${normalizedHome}/`);
  const stripped = withinHome ? normalized.slice(normalizedHome.length + 1) : normalized;
  const tail = stripped.split("/").filter(Boolean).slice(-2).join("/");
  return withinHome ? `~/${tail}` : tail || absolute;
}

/** Resolves the preferred latest package version from detail metadata. */
export function resolveLatestVersionFromPackage(detail: OriroHubPackageDetail): string | null {
  return detail.package?.latestVersion ?? detail.package?.tags?.latest ?? null;
}

/** Checks whether a host plugin API version satisfies a OriroHub plugin API range. */
export function satisfiesPluginApiRange(
  pluginApiVersion: string,
  pluginApiRange?: string | null,
): boolean {
  if (!pluginApiRange) {
    return true;
  }
  return satisfiesSemverRange(pluginApiVersion, pluginApiRange);
}

/** Checks whether the current gateway version satisfies a package minimum gateway version. */
export function satisfiesGatewayMinimum(
  currentVersion: string,
  minGatewayVersion?: string | null,
): boolean {
  if (!minGatewayVersion) {
    return true;
  }
  const current = parseSemver(currentVersion);
  const minimum = parseSemver(minGatewayVersion);
  if (!current || !minimum) {
    return false;
  }
  return isAtLeast(current, minimum);
}
