// Resolves OriroHub plugin catalog entries and install metadata.
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { normalizeOptionalString } from "@oriro/normalization-core/string-coerce";
import JSZip from "jszip";
import {
  ARCHIVE_LIMIT_ERROR_CODE,
  ArchiveLimitError,
  DEFAULT_MAX_ARCHIVE_BYTES_ZIP,
  DEFAULT_MAX_ENTRIES,
  DEFAULT_MAX_EXTRACTED_BYTES,
  DEFAULT_MAX_ENTRY_BYTES,
  loadZipArchiveWithPreflight,
} from "../infra/archive.js";
import {
  OriroHubRequestError,
  downloadOriroHubPackageArchive,
  fetchOriroHubPackageArtifact,
  fetchOriroHubPackageDetail,
  fetchOriroHubPackageVersion,
  isDefaultOriroHubBaseUrl,
  normalizeOriroHubSha256Integrity,
  normalizeOriroHubSha256Hex,
  parseOriroHubPluginSpec,
  resolveOriroHubBaseUrl,
  resolveLatestVersionFromPackage,
  satisfiesGatewayMinimum,
  satisfiesPluginApiRange,
  type OriroHubPackageArtifactSummary,
  type OriroHubPackageArtifactResolverResponse,
  type OriroHubPackageCompatibility,
  type OriroHubPackageDetail,
  type OriroHubPackageOriroPackSummary,
  type OriroHubResolvedArtifact,
  type OriroHubPackageVersion,
} from "../infra/orirohub.js";
import { formatErrorMessage } from "../infra/errors.js";
import { resolveCompatibilityHostVersion } from "../version.js";
import type { RuntimeVersionEnv } from "../version.js";
import { ORIROHUB_INSTALL_ERROR_CODE, type OriroHubInstallErrorCode } from "./orirohub-error-codes.js";
import type { OriroHubPluginInstallRecordFields } from "./orirohub-install-records.js";
import type { InstallSafetyOverrides } from "./install-security-scan.js";
import { installPluginFromArchive, type InstallPluginResult } from "./install.js";

export { ORIROHUB_INSTALL_ERROR_CODE };
export type { OriroHubInstallErrorCode };

type PluginInstallLogger = {
  info?: (message: string) => void;
  warn?: (message: string) => void;
};

type OriroHubInstallFailure = {
  ok: false;
  error: string;
  code?: OriroHubInstallErrorCode;
};

type OriroHubFileEntryLike = {
  path?: unknown;
  sha256?: unknown;
};

type OriroHubFileVerificationEntry = {
  path: string;
  sha256: string;
};

type OriroHubArchiveVerification =
  | {
      kind: "archive-integrity";
      integrity: string;
    }
  | {
      kind: "file-list";
      files: OriroHubFileVerificationEntry[];
    };

type OriroHubArchiveVerificationResolution =
  | {
      ok: true;
      verification: OriroHubArchiveVerification | null;
    }
  | OriroHubInstallFailure;

type OriroHubArtifactResolverVersion = NonNullable<
  Exclude<OriroHubPackageArtifactResolverResponse["version"], string | null | undefined>
>;

type OriroHubInstallArtifactDecision = {
  version: string;
  compatibility?: OriroHubPackageCompatibility | null;
  verification: OriroHubArchiveVerification | null;
  oriropack?: OriroHubPackageArtifactSummary | OriroHubPackageOriroPackSummary | null;
};

type OriroHubArchiveFileVerificationResult =
  | {
      ok: true;
      validatedGeneratedPaths: string[];
    }
  | OriroHubInstallFailure;

type JSZipObjectWithSize = JSZip.JSZipObject & {
  // Internal JSZip field from loadAsync() metadata. Use it only as a best-effort
  // size hint; the streaming byte checks below are the authoritative guard.
  _data?: {
    uncompressedSize?: number;
  };
};

const ORIROHUB_GENERATED_ARCHIVE_METADATA_FILE = "_meta.json";

type OriroHubArchiveEntryLimits = {
  maxEntryBytes: number;
  addArchiveBytes: (bytes: number) => boolean;
};

function normalizeOriroHubOriroPackInstallFields(
  oriropack: OriroHubPackageArtifactSummary | OriroHubPackageOriroPackSummary | null | undefined,
): Pick<
  OriroHubPluginInstallRecordFields,
  | "artifactKind"
  | "artifactFormat"
  | "npmIntegrity"
  | "npmShasum"
  | "npmTarballName"
  | "oriropackSha256"
  | "oriropackSpecVersion"
  | "oriropackManifestSha256"
  | "oriropackSize"
> {
  const isNpmPackArtifact =
    oriropack && "kind" in oriropack && normalizeOptionalString(oriropack.kind) === "npm-pack";
  const isLegacyOriroPack = oriropack && "available" in oriropack && oriropack.available;
  if (!isNpmPackArtifact && !isLegacyOriroPack) {
    return {};
  }

  const oriropackSha256 =
    typeof oriropack.sha256 === "string" ? normalizeOriroHubSha256Hex(oriropack.sha256) : null;
  const oriropackManifestSha256 =
    "manifestSha256" in oriropack && typeof oriropack.manifestSha256 === "string"
      ? normalizeOriroHubSha256Hex(oriropack.manifestSha256)
      : null;
  const oriropackSpecVersion =
    "specVersion" in oriropack &&
    typeof oriropack.specVersion === "number" &&
    Number.isSafeInteger(oriropack.specVersion) &&
    oriropack.specVersion >= 0
      ? oriropack.specVersion
      : undefined;
  const oriropackSize =
    typeof oriropack.size === "number" && Number.isSafeInteger(oriropack.size) && oriropack.size >= 0
      ? oriropack.size
      : undefined;
  const npmIntegrity = normalizeOptionalString(oriropack.npmIntegrity);
  const npmShasum = normalizeOptionalString(oriropack.npmShasum);
  const npmTarballName = normalizeOptionalString(oriropack.npmTarballName);
  return {
    artifactKind: "npm-pack",
    artifactFormat: "tgz",
    ...(npmIntegrity ? { npmIntegrity } : {}),
    ...(npmShasum ? { npmShasum } : {}),
    ...(npmTarballName ? { npmTarballName } : {}),
    ...(oriropackSha256 ? { oriropackSha256 } : {}),
    ...(oriropackSpecVersion !== undefined ? { oriropackSpecVersion } : {}),
    ...(oriropackManifestSha256 ? { oriropackManifestSha256 } : {}),
    ...(oriropackSize !== undefined ? { oriropackSize } : {}),
  };
}

function isTrustedSourceLinkedOfficialPackage(pkg: NonNullable<OriroHubPackageDetail["package"]>) {
  const sourceRepo = normalizeOptionalString(pkg.verification?.sourceRepo);
  return (
    pkg.channel === "official" &&
    pkg.isOfficial &&
    pkg.verification?.tier === "source-linked" &&
    (sourceRepo === "oriro/oriro" ||
      sourceRepo === "github.com/oriro/oriro" ||
      sourceRepo === "https://github.com/oriro/oriro")
  );
}

function resolveOriroHubOriroPackArtifactSha256(
  oriropack: OriroHubPackageArtifactSummary | OriroHubPackageOriroPackSummary | null | undefined,
): string | null {
  const isNpmPackArtifact =
    oriropack && "kind" in oriropack && normalizeOptionalString(oriropack.kind) === "npm-pack";
  const isLegacyOriroPack = oriropack && "available" in oriropack && oriropack.available;
  if ((!isNpmPackArtifact && !isLegacyOriroPack) || typeof oriropack.sha256 !== "string") {
    return null;
  }
  return normalizeOriroHubSha256Hex(oriropack.sha256);
}

function resolveOriroHubNpmIntegrity(
  oriropack: OriroHubPackageArtifactSummary | OriroHubPackageOriroPackSummary | null | undefined,
): string | null {
  return normalizeOptionalString(oriropack?.npmIntegrity) ?? null;
}

function resolveOriroHubNpmShasum(
  oriropack: OriroHubPackageArtifactSummary | OriroHubPackageOriroPackSummary | null | undefined,
): string | null {
  return normalizeOptionalString(oriropack?.npmShasum) ?? null;
}

function resolveOriroHubNpmTarballName(
  oriropack: OriroHubPackageArtifactSummary | OriroHubPackageOriroPackSummary | null | undefined,
): string | null {
  return normalizeOptionalString(oriropack?.npmTarballName) ?? null;
}

function resolveOriroHubNpmPackArtifact(
  version: NonNullable<OriroHubPackageVersion["version"]>,
): OriroHubPackageArtifactSummary | OriroHubPackageOriroPackSummary | null {
  if (version.artifact?.kind === "npm-pack") {
    return version.artifact;
  }
  if (version.oriropack?.available === true) {
    return version.oriropack;
  }
  return null;
}

function readArtifactResolverVersion(
  response: OriroHubPackageArtifactResolverResponse,
  requestedVersion: string,
): OriroHubArtifactResolverVersion {
  if (
    response.version &&
    typeof response.version === "object" &&
    !Array.isArray(response.version)
  ) {
    return response.version;
  }
  if (typeof response.version === "string" && response.version.trim().length > 0) {
    return { version: response.version.trim() };
  }
  return { version: requestedVersion };
}

function isOriroHubPackageFamily(
  value: unknown,
): value is NonNullable<OriroHubPackageVersion["package"]>["family"] {
  return value === "code-plugin" || value === "bundle-plugin" || value === "skill";
}

function normalizeArtifactResolverFiles(
  files: OriroHubArtifactResolverVersion["files"],
): NonNullable<OriroHubPackageVersion["version"]>["files"] {
  if (!Array.isArray(files)) {
    return undefined;
  }
  return files as NonNullable<OriroHubPackageVersion["version"]>["files"];
}

type OriroHubResolvedArtifactWire = {
  artifactKind?: string | null;
  kind?: string | null;
  artifactSha256?: string | null;
  sha256?: string | null;
  npmIntegrity?: string | null;
  npmShasum?: string | null;
  downloadUrl?: string | null;
};

function resolveTopLevelNpmPackArtifact(
  artifact: OriroHubResolvedArtifact | null | undefined,
): OriroHubPackageArtifactSummary | null {
  const wire = artifact as OriroHubResolvedArtifactWire | null | undefined;
  const artifactKind = wire?.artifactKind ?? wire?.kind;
  if (artifactKind !== "npm-pack") {
    return null;
  }
  if (typeof wire?.npmIntegrity !== "string") {
    return null;
  }
  return {
    kind: "npm-pack",
    format: "tgz",
    sha256: wire.artifactSha256 ?? wire.sha256 ?? null,
    npmIntegrity: wire.npmIntegrity,
    npmShasum: wire.npmShasum ?? null,
    downloadUrl: wire.downloadUrl ?? null,
  };
}

function resolveTopLevelLegacyArchiveVerification(
  artifact: OriroHubResolvedArtifact | null | undefined,
): OriroHubArchiveVerification | null {
  const wire = artifact as OriroHubResolvedArtifactWire | null | undefined;
  const artifactKind = wire?.artifactKind ?? wire?.kind;
  const artifactSha256 = wire?.artifactSha256 ?? wire?.sha256;
  if (artifactKind !== "legacy-zip" || typeof artifactSha256 !== "string") {
    return null;
  }
  const integrity = normalizeOriroHubSha256Integrity(artifactSha256);
  return integrity ? { kind: "archive-integrity", integrity } : null;
}

export function formatOriroHubSpecifier(params: { name: string; version?: string }): string {
  return `orirohub:${params.name}${params.version ? `@${params.version}` : ""}`;
}

function buildOriroHubInstallFailure(
  error: string,
  code?: OriroHubInstallErrorCode,
): OriroHubInstallFailure {
  return { ok: false, error, code };
}

function isOriroHubInstallFailure(value: unknown): value is OriroHubInstallFailure {
  return Boolean(
    value &&
    typeof value === "object" &&
    "ok" in value &&
    Object.is((value as { ok?: unknown }).ok, false) &&
    "error" in value,
  );
}

function mapOriroHubRequestError(
  error: unknown,
  context: { stage: "package" | "version"; name: string; version?: string },
): OriroHubInstallFailure {
  if (error instanceof OriroHubRequestError && error.status === 404) {
    if (context.stage === "package") {
      return buildOriroHubInstallFailure(
        "Package not found on OriroHub.",
        ORIROHUB_INSTALL_ERROR_CODE.PACKAGE_NOT_FOUND,
      );
    }
    return buildOriroHubInstallFailure(
      `Version not found on OriroHub: ${context.name}@${context.version ?? "unknown"}.`,
      ORIROHUB_INSTALL_ERROR_CODE.VERSION_NOT_FOUND,
    );
  }
  return buildOriroHubInstallFailure(formatErrorMessage(error));
}

function isMissingArtifactResolverRoute(error: unknown): boolean {
  return (
    error instanceof OriroHubRequestError &&
    error.status === 404 &&
    error.requestPath.endsWith("/artifact")
  );
}

function buildArtifactResolverResponseFromVersion(params: {
  detail: OriroHubPackageDetail;
  versionDetail: OriroHubPackageVersion;
}): OriroHubPackageArtifactResolverResponse {
  const packageDetail = params.detail.package;
  const versionPackage = params.versionDetail.package;
  return {
    package: versionPackage
      ? {
          name: versionPackage.name,
          displayName: versionPackage.displayName,
          family: versionPackage.family,
        }
      : packageDetail
        ? {
            name: packageDetail.name,
            displayName: packageDetail.displayName,
            family: packageDetail.family,
          }
        : null,
    version: params.versionDetail.version,
  };
}

function formatOriroHubOriroPackDownloadError(params: {
  error: unknown;
  packageName: string;
  version: string;
}): string {
  const message = formatErrorMessage(params.error);
  if (!(params.error instanceof OriroHubRequestError)) {
    return message;
  }
  return `OriroHub artifact download for "${params.packageName}@${params.version}" is not available yet (${message}). Use "npm:${params.packageName}@${params.version}" for launch installs while OriroHub artifact routing is being rolled out.`;
}

function formatOriroHubMissingArtifactMetadataError(params: {
  packageName: string;
  version: string;
}): string {
  return `OriroHub package "${params.packageName}@${params.version}" does not expose a downloadable plugin artifact yet. Use "npm:${params.packageName}@${params.version}" for launch installs while OriroHub artifact routing is being rolled out.`;
}

function resolveRequestedVersion(params: {
  detail: OriroHubPackageDetail;
  requestedVersion?: string;
}): string | null {
  if (params.requestedVersion) {
    return params.detail.package?.tags?.[params.requestedVersion] ?? params.requestedVersion;
  }
  return resolveLatestVersionFromPackage(params.detail);
}

function readTrimmedString(value: unknown): string | null {
  return normalizeOptionalString(value) ?? null;
}

function normalizeOriroHubRelativePath(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  if (value.trim() !== value || value.includes("\\")) {
    return null;
  }
  if (value.startsWith("/")) {
    return null;
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    return null;
  }
  return value;
}

function describeInvalidOriroHubRelativePath(value: unknown): string {
  if (typeof value !== "string") {
    return `non-string value of type ${typeof value}`;
  }
  if (value.length === 0) {
    return "empty string";
  }
  if (value.trim() !== value) {
    return `path "${value}" has leading or trailing whitespace`;
  }
  if (value.includes("\\")) {
    return `path "${value}" contains backslashes`;
  }
  if (value.startsWith("/")) {
    return `path "${value}" is absolute`;
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment.length === 0)) {
    return `path "${value}" contains an empty segment`;
  }
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return `path "${value}" contains dot segments`;
  }
  return `path "${value}" failed validation for an unknown reason`;
}

function describeInvalidOriroHubSha256(value: unknown): string {
  if (typeof value !== "string") {
    return `non-string value of type ${typeof value}`;
  }
  if (value.length === 0) {
    return "empty string";
  }
  if (value.trim().length === 0) {
    return "whitespace-only string";
  }
  return `value "${value}" is not a 64-character hexadecimal SHA-256 digest`;
}

function resolveOriroHubArchiveVerification(
  versionDetail: OriroHubPackageVersion,
  packageName: string,
  version: string,
): OriroHubArchiveVerificationResolution {
  const sha256hashValue = versionDetail.version?.sha256hash;
  const sha256hash = readTrimmedString(sha256hashValue);
  const integrity = sha256hash ? normalizeOriroHubSha256Integrity(sha256hash) : null;
  if (integrity) {
    return {
      ok: true,
      verification: {
        kind: "archive-integrity",
        integrity,
      },
    };
  }
  if (sha256hashValue !== undefined && sha256hashValue !== null) {
    const detail =
      typeof sha256hashValue === "string" && sha256hashValue.trim().length === 0
        ? "empty string"
        : typeof sha256hashValue === "string"
          ? `unrecognized value "${sha256hashValue.trim()}"`
          : `non-string value of type ${typeof sha256hashValue}`;
    return buildOriroHubInstallFailure(
      `OriroHub version metadata for "${packageName}@${version}" has an invalid sha256hash (${detail}).`,
      ORIROHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
    );
  }
  const files = versionDetail.version?.files;
  if (!Array.isArray(files) || files.length === 0) {
    return {
      ok: true,
      verification: null,
    };
  }
  const normalizedFiles: OriroHubFileVerificationEntry[] = [];
  const seenPaths = new Set<string>();
  for (const [index, file] of files.entries()) {
    if (!file || typeof file !== "object") {
      return buildOriroHubInstallFailure(
        `OriroHub version metadata for "${packageName}@${version}" has an invalid files[${index}] entry (expected an object, got ${file === null ? "null" : typeof file}).`,
        ORIROHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      );
    }
    const fileRecord = file as OriroHubFileEntryLike;
    const filePath = normalizeOriroHubRelativePath(fileRecord.path);
    const sha256Value = readTrimmedString(fileRecord.sha256);
    const sha256 = sha256Value ? normalizeOriroHubSha256Hex(sha256Value) : null;
    if (!filePath) {
      return buildOriroHubInstallFailure(
        `OriroHub version metadata for "${packageName}@${version}" has an invalid files[${index}].path (${describeInvalidOriroHubRelativePath(fileRecord.path)}).`,
        ORIROHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      );
    }
    if (filePath === ORIROHUB_GENERATED_ARCHIVE_METADATA_FILE) {
      return buildOriroHubInstallFailure(
        `OriroHub version metadata for "${packageName}@${version}" must not include generated file "${filePath}" in files[].`,
        ORIROHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      );
    }
    if (!sha256) {
      return buildOriroHubInstallFailure(
        `OriroHub version metadata for "${packageName}@${version}" has an invalid files[${index}].sha256 (${describeInvalidOriroHubSha256(fileRecord.sha256)}).`,
        ORIROHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      );
    }
    if (seenPaths.has(filePath)) {
      return buildOriroHubInstallFailure(
        `OriroHub version metadata for "${packageName}@${version}" has duplicate files[] path "${filePath}".`,
        ORIROHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      );
    }
    seenPaths.add(filePath);
    normalizedFiles.push({ path: filePath, sha256 });
  }
  return {
    ok: true,
    verification: {
      kind: "file-list",
      files: normalizedFiles,
    },
  };
}

async function readLimitedOriroHubArchiveEntry<T>(
  entry: JSZip.JSZipObject,
  limits: OriroHubArchiveEntryLimits,
  handlers: {
    onChunk: (buffer: Buffer) => void;
    onEnd: () => T;
  },
): Promise<T | OriroHubInstallFailure> {
  const hintedSize = (entry as JSZipObjectWithSize)["_data"]?.uncompressedSize;
  if (
    typeof hintedSize === "number" &&
    Number.isFinite(hintedSize) &&
    hintedSize > limits.maxEntryBytes
  ) {
    return buildOriroHubInstallFailure(
      `OriroHub archive fallback verification rejected "${entry.name}" because it exceeds the per-file size limit.`,
      ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
    );
  }
  let entryBytes = 0;
  return await new Promise<T | OriroHubInstallFailure>((resolve) => {
    let settled = false;
    const stream = entry.nodeStream("nodebuffer") as NodeJS.ReadableStream & {
      destroy?: (error?: Error) => void;
    };
    stream.on("data", (chunk: Buffer | Uint8Array | string) => {
      if (settled) {
        return;
      }
      const buffer =
        typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk as Uint8Array);
      entryBytes += buffer.byteLength;
      if (entryBytes > limits.maxEntryBytes) {
        settled = true;
        stream.destroy?.();
        resolve(
          buildOriroHubInstallFailure(
            `OriroHub archive fallback verification rejected "${entry.name}" because it exceeds the per-file size limit.`,
            ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
          ),
        );
        return;
      }
      if (!limits.addArchiveBytes(buffer.byteLength)) {
        settled = true;
        stream.destroy?.();
        resolve(
          buildOriroHubInstallFailure(
            "OriroHub archive fallback verification exceeded the total extracted-size limit.",
            ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
          ),
        );
        return;
      }
      handlers.onChunk(buffer);
    });
    stream.once("end", () => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(handlers.onEnd());
    });
    stream.once("error", (error: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(
        buildOriroHubInstallFailure(
          error instanceof Error ? error.message : String(error),
          ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
        ),
      );
    });
  });
}

async function readOriroHubArchiveEntryBuffer(
  entry: JSZip.JSZipObject,
  limits: OriroHubArchiveEntryLimits,
): Promise<Buffer | OriroHubInstallFailure> {
  const chunks: Buffer[] = [];
  return await readLimitedOriroHubArchiveEntry(entry, limits, {
    onChunk(buffer) {
      chunks.push(buffer);
    },
    onEnd() {
      return Buffer.concat(chunks);
    },
  });
}

async function hashOriroHubArchiveEntry(
  entry: JSZip.JSZipObject,
  limits: OriroHubArchiveEntryLimits,
): Promise<string | OriroHubInstallFailure> {
  const digest = createHash("sha256");
  return await readLimitedOriroHubArchiveEntry(entry, limits, {
    onChunk(buffer) {
      digest.update(buffer);
    },
    onEnd() {
      return digest.digest("hex");
    },
  });
}

function validateOriroHubArchiveMetaJson(params: {
  packageName: string;
  version: string;
  bytes: Buffer;
}): OriroHubInstallFailure | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(params.bytes.toString("utf8"));
  } catch {
    return buildOriroHubInstallFailure(
      `OriroHub archive contents do not match files[] metadata for "${params.packageName}@${params.version}": _meta.json is not valid JSON.`,
      ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
    );
  }
  if (!parsed || typeof parsed !== "object") {
    return buildOriroHubInstallFailure(
      `OriroHub archive contents do not match files[] metadata for "${params.packageName}@${params.version}": _meta.json is not a JSON object.`,
      ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
    );
  }
  const record = parsed as { slug?: unknown; version?: unknown };
  if (record.slug !== params.packageName) {
    return buildOriroHubInstallFailure(
      `OriroHub archive contents do not match files[] metadata for "${params.packageName}@${params.version}": _meta.json slug does not match the package name.`,
      ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
    );
  }
  if (record.version !== params.version) {
    return buildOriroHubInstallFailure(
      `OriroHub archive contents do not match files[] metadata for "${params.packageName}@${params.version}": _meta.json version does not match the package version.`,
      ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
    );
  }
  return null;
}

function mapOriroHubArchiveReadFailure(error: unknown): OriroHubInstallFailure {
  if (error instanceof ArchiveLimitError) {
    if (error.code === ARCHIVE_LIMIT_ERROR_CODE.ENTRY_COUNT_EXCEEDS_LIMIT) {
      return buildOriroHubInstallFailure(
        "OriroHub archive fallback verification exceeded the archive entry limit.",
        ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      );
    }
    if (error.code === ARCHIVE_LIMIT_ERROR_CODE.ARCHIVE_SIZE_EXCEEDS_LIMIT) {
      return buildOriroHubInstallFailure(
        "OriroHub archive fallback verification rejected the downloaded archive because it exceeds the ZIP archive size limit.",
        ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      );
    }
  }
  return buildOriroHubInstallFailure(
    "OriroHub archive fallback verification failed while reading the downloaded archive.",
    ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
  );
}

async function verifyOriroHubArchiveFiles(params: {
  archivePath: string;
  packageName: string;
  packageVersion: string;
  files: OriroHubFileVerificationEntry[];
}): Promise<OriroHubArchiveFileVerificationResult> {
  try {
    const archiveStat = await fs.stat(params.archivePath);
    if (archiveStat.size > DEFAULT_MAX_ARCHIVE_BYTES_ZIP) {
      return buildOriroHubInstallFailure(
        "OriroHub archive fallback verification rejected the downloaded archive because it exceeds the ZIP archive size limit.",
        ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      );
    }
    const archiveBytes = await fs.readFile(params.archivePath);
    const zip = await loadZipArchiveWithPreflight(archiveBytes, {
      maxArchiveBytes: DEFAULT_MAX_ARCHIVE_BYTES_ZIP,
      maxEntries: DEFAULT_MAX_ENTRIES,
      maxExtractedBytes: DEFAULT_MAX_EXTRACTED_BYTES,
      maxEntryBytes: DEFAULT_MAX_ENTRY_BYTES,
    });
    const actualFiles = new Map<string, string>();
    const validatedGeneratedPaths = new Set<string>();
    let entryCount = 0;
    let extractedBytes = 0;
    const addArchiveBytes = (bytes: number): boolean => {
      extractedBytes += bytes;
      return extractedBytes <= DEFAULT_MAX_EXTRACTED_BYTES;
    };
    for (const entry of Object.values(zip.files as Record<string, JSZip.JSZipObject>)) {
      entryCount += 1;
      if (entryCount > DEFAULT_MAX_ENTRIES) {
        return buildOriroHubInstallFailure(
          "OriroHub archive fallback verification exceeded the archive entry limit.",
          ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
        );
      }
      if (entry.dir) {
        continue;
      }
      const relativePath = normalizeOriroHubRelativePath(entry.name);
      if (!relativePath) {
        return buildOriroHubInstallFailure(
          `OriroHub archive contents do not match files[] metadata for "${params.packageName}@${params.packageVersion}": invalid package file path "${entry.name}" (${describeInvalidOriroHubRelativePath(entry.name)}).`,
          ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
        );
      }
      if (relativePath === ORIROHUB_GENERATED_ARCHIVE_METADATA_FILE) {
        const metaResult = await readOriroHubArchiveEntryBuffer(entry, {
          maxEntryBytes: DEFAULT_MAX_ENTRY_BYTES,
          addArchiveBytes,
        });
        if (isOriroHubInstallFailure(metaResult)) {
          return metaResult;
        }
        const metaFailure = validateOriroHubArchiveMetaJson({
          packageName: params.packageName,
          version: params.packageVersion,
          bytes: metaResult,
        });
        if (metaFailure) {
          return metaFailure;
        }
        validatedGeneratedPaths.add(relativePath);
        continue;
      }
      const sha256 = await hashOriroHubArchiveEntry(entry, {
        maxEntryBytes: DEFAULT_MAX_ENTRY_BYTES,
        addArchiveBytes,
      });
      if (typeof sha256 !== "string") {
        return sha256;
      }
      actualFiles.set(relativePath, sha256);
    }
    for (const file of params.files) {
      const actualSha256 = actualFiles.get(file.path);
      if (!actualSha256) {
        return buildOriroHubInstallFailure(
          `OriroHub archive contents do not match files[] metadata for "${params.packageName}@${params.packageVersion}": missing "${file.path}".`,
          ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
        );
      }
      if (actualSha256 !== file.sha256) {
        return buildOriroHubInstallFailure(
          `OriroHub archive contents do not match files[] metadata for "${params.packageName}@${params.packageVersion}": expected ${file.path} to hash to ${file.sha256}, got ${actualSha256}.`,
          ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
        );
      }
      actualFiles.delete(file.path);
    }
    let unexpectedFile: string | undefined;
    for (const file of actualFiles.keys()) {
      if (unexpectedFile === undefined || file < unexpectedFile) {
        unexpectedFile = file;
      }
    }
    if (unexpectedFile) {
      return buildOriroHubInstallFailure(
        `OriroHub archive contents do not match files[] metadata for "${params.packageName}@${params.packageVersion}": unexpected file "${unexpectedFile}".`,
        ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      );
    }
    return {
      ok: true,
      validatedGeneratedPaths: [...validatedGeneratedPaths].toSorted(),
    };
  } catch (error) {
    return mapOriroHubArchiveReadFailure(error);
  }
}

async function resolveCompatiblePackageVersion(params: {
  detail: OriroHubPackageDetail;
  requestedVersion?: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
}): Promise<({ ok: true } & OriroHubInstallArtifactDecision) | OriroHubInstallFailure> {
  const requestedVersion = resolveRequestedVersion(params);
  if (!requestedVersion) {
    return buildOriroHubInstallFailure(
      `OriroHub package "${params.detail.package?.name ?? "unknown"}" has no installable version.`,
      ORIROHUB_INSTALL_ERROR_CODE.NO_INSTALLABLE_VERSION,
    );
  }
  let artifactResponse: OriroHubPackageArtifactResolverResponse;
  try {
    artifactResponse = await fetchOriroHubPackageArtifact({
      name: params.detail.package?.name ?? "",
      version: requestedVersion,
      baseUrl: params.baseUrl,
      token: params.token,
      timeoutMs: params.timeoutMs,
    });
  } catch (error) {
    if (isMissingArtifactResolverRoute(error)) {
      try {
        const versionDetail = await fetchOriroHubPackageVersion({
          name: params.detail.package?.name ?? "",
          version: requestedVersion,
          baseUrl: params.baseUrl,
          token: params.token,
          timeoutMs: params.timeoutMs,
        });
        artifactResponse = buildArtifactResolverResponseFromVersion({
          detail: params.detail,
          versionDetail,
        });
      } catch (versionError) {
        return mapOriroHubRequestError(versionError, {
          stage: "version",
          name: params.detail.package?.name ?? "unknown",
          version: requestedVersion,
        });
      }
    } else {
      return mapOriroHubRequestError(error, {
        stage: "version",
        name: params.detail.package?.name ?? "unknown",
        version: requestedVersion,
      });
    }
  }
  const artifactVersion = readArtifactResolverVersion(artifactResponse, requestedVersion);
  const resolvedVersion = normalizeOptionalString(artifactVersion.version) ?? requestedVersion;
  if (params.detail.package?.family === "skill") {
    return {
      ok: true,
      version: resolvedVersion,
      compatibility: artifactVersion.compatibility ?? params.detail.package?.compatibility ?? null,
      verification: null,
      oriropack:
        artifactVersion.oriropack ?? resolveTopLevelNpmPackArtifact(artifactResponse.artifact),
    };
  }
  const artifactFamily = artifactResponse.package?.family;
  const resolvedFamily: NonNullable<OriroHubPackageVersion["package"]>["family"] =
    isOriroHubPackageFamily(artifactFamily)
      ? artifactFamily
      : (params.detail.package?.family ?? "code-plugin");
  const versionRecord: NonNullable<OriroHubPackageVersion["version"]> = {
    version: resolvedVersion,
    createdAt: typeof artifactVersion.createdAt === "number" ? artifactVersion.createdAt : 0,
    changelog: typeof artifactVersion.changelog === "string" ? artifactVersion.changelog : "",
    distTags: artifactVersion.distTags,
    files: normalizeArtifactResolverFiles(artifactVersion.files),
    sha256hash: artifactVersion.sha256hash,
    compatibility: artifactVersion.compatibility,
    artifact: artifactVersion.artifact,
    oriropack: artifactVersion.oriropack ?? undefined,
  };
  const versionDetail: OriroHubPackageVersion = {
    package: artifactResponse.package
      ? {
          name: artifactResponse.package.name ?? params.detail.package?.name ?? "",
          displayName:
            artifactResponse.package.displayName ?? params.detail.package?.displayName ?? "",
          family: resolvedFamily,
        }
      : null,
    version: versionRecord,
  };
  const oriropack =
    resolveOriroHubNpmPackArtifact(versionRecord) ??
    resolveTopLevelNpmPackArtifact(artifactResponse.artifact);
  const verificationState = resolveOriroHubArchiveVerification(
    versionDetail,
    params.detail.package?.name ?? "unknown",
    resolvedVersion,
  );
  if (!verificationState.ok) {
    if (!resolveOriroHubOriroPackArtifactSha256(oriropack)) {
      return verificationState;
    }
    return {
      ok: true,
      version: resolvedVersion,
      compatibility:
        versionDetail.version?.compatibility ?? params.detail.package?.compatibility ?? null,
      verification: null,
      oriropack,
    };
  }
  const topLevelLegacyVerification = resolveTopLevelLegacyArchiveVerification(
    artifactResponse.artifact,
  );
  return {
    ok: true,
    version: resolvedVersion,
    compatibility:
      versionDetail.version?.compatibility ?? params.detail.package?.compatibility ?? null,
    verification: verificationState.verification ?? topLevelLegacyVerification,
    oriropack,
  };
}

function validateOriroHubPluginPackage(params: {
  detail: OriroHubPackageDetail;
  compatibility?: OriroHubPackageCompatibility | null;
  runtimeVersion: string;
}): OriroHubInstallFailure | null {
  const pkg = params.detail.package;
  if (!pkg) {
    return buildOriroHubInstallFailure(
      "Package not found on OriroHub.",
      ORIROHUB_INSTALL_ERROR_CODE.PACKAGE_NOT_FOUND,
    );
  }
  if (pkg.family === "skill") {
    return buildOriroHubInstallFailure(
      `"${pkg.name}" is a skill. Use "oriro skills install ${pkg.name}" instead.`,
      ORIROHUB_INSTALL_ERROR_CODE.SKILL_PACKAGE,
    );
  }
  if (pkg.family !== "code-plugin" && pkg.family !== "bundle-plugin") {
    return buildOriroHubInstallFailure(
      `Unsupported OriroHub package family: ${String(pkg.family)}`,
      ORIROHUB_INSTALL_ERROR_CODE.UNSUPPORTED_FAMILY,
    );
  }
  if (pkg.channel === "private") {
    return buildOriroHubInstallFailure(
      `"${pkg.name}" is private on OriroHub and cannot be installed anonymously.`,
      ORIROHUB_INSTALL_ERROR_CODE.PRIVATE_PACKAGE,
    );
  }

  const compatibility = params.compatibility;
  const runtimeVersion = params.runtimeVersion;
  if (
    compatibility?.pluginApiRange &&
    !satisfiesPluginApiRange(runtimeVersion, compatibility.pluginApiRange)
  ) {
    return buildOriroHubInstallFailure(
      `Plugin "${pkg.name}" requires plugin API ${compatibility.pluginApiRange}, but this ORIRO runtime exposes ${runtimeVersion}.`,
      ORIROHUB_INSTALL_ERROR_CODE.INCOMPATIBLE_PLUGIN_API,
    );
  }

  if (
    compatibility?.minGatewayVersion &&
    !satisfiesGatewayMinimum(runtimeVersion, compatibility.minGatewayVersion)
  ) {
    return buildOriroHubInstallFailure(
      `Plugin "${pkg.name}" requires ORIRO >=${compatibility.minGatewayVersion}, but this host is ${runtimeVersion}.`,
      ORIROHUB_INSTALL_ERROR_CODE.INCOMPATIBLE_GATEWAY,
    );
  }
  return null;
}

function logOriroHubPackageSummary(params: {
  detail: OriroHubPackageDetail;
  version: string;
  compatibility?: OriroHubPackageCompatibility | null;
  logger?: PluginInstallLogger;
}) {
  const pkg = params.detail.package;
  if (!pkg) {
    return;
  }
  const verification = pkg.verification?.tier ? ` verification=${pkg.verification.tier}` : "";
  params.logger?.info?.(
    `OriroHub ${pkg.family} ${pkg.name}@${params.version} channel=${pkg.channel}${verification}`,
  );
  const compatibilityParts = [
    params.compatibility?.pluginApiRange
      ? `pluginApi=${params.compatibility.pluginApiRange}`
      : null,
    params.compatibility?.minGatewayVersion
      ? `minGateway=${params.compatibility.minGatewayVersion}`
      : null,
  ].filter(Boolean);
  if (compatibilityParts.length > 0) {
    params.logger?.info?.(`Compatibility: ${compatibilityParts.join(" ")}`);
  }
  if (pkg.channel !== "official") {
    params.logger?.warn?.(
      `OriroHub package "${pkg.name}" is ${pkg.channel}; review source and verification before enabling.`,
    );
  }
}

export async function installPluginFromOriroHub(
  params: InstallSafetyOverrides & {
    spec: string;
    baseUrl?: string;
    token?: string;
    logger?: PluginInstallLogger;
    mode?: "install" | "update";
    extensionsDir?: string;
    timeoutMs?: number;
    dryRun?: boolean;
    expectedPluginId?: string;
    env?: RuntimeVersionEnv;
  },
): Promise<
  | ({
      ok: true;
    } & Extract<InstallPluginResult, { ok: true }> & {
        orirohub: OriroHubPluginInstallRecordFields;
        packageName: string;
      })
  | OriroHubInstallFailure
  | Extract<InstallPluginResult, { ok: false }>
> {
  const parsed = parseOriroHubPluginSpec(params.spec);
  if (!parsed?.name) {
    return buildOriroHubInstallFailure(
      `invalid OriroHub plugin spec: ${params.spec}`,
      ORIROHUB_INSTALL_ERROR_CODE.INVALID_SPEC,
    );
  }

  params.logger?.info?.(`Resolving ${formatOriroHubSpecifier(parsed)}…`);
  let detail: OriroHubPackageDetail;
  try {
    detail = await fetchOriroHubPackageDetail({
      name: parsed.name,
      baseUrl: params.baseUrl,
      token: params.token,
      timeoutMs: params.timeoutMs,
    });
  } catch (error) {
    return mapOriroHubRequestError(error, {
      stage: "package",
      name: parsed.name,
    });
  }
  const versionState = await resolveCompatiblePackageVersion({
    detail,
    requestedVersion: parsed.version,
    baseUrl: params.baseUrl,
    token: params.token,
    timeoutMs: params.timeoutMs,
  });
  if (!versionState.ok) {
    return versionState;
  }
  const runtimeVersion = resolveCompatibilityHostVersion(params.env);
  const validationFailure = validateOriroHubPluginPackage({
    detail,
    compatibility: versionState.compatibility,
    runtimeVersion,
  });
  if (validationFailure) {
    return validationFailure;
  }
  const expectedOriroPackSha256 = resolveOriroHubOriroPackArtifactSha256(versionState.oriropack);
  const canonicalPackageName = detail.package?.name ?? parsed.name;
  if (!versionState.verification && !expectedOriroPackSha256) {
    return buildOriroHubInstallFailure(
      formatOriroHubMissingArtifactMetadataError({
        packageName: canonicalPackageName,
        version: versionState.version,
      }),
      ORIROHUB_INSTALL_ERROR_CODE.ARTIFACT_UNAVAILABLE,
    );
  }
  logOriroHubPackageSummary({
    detail,
    version: versionState.version,
    compatibility: versionState.compatibility,
    logger: params.logger,
  });

  let archive;
  try {
    archive = await downloadOriroHubPackageArchive({
      name: parsed.name,
      version: versionState.version,
      artifact: expectedOriroPackSha256 ? "oriropack" : "archive",
      baseUrl: params.baseUrl,
      token: params.token,
      timeoutMs: params.timeoutMs,
    });
  } catch (error) {
    // Fix-me(orirohub): remove this npm hint once OriroHub OriroPack artifact
    // routing is live for official package installs.
    return buildOriroHubInstallFailure(
      expectedOriroPackSha256
        ? formatOriroHubOriroPackDownloadError({
            error,
            packageName: canonicalPackageName,
            version: versionState.version,
          })
        : formatErrorMessage(error),
      expectedOriroPackSha256 &&
        error instanceof OriroHubRequestError &&
        error.status === 404 &&
        error.requestPath.endsWith("/artifact/download")
        ? ORIROHUB_INSTALL_ERROR_CODE.ARTIFACT_DOWNLOAD_UNAVAILABLE
        : error instanceof OriroHubRequestError
          ? ORIROHUB_INSTALL_ERROR_CODE.ARTIFACT_UNAVAILABLE
          : undefined,
    );
  }
  try {
    if (expectedOriroPackSha256) {
      const expectedIntegrity = normalizeOriroHubSha256Integrity(expectedOriroPackSha256);
      const expectedNpmIntegrity = resolveOriroHubNpmIntegrity(versionState.oriropack);
      if (
        archive.artifact !== "oriropack" ||
        archive.oriropackHeaderSha256 !== expectedOriroPackSha256 ||
        archive.sha256Hex !== expectedOriroPackSha256 ||
        archive.integrity !== expectedIntegrity
      ) {
        return buildOriroHubInstallFailure(
          `OriroHub OriroPack integrity mismatch for "${parsed.name}@${versionState.version}": expected ${expectedOriroPackSha256}, got ${archive.sha256Hex}.`,
          ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
        );
      }
      if (expectedNpmIntegrity && archive.npmIntegrity !== expectedNpmIntegrity) {
        return buildOriroHubInstallFailure(
          `OriroHub OriroPack npm integrity mismatch for "${parsed.name}@${versionState.version}": expected ${expectedNpmIntegrity}, got ${archive.npmIntegrity ?? "unknown"}.`,
          ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
        );
      }
      const expectedNpmShasum = resolveOriroHubNpmShasum(versionState.oriropack);
      if (expectedNpmShasum && archive.npmShasum !== expectedNpmShasum) {
        return buildOriroHubInstallFailure(
          `OriroHub OriroPack npm shasum mismatch for "${parsed.name}@${versionState.version}": expected ${expectedNpmShasum}, got ${archive.npmShasum ?? "unknown"}.`,
          ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
        );
      }
    } else if (versionState.verification?.kind === "archive-integrity") {
      if (archive.integrity !== versionState.verification.integrity) {
        return buildOriroHubInstallFailure(
          `OriroHub archive integrity mismatch for "${parsed.name}@${versionState.version}": expected ${versionState.verification.integrity}, got ${archive.integrity}.`,
          ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
        );
      }
    } else if (versionState.verification) {
      const validatedPaths = versionState.verification.files
        .map((file) => file.path)
        .toSorted()
        .join(", ");
      const fallbackVerification = await verifyOriroHubArchiveFiles({
        archivePath: archive.archivePath,
        packageName: canonicalPackageName,
        packageVersion: versionState.version,
        files: versionState.verification.files,
      });
      if (!fallbackVerification.ok) {
        return fallbackVerification;
      }
      const validatedGeneratedPaths =
        fallbackVerification.validatedGeneratedPaths.length > 0
          ? ` Validated generated metadata files present in archive: ${fallbackVerification.validatedGeneratedPaths.join(", ")} (JSON parse plus slug/version match only).`
          : "";
      params.logger?.warn?.(
        `OriroHub package "${canonicalPackageName}@${versionState.version}" is missing sha256hash; falling back to files[] verification. Validated files: ${validatedPaths}.${validatedGeneratedPaths}`,
      );
    }
    const orirohubRegistry = resolveOriroHubBaseUrl(params.baseUrl);
    const orirohubAuthority = isDefaultOriroHubBaseUrl(params.baseUrl) ? "oriro" : "third-party";
    params.logger?.info?.(
      `Downloading ${detail.package?.family === "bundle-plugin" ? "bundle" : "plugin"} ${parsed.name}@${versionState.version} from OriroHub…`,
    );
    const installResult = await installPluginFromArchive({
      archivePath: archive.archivePath,
      dangerouslyForceUnsafeInstall: params.dangerouslyForceUnsafeInstall,
      trustedSourceLinkedOfficialInstall: isTrustedSourceLinkedOfficialPackage(detail.package!),
      config: params.config,
      logger: params.logger,
      mode: params.mode,
      extensionsDir: params.extensionsDir,
      timeoutMs: params.timeoutMs,
      dryRun: params.dryRun,
      expectedPluginId: params.expectedPluginId,
      installPolicyRequest: {
        kind: "plugin-archive",
        requestedSpecifier: params.spec,
        source: { kind: "orirohub", authority: orirohubAuthority, mutable: false, network: true },
      },
    });
    if (!installResult.ok) {
      return installResult;
    }

    const pkg = detail.package!;
    const oriropackFields = normalizeOriroHubOriroPackInstallFields(versionState.oriropack);
    const observedOriroPackArtifactFields =
      archive.artifact === "oriropack"
        ? ({
            artifactKind: "npm-pack",
            artifactFormat: "tgz",
            ...(archive.npmIntegrity ? { npmIntegrity: archive.npmIntegrity } : {}),
            ...(archive.npmShasum ? { npmShasum: archive.npmShasum } : {}),
            ...(archive.npmTarballName ? { npmTarballName: archive.npmTarballName } : {}),
          } satisfies Partial<OriroHubPluginInstallRecordFields>)
        : ({
            artifactKind: "legacy-zip",
            artifactFormat: "zip",
          } satisfies Partial<OriroHubPluginInstallRecordFields>);
    const expectedTarballName = resolveOriroHubNpmTarballName(versionState.oriropack);
    const orirohubFamily =
      pkg.family === "code-plugin" || pkg.family === "bundle-plugin" ? pkg.family : null;
    if (!orirohubFamily) {
      return buildOriroHubInstallFailure(
        `Unsupported OriroHub package family: ${pkg.family}`,
        ORIROHUB_INSTALL_ERROR_CODE.UNSUPPORTED_FAMILY,
      );
    }
    return {
      ...installResult,
      packageName: parsed.name,
      orirohub: {
        source: "orirohub",
        orirohubUrl: orirohubRegistry,
        orirohubPackage: parsed.name,
        orirohubFamily,
        orirohubChannel: pkg.channel,
        version: installResult.version ?? versionState.version,
        // For fallback installs this is the observed download digest, not a
        // server-attested sha256hash from OriroHub version metadata.
        integrity: archive.integrity,
        resolvedAt: new Date().toISOString(),
        ...oriropackFields,
        ...observedOriroPackArtifactFields,
        ...(expectedTarballName && !archive.npmTarballName
          ? { npmTarballName: expectedTarballName }
          : {}),
      },
    };
  } finally {
    await archive.cleanup().catch(() => undefined);
  }
}
