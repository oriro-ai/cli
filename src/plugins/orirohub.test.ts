/** Verifies OriroHub plugin spec parsing and install metadata handling. */
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createZipCentralDirectoryArchive } from "../test-utils/zip-central-directory-fixture.js";

const parseOriroHubPluginSpecMock = vi.fn();
const fetchOriroHubPackageDetailMock = vi.fn();
const fetchOriroHubPackageArtifactMock = vi.fn();
const fetchOriroHubPackageVersionMock = vi.fn();
const downloadOriroHubPackageArchiveMock = vi.fn();
const archiveCleanupMock = vi.fn();
const resolveLatestVersionFromPackageMock = vi.fn();
const resolveCompatibilityHostVersionMock = vi.fn();
const installPluginFromArchiveMock = vi.fn();

vi.mock("../infra/orirohub.js", async () => {
  const actual = await vi.importActual<typeof import("../infra/orirohub.js")>("../infra/orirohub.js");
  return {
    ...actual,
    parseOriroHubPluginSpec: (...args: unknown[]) => parseOriroHubPluginSpecMock(...args),
    fetchOriroHubPackageDetail: (...args: unknown[]) => fetchOriroHubPackageDetailMock(...args),
    fetchOriroHubPackageArtifact: (...args: unknown[]) => fetchOriroHubPackageArtifactMock(...args),
    fetchOriroHubPackageVersion: (...args: unknown[]) => fetchOriroHubPackageVersionMock(...args),
    downloadOriroHubPackageArchive: (...args: unknown[]) =>
      downloadOriroHubPackageArchiveMock(...args),
    resolveLatestVersionFromPackage: (...args: unknown[]) =>
      resolveLatestVersionFromPackageMock(...args),
  };
});

vi.mock("../version.js", () => ({
  resolveCompatibilityHostVersion: (...args: unknown[]) =>
    resolveCompatibilityHostVersionMock(...args),
}));

vi.mock("./install.js", () => ({
  installPluginFromArchive: (...args: unknown[]) => installPluginFromArchiveMock(...args),
}));

vi.mock("../infra/archive.js", async () => {
  const actual = await vi.importActual<typeof import("../infra/archive.js")>("../infra/archive.js");
  return {
    ...actual,
    DEFAULT_MAX_ENTRIES: 50_000,
    DEFAULT_MAX_EXTRACTED_BYTES: 512 * 1024 * 1024,
    DEFAULT_MAX_ENTRY_BYTES: 256 * 1024 * 1024,
  };
});

const { OriroHubRequestError } = await import("../infra/orirohub.js");
type OriroHubResolvedArtifact = import("../infra/orirohub.js").OriroHubResolvedArtifact;
const { ORIROHUB_INSTALL_ERROR_CODE, formatOriroHubSpecifier, installPluginFromOriroHub } =
  await import("./orirohub.js");

const DEMO_ARCHIVE_INTEGRITY = "sha256-qerEjGEpvES2+Tyan0j2xwDRkbcnmh4ZFfKN9vWbsa8=";
const DEMO_ARCHIVE_SHA256 = "a9eac48c6129bc44b6f93c9a9f48f6c700d191b7279a1e1915f28df6f59bb1af";
const DEMO_ORIROPACK_SHA256 = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const DEMO_ORIROPACK_INTEGRITY = `sha256-${Buffer.from(DEMO_ORIROPACK_SHA256, "hex").toString(
  "base64",
)}`;
const tempDirs: string[] = [];

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function createOriroHubArchive(entries: Record<string, string>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "oriro-orirohub-archive-"));
  tempDirs.push(dir);
  const archivePath = path.join(dir, "archive.zip");
  const zip = new JSZip();
  for (const [filePath, contents] of Object.entries(entries)) {
    zip.file(filePath, contents);
  }
  const archiveBytes = await zip.generateAsync({ type: "nodebuffer" });
  await fs.writeFile(archivePath, archiveBytes);
  return {
    archivePath,
    integrity: `sha256-${createHash("sha256").update(archiveBytes).digest("base64")}`,
  };
}

async function expectOriroHubInstallError(params: {
  setup?: () => void;
  spec: string;
  expected: {
    ok: false;
    code: (typeof ORIROHUB_INSTALL_ERROR_CODE)[keyof typeof ORIROHUB_INSTALL_ERROR_CODE];
    error: string;
  };
}) {
  params.setup?.();
  const result = await installPluginFromOriroHub({ spec: params.spec });
  const failure = expectInstallFailure(result);
  expect(failure.code).toBe(params.expected.code);
  expect(failure.error).toBe(params.expected.error);
}

function createLoggerSpies() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
  };
}

function expectOriroHubInstallFlow(params: {
  baseUrl: string;
  version: string;
  archivePath: string;
}) {
  expect(packageDetailCall().name).toBe("demo");
  expect(packageDetailCall().baseUrl).toBe(params.baseUrl);
  expect(packageVersionCall().name).toBe("demo");
  expect(packageVersionCall().version).toBe(params.version);
  expect(packageArtifactCall().name).toBe("demo");
  expect(packageArtifactCall().version).toBe(params.version);
  expect(archiveInstallCall().archivePath).toBe(params.archivePath);
}

function expectSuccessfulOriroHubInstall(result: unknown) {
  const success = expectInstallSuccess(result);
  expect(success.pluginId).toBe("demo");
  expect(success.version).toBe("2026.3.22");
  expect(success.orirohub?.source).toBe("orirohub");
  expect(success.orirohub?.orirohubPackage).toBe("demo");
  expect(success.orirohub?.orirohubFamily).toBe("code-plugin");
  expect(success.orirohub?.orirohubChannel).toBe("official");
  expect(success.orirohub?.integrity).toBe(DEMO_ARCHIVE_INTEGRITY);
}

type MockWithCalls = {
  mock: {
    calls: readonly (readonly unknown[])[];
  };
};

type PackageLookupCall = {
  artifact?: string;
  baseUrl?: string;
  name?: string;
  version?: string;
};

type ArchiveInstallCall = {
  archivePath?: string;
  dangerouslyForceUnsafeInstall?: boolean;
  installPolicyRequest?: {
    kind?: string;
    requestedSpecifier?: string;
    source?: { kind?: string; authority?: string; mutable?: boolean; network?: boolean };
  };
  trustedSourceLinkedOfficialInstall?: boolean;
};

type InstallSuccess = {
  orirohub?: Record<string, unknown>;
  ok: true;
  pluginId?: string;
  version?: string;
};

type InstallFailure = {
  code?: string;
  error: string;
  ok: false;
};

function mockCallArg(mock: MockWithCalls, callIndex = 0, argIndex = 0): unknown {
  const call = mock.mock.calls[callIndex];
  if (!call) {
    throw new Error(`Expected mock call ${callIndex}`);
  }
  if (call.length <= argIndex) {
    throw new Error(`Expected mock call ${callIndex} argument ${argIndex}`);
  }
  return call[argIndex];
}

function packageDetailCall(callIndex = 0): PackageLookupCall {
  return mockCallArg(fetchOriroHubPackageDetailMock, callIndex) as PackageLookupCall;
}

function packageVersionCall(callIndex = 0): PackageLookupCall {
  return mockCallArg(fetchOriroHubPackageVersionMock, callIndex) as PackageLookupCall;
}

function packageArtifactCall(callIndex = 0): PackageLookupCall {
  return mockCallArg(fetchOriroHubPackageArtifactMock, callIndex) as PackageLookupCall;
}

function archiveDownloadCall(callIndex = 0): PackageLookupCall {
  return mockCallArg(downloadOriroHubPackageArchiveMock, callIndex) as PackageLookupCall;
}

function archiveInstallCall(callIndex = 0): ArchiveInstallCall {
  return mockCallArg(installPluginFromArchiveMock, callIndex) as ArchiveInstallCall;
}

function expectInstallSuccess(result: unknown): InstallSuccess {
  expect((result as { ok?: unknown }).ok).toBe(true);
  return result as InstallSuccess;
}

function expectInstallFailure(result: unknown): InstallFailure {
  expect((result as { ok?: unknown }).ok).toBe(false);
  return result as InstallFailure;
}

function expectInstallFailureFields(
  result: unknown,
  code: (typeof ORIROHUB_INSTALL_ERROR_CODE)[keyof typeof ORIROHUB_INSTALL_ERROR_CODE],
  error: string,
) {
  const failure = expectInstallFailure(result);
  expect(failure.code).toBe(code);
  expect(failure.error).toBe(error);
}

describe("installPluginFromOriroHub", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
    );
  });

  beforeEach(() => {
    parseOriroHubPluginSpecMock.mockReset();
    fetchOriroHubPackageDetailMock.mockReset();
    fetchOriroHubPackageArtifactMock.mockReset();
    fetchOriroHubPackageVersionMock.mockReset();
    downloadOriroHubPackageArchiveMock.mockReset();
    archiveCleanupMock.mockReset();
    resolveLatestVersionFromPackageMock.mockReset();
    resolveCompatibilityHostVersionMock.mockReset();
    installPluginFromArchiveMock.mockReset();

    parseOriroHubPluginSpecMock.mockReturnValue({ name: "demo" });
    fetchOriroHubPackageDetailMock.mockResolvedValue({
      package: {
        name: "demo",
        displayName: "Demo",
        family: "code-plugin",
        channel: "official",
        isOfficial: true,
        createdAt: 0,
        updatedAt: 0,
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    resolveLatestVersionFromPackageMock.mockReturnValue("2026.3.22");
    fetchOriroHubPackageVersionMock.mockResolvedValue({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        sha256hash: "a9eac48c6129bc44b6f93c9a9f48f6c700d191b7279a1e1915f28df6f59bb1af",
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    fetchOriroHubPackageArtifactMock.mockImplementation((params) =>
      fetchOriroHubPackageVersionMock(params),
    );
    downloadOriroHubPackageArchiveMock.mockResolvedValue({
      archivePath: "/tmp/orirohub-demo/archive.zip",
      integrity: DEMO_ARCHIVE_INTEGRITY,
      cleanup: archiveCleanupMock,
    });
    archiveCleanupMock.mockResolvedValue(undefined);
    resolveCompatibilityHostVersionMock.mockReturnValue("2026.3.22");
    installPluginFromArchiveMock.mockResolvedValue({
      ok: true,
      pluginId: "demo",
      targetDir: "/tmp/oriro/plugins/demo",
      version: "2026.3.22",
    });
  });

  it("formats orirohub specifiers", () => {
    expect(formatOriroHubSpecifier({ name: "demo" })).toBe("orirohub:demo");
    expect(formatOriroHubSpecifier({ name: "demo", version: "1.2.3" })).toBe("orirohub:demo@1.2.3");
  });

  it("installs a OriroHub code plugin through the archive installer", async () => {
    const logger = createLoggerSpies();
    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
      baseUrl: "https://orirohub.ai",
      logger,
    });

    expectOriroHubInstallFlow({
      baseUrl: "https://orirohub.ai",
      version: "2026.3.22",
      archivePath: "/tmp/orirohub-demo/archive.zip",
    });
    expectSuccessfulOriroHubInstall(result);
    expect(archiveInstallCall().installPolicyRequest).toEqual({
      kind: "plugin-archive",
      requestedSpecifier: "orirohub:demo",
      source: { kind: "orirohub", authority: "oriro", mutable: false, network: true },
    });
    expect(logger.info).toHaveBeenCalledWith("OriroHub code-plugin demo@2026.3.22 channel=official");
    expect(logger.info).toHaveBeenCalledWith(
      "Compatibility: pluginApi=>=2026.3.22 minGateway=2026.3.0",
    );
    expect(logger.warn).not.toHaveBeenCalled();
    expect(archiveCleanupMock).toHaveBeenCalledTimes(1);
  });

  it("marks custom OriroHub registries as third-party install policy authority", async () => {
    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
      baseUrl: "https://orirohub.internal.example",
    });

    expectOriroHubInstallFlow({
      baseUrl: "https://orirohub.internal.example",
      version: "2026.3.22",
      archivePath: "/tmp/orirohub-demo/archive.zip",
    });
    expectSuccessfulOriroHubInstall(result);
    expect(archiveInstallCall().installPolicyRequest).toMatchObject({
      kind: "plugin-archive",
      requestedSpecifier: "orirohub:demo",
      source: { kind: "orirohub", authority: "third-party", mutable: false, network: true },
    });
  });

  it("marks official source-linked Oriro packages as trusted for install scanning", async () => {
    fetchOriroHubPackageDetailMock.mockResolvedValueOnce({
      package: {
        name: "demo",
        displayName: "Demo",
        family: "code-plugin",
        channel: "official",
        isOfficial: true,
        createdAt: 0,
        updatedAt: 0,
        verification: {
          tier: "source-linked",
          sourceRepo: "oriro/oriro",
        },
      },
    });

    await installPluginFromOriroHub({
      spec: "orirohub:demo",
      baseUrl: "https://orirohub.ai",
    });

    expect(archiveInstallCall().trustedSourceLinkedOfficialInstall).toBe(true);
  });

  it("resolves explicit OriroHub dist tags before fetching version metadata", async () => {
    parseOriroHubPluginSpecMock.mockReturnValueOnce({ name: "demo", version: "latest" });
    fetchOriroHubPackageDetailMock.mockResolvedValueOnce({
      package: {
        name: "demo",
        displayName: "Demo",
        family: "code-plugin",
        channel: "official",
        isOfficial: true,
        createdAt: 0,
        updatedAt: 0,
        tags: {
          latest: "2026.3.22",
        },
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo@latest",
      baseUrl: "https://orirohub.ai",
    });

    expectSuccessfulOriroHubInstall(result);
    expect(packageVersionCall().name).toBe("demo");
    expect(packageVersionCall().version).toBe("2026.3.22");
    expect(archiveDownloadCall().name).toBe("demo");
    expect(archiveDownloadCall().version).toBe("2026.3.22");
  });

  it("returns OriroPack metadata from compatible OriroHub package versions", async () => {
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        sha256hash: "a9eac48c6129bc44b6f93c9a9f48f6c700d191b7279a1e1915f28df6f59bb1af",
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
        artifact: {
          kind: "npm-pack",
          format: "tgz",
          sha256: DEMO_ORIROPACK_SHA256,
          size: 4096,
          npmIntegrity: "sha512-oriropack",
          npmShasum: "1".repeat(40),
          npmTarballName: "demo-2026.3.22.tgz",
        },
      },
    });
    downloadOriroHubPackageArchiveMock.mockResolvedValueOnce({
      archivePath: "/tmp/orirohub-demo/demo-2026.3.22.tgz",
      integrity: DEMO_ORIROPACK_INTEGRITY,
      sha256Hex: DEMO_ORIROPACK_SHA256,
      artifact: "oriropack",
      oriropackHeaderSha256: DEMO_ORIROPACK_SHA256,
      npmIntegrity: "sha512-oriropack",
      npmShasum: "1".repeat(40),
      npmTarballName: "demo-2026.3.22.tgz",
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
      baseUrl: "https://orirohub.ai",
    });

    const success = expectInstallSuccess(result);
    expect(success.orirohub?.integrity).toBe(DEMO_ORIROPACK_INTEGRITY);
    expect(success.orirohub?.artifactKind).toBe("npm-pack");
    expect(success.orirohub?.artifactFormat).toBe("tgz");
    expect(success.orirohub?.npmIntegrity).toBe("sha512-oriropack");
    expect(success.orirohub?.npmShasum).toBe("1".repeat(40));
    expect(success.orirohub?.npmTarballName).toBe("demo-2026.3.22.tgz");
    expect(success.orirohub?.oriropackSha256).toBe(DEMO_ORIROPACK_SHA256);
    expect(success.orirohub?.oriropackSize).toBe(4096);
    expect(archiveDownloadCall().artifact).toBe("oriropack");
    expect(archiveDownloadCall().name).toBe("demo");
    expect(archiveDownloadCall().version).toBe("2026.3.22");
  });

  it("uses the artifact resolver response as the install decision", async () => {
    fetchOriroHubPackageVersionMock.mockClear();
    fetchOriroHubPackageArtifactMock.mockResolvedValueOnce({
      package: {
        name: "demo",
        displayName: "Demo",
        family: "code-plugin",
      },
      version: {
        version: "2026.3.22",
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
      artifact: {
        source: "orirohub",
        artifactKind: "npm-pack",
        packageName: "demo",
        version: "2026.3.22",
        artifactSha256: DEMO_ORIROPACK_SHA256,
        npmIntegrity: "sha512-oriropack",
        npmShasum: "1".repeat(40),
      },
    });
    downloadOriroHubPackageArchiveMock.mockResolvedValueOnce({
      archivePath: "/tmp/orirohub-demo/demo-2026.3.22.tgz",
      integrity: DEMO_ORIROPACK_INTEGRITY,
      sha256Hex: DEMO_ORIROPACK_SHA256,
      artifact: "oriropack",
      oriropackHeaderSha256: DEMO_ORIROPACK_SHA256,
      npmIntegrity: "sha512-oriropack",
      npmShasum: "1".repeat(40),
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
      baseUrl: "https://orirohub.ai",
    });

    const success = expectInstallSuccess(result);
    expect(success.orirohub?.artifactKind).toBe("npm-pack");
    expect(success.orirohub?.artifactFormat).toBe("tgz");
    expect(success.orirohub?.npmIntegrity).toBe("sha512-oriropack");
    expect(success.orirohub?.npmShasum).toBe("1".repeat(40));
    expect(success.orirohub?.oriropackSha256).toBe(DEMO_ORIROPACK_SHA256);
    expect(packageArtifactCall().name).toBe("demo");
    expect(packageArtifactCall().version).toBe("2026.3.22");
    expect(fetchOriroHubPackageVersionMock).not.toHaveBeenCalled();
    expect(archiveDownloadCall().artifact).toBe("oriropack");
    expect(archiveDownloadCall().name).toBe("demo");
    expect(archiveDownloadCall().version).toBe("2026.3.22");
  });

  it("accepts the live OriroHub artifact resolver shape with kind/sha256 field names", async () => {
    fetchOriroHubPackageVersionMock.mockClear();
    fetchOriroHubPackageArtifactMock.mockResolvedValueOnce({
      package: {
        name: "demo",
        displayName: "Demo",
        family: "code-plugin",
      },
      version: "2026.3.22",
      artifact: {
        kind: "npm-pack",
        sha256: DEMO_ORIROPACK_SHA256,
        npmIntegrity: "sha512-oriropack",
        npmShasum: "1".repeat(40),
      } as unknown as OriroHubResolvedArtifact,
    });
    downloadOriroHubPackageArchiveMock.mockResolvedValueOnce({
      archivePath: "/tmp/orirohub-demo/demo-2026.3.22.tgz",
      integrity: DEMO_ORIROPACK_INTEGRITY,
      sha256Hex: DEMO_ORIROPACK_SHA256,
      artifact: "oriropack",
      oriropackHeaderSha256: DEMO_ORIROPACK_SHA256,
      npmIntegrity: "sha512-oriropack",
      npmShasum: "1".repeat(40),
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
      baseUrl: "https://orirohub.ai",
    });

    const success = expectInstallSuccess(result);
    expect(success.orirohub?.artifactKind).toBe("npm-pack");
    expect(success.orirohub?.artifactFormat).toBe("tgz");
    expect(success.orirohub?.npmIntegrity).toBe("sha512-oriropack");
    expect(success.orirohub?.npmShasum).toBe("1".repeat(40));
    expect(success.orirohub?.oriropackSha256).toBe(DEMO_ORIROPACK_SHA256);
    expect(fetchOriroHubPackageVersionMock).not.toHaveBeenCalled();
    expect(archiveDownloadCall().artifact).toBe("oriropack");
    expect(archiveDownloadCall().name).toBe("demo");
    expect(archiveDownloadCall().version).toBe("2026.3.22");
  });

  it("accepts the live OriroHub legacy zip resolver shape with kind/sha256 field names", async () => {
    fetchOriroHubPackageVersionMock.mockClear();
    fetchOriroHubPackageArtifactMock.mockResolvedValueOnce({
      package: {
        name: "demo",
        displayName: "Demo",
        family: "code-plugin",
      },
      version: "2026.3.22",
      artifact: {
        kind: "legacy-zip",
        sha256: DEMO_ARCHIVE_SHA256,
      } as unknown as OriroHubResolvedArtifact,
    });
    downloadOriroHubPackageArchiveMock.mockResolvedValueOnce({
      archivePath: "/tmp/orirohub-demo/archive.zip",
      integrity: DEMO_ARCHIVE_INTEGRITY,
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
      baseUrl: "https://orirohub.ai",
    });

    const success = expectInstallSuccess(result);
    expect(success.pluginId).toBe("demo");
    expect(success.orirohub?.artifactKind).toBe("legacy-zip");
    expect(success.orirohub?.artifactFormat).toBe("zip");
    expect(success.orirohub?.integrity).toBe(DEMO_ARCHIVE_INTEGRITY);
    expect(fetchOriroHubPackageVersionMock).not.toHaveBeenCalled();
    expect(archiveDownloadCall().artifact).toBe("archive");
    expect(archiveDownloadCall().name).toBe("demo");
    expect(archiveDownloadCall().version).toBe("2026.3.22");
  });

  it("falls back to version metadata when the OriroHub artifact resolver route is missing", async () => {
    fetchOriroHubPackageArtifactMock.mockRejectedValueOnce(
      new OriroHubRequestError({
        path: "/api/v1/packages/demo/versions/2026.3.22/artifact",
        status: 404,
        body: "Not Found",
      }),
    );
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      package: {
        name: "demo",
        displayName: "Demo",
        family: "code-plugin",
      },
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
        artifact: {
          kind: "npm-pack",
          format: "tgz",
          sha256: DEMO_ORIROPACK_SHA256,
          size: 4096,
          npmIntegrity: "sha512-oriropack",
          npmShasum: "1".repeat(40),
        },
      },
    });
    downloadOriroHubPackageArchiveMock.mockResolvedValueOnce({
      archivePath: "/tmp/orirohub-demo/demo-2026.3.22.tgz",
      integrity: DEMO_ORIROPACK_INTEGRITY,
      sha256Hex: DEMO_ORIROPACK_SHA256,
      artifact: "oriropack",
      oriropackHeaderSha256: DEMO_ORIROPACK_SHA256,
      npmIntegrity: "sha512-oriropack",
      npmShasum: "1".repeat(40),
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
      baseUrl: "https://orirohub.ai",
    });

    const success = expectInstallSuccess(result);
    expect(success.orirohub?.artifactKind).toBe("npm-pack");
    expect(success.orirohub?.npmIntegrity).toBe("sha512-oriropack");
    expect(success.orirohub?.oriropackSha256).toBe(DEMO_ORIROPACK_SHA256);
    expect(packageVersionCall().name).toBe("demo");
    expect(packageVersionCall().version).toBe("2026.3.22");
    expect(archiveDownloadCall().artifact).toBe("oriropack");
    expect(archiveDownloadCall().name).toBe("demo");
    expect(archiveDownloadCall().version).toBe("2026.3.22");
  });

  it("installs OriroPack artifacts when version metadata has no legacy archive hash", async () => {
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
        artifact: {
          kind: "npm-pack",
          format: "tgz",
          sha256: DEMO_ORIROPACK_SHA256,
          size: 4096,
        },
      },
    });
    downloadOriroHubPackageArchiveMock.mockResolvedValueOnce({
      archivePath: "/tmp/orirohub-demo/demo-2026.3.22.tgz",
      integrity: DEMO_ORIROPACK_INTEGRITY,
      sha256Hex: DEMO_ORIROPACK_SHA256,
      artifact: "oriropack",
      oriropackHeaderSha256: DEMO_ORIROPACK_SHA256,
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
      baseUrl: "https://orirohub.ai",
    });

    const success = expectInstallSuccess(result);
    expect(success.orirohub?.integrity).toBe(DEMO_ORIROPACK_INTEGRITY);
    expect(success.orirohub?.oriropackSha256).toBe(DEMO_ORIROPACK_SHA256);
    expect(archiveDownloadCall().artifact).toBe("oriropack");
    expect(archiveInstallCall().archivePath).toBe("/tmp/orirohub-demo/demo-2026.3.22.tgz");
  });

  it("rejects OriroPack artifacts when the download digest does not match version metadata", async () => {
    const mismatchedSha256 = "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
        artifact: {
          kind: "npm-pack",
          format: "tgz",
          sha256: DEMO_ORIROPACK_SHA256,
        },
      },
    });
    downloadOriroHubPackageArchiveMock.mockResolvedValueOnce({
      archivePath: "/tmp/orirohub-demo/demo-2026.3.22.tgz",
      integrity: `sha256-${Buffer.from(mismatchedSha256, "hex").toString("base64")}`,
      sha256Hex: mismatchedSha256,
      artifact: "oriropack",
      oriropackHeaderSha256: mismatchedSha256,
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
      baseUrl: "https://orirohub.ai",
    });

    const failure = expectInstallFailure(result);
    expect(failure.code).toBe(ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH);
    expect(failure.error).toBe(
      `OriroHub OriroPack integrity mismatch for "demo@2026.3.22": expected ${DEMO_ORIROPACK_SHA256}, got ${mismatchedSha256}.`,
    );
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
    expect(archiveCleanupMock).toHaveBeenCalledTimes(1);
  });

  it("points explicit OriroHub OriroPack download failures at npm during launch rollout", async () => {
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
        artifact: {
          kind: "npm-pack",
          format: "tgz",
          sha256: DEMO_ORIROPACK_SHA256,
        },
      },
    });
    downloadOriroHubPackageArchiveMock.mockRejectedValueOnce(
      new OriroHubRequestError({
        path: "/api/v1/packages/demo/versions/2026.3.22/artifact/download",
        status: 404,
        body: "Not Found",
      }),
    );

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
      baseUrl: "https://orirohub.ai",
    });

    const failure = expectInstallFailure(result);
    expect(failure.error).toBe(
      'OriroHub artifact download for "demo@2026.3.22" is not available yet (OriroHub /api/v1/packages/demo/versions/2026.3.22/artifact/download failed (404): Not Found). Use "npm:demo@2026.3.22" for launch installs while OriroHub artifact routing is being rolled out.',
    );
    expect(failure.code).toBe(ORIROHUB_INSTALL_ERROR_CODE.ARTIFACT_DOWNLOAD_UNAVAILABLE);
    expect(archiveDownloadCall().artifact).toBe("oriropack");
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
  });

  it("does not persist package-level OriroPack metadata for version records without OriroPack facts", async () => {
    parseOriroHubPluginSpecMock.mockReturnValueOnce({ name: "demo", version: "2026.3.21" });
    fetchOriroHubPackageDetailMock.mockResolvedValueOnce({
      package: {
        name: "demo",
        displayName: "Demo",
        family: "code-plugin",
        channel: "official",
        isOfficial: true,
        createdAt: 0,
        updatedAt: 0,
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
        artifact: {
          kind: "npm-pack",
          format: "tgz",
          sha256: DEMO_ORIROPACK_SHA256,
          size: 4096,
        },
      },
    });
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.21",
        createdAt: 0,
        changelog: "",
        sha256hash: "a9eac48c6129bc44b6f93c9a9f48f6c700d191b7279a1e1915f28df6f59bb1af",
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo@2026.3.21",
      baseUrl: "https://orirohub.ai",
    });

    const success = expectInstallSuccess(result);
    expect(success.orirohub?.source).toBe("orirohub");
    expect(success.orirohub?.oriropackSha256).toBeUndefined();
    expect(success.orirohub?.oriropackSpecVersion).toBeUndefined();
    expect(success.orirohub?.oriropackManifestSha256).toBeUndefined();
    expect(success.orirohub?.oriropackSize).toBeUndefined();
  });

  it("installs when OriroHub advertises a wildcard plugin API range", async () => {
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        sha256hash: "a9eac48c6129bc44b6f93c9a9f48f6c700d191b7279a1e1915f28df6f59bb1af",
        compatibility: {
          pluginApiRange: "*",
          minGatewayVersion: "2026.3.0",
        },
      },
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
      baseUrl: "https://orirohub.ai",
    });

    expectSuccessfulOriroHubInstall(result);
    expect(downloadOriroHubPackageArchiveMock).toHaveBeenCalledTimes(1);
    expect(archiveInstallCall().archivePath).toBe("/tmp/orirohub-demo/archive.zip");
    expect(archiveCleanupMock).toHaveBeenCalledTimes(1);
  });

  it("installs when a release correction runtime satisfies the base plugin API range", async () => {
    resolveCompatibilityHostVersionMock.mockReturnValueOnce("2026.5.3-1");
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.5.3",
        createdAt: 0,
        changelog: "",
        sha256hash: "a9eac48c6129bc44b6f93c9a9f48f6c700d191b7279a1e1915f28df6f59bb1af",
        compatibility: {
          pluginApiRange: ">=2026.5.3",
          minGatewayVersion: "2026.3.0",
        },
      },
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
      baseUrl: "https://orirohub.ai",
    });

    expectSuccessfulOriroHubInstall(result);
    expect(downloadOriroHubPackageArchiveMock).toHaveBeenCalledTimes(1);
    expect(archiveInstallCall().archivePath).toBe("/tmp/orirohub-demo/archive.zip");
    expect(archiveCleanupMock).toHaveBeenCalledTimes(1);
  });

  it("installs when a beta runtime is on the same plugin API floor", async () => {
    resolveCompatibilityHostVersionMock.mockReturnValueOnce("2026.5.27-beta.1");
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.5.27",
        createdAt: 0,
        changelog: "",
        sha256hash: "a9eac48c6129bc44b6f93c9a9f48f6c700d191b7279a1e1915f28df6f59bb1af",
        compatibility: {
          pluginApiRange: ">=2026.5.27",
          minGatewayVersion: "2026.3.0",
        },
      },
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
      baseUrl: "https://orirohub.ai",
    });

    expectSuccessfulOriroHubInstall(result);
    expect(downloadOriroHubPackageArchiveMock).toHaveBeenCalledTimes(1);
    expect(archiveInstallCall().archivePath).toBe("/tmp/orirohub-demo/archive.zip");
    expect(archiveCleanupMock).toHaveBeenCalledTimes(1);
  });

  it("does not let a wildcard plugin API range hide an invalid runtime version", async () => {
    resolveCompatibilityHostVersionMock.mockReturnValueOnce("invalid");
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        sha256hash: "a9eac48c6129bc44b6f93c9a9f48f6c700d191b7279a1e1915f28df6f59bb1af",
        compatibility: {
          pluginApiRange: "*",
          minGatewayVersion: "2026.3.0",
        },
      },
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
    });

    const failure = expectInstallFailure(result);
    expect(failure.code).toBe(ORIROHUB_INSTALL_ERROR_CODE.INCOMPATIBLE_PLUGIN_API);
    expect(failure.error).toBe(
      'Plugin "demo" requires plugin API *, but this Oriro runtime exposes invalid.',
    );
    expect(downloadOriroHubPackageArchiveMock).not.toHaveBeenCalled();
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
    expect(archiveCleanupMock).not.toHaveBeenCalled();
  });

  it("passes dangerous force unsafe install through to archive installs", async () => {
    await installPluginFromOriroHub({
      spec: "orirohub:demo",
      dangerouslyForceUnsafeInstall: true,
    });

    expect(archiveInstallCall().archivePath).toBe("/tmp/orirohub-demo/archive.zip");
    expect(archiveInstallCall().dangerouslyForceUnsafeInstall).toBe(true);
  });

  it("cleans up the downloaded archive even when archive install fails", async () => {
    installPluginFromArchiveMock.mockResolvedValueOnce({
      ok: false,
      error: "bad archive",
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
      baseUrl: "https://orirohub.ai",
    });

    expect(expectInstallFailure(result).error).toBe("bad archive");
    expect(archiveCleanupMock).toHaveBeenCalledTimes(1);
  });

  it("accepts version-endpoint SHA-256 hashes expressed as raw hex", async () => {
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        sha256hash: "a9eac48c6129bc44b6f93c9a9f48f6c700d191b7279a1e1915f28df6f59bb1af",
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadOriroHubPackageArchiveMock.mockResolvedValueOnce({
      archivePath: "/tmp/orirohub-demo/archive.zip",
      integrity: "sha256-qerEjGEpvES2+Tyan0j2xwDRkbcnmh4ZFfKN9vWbsa8=",
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
    });

    const success = expectInstallSuccess(result);
    expect(success.pluginId).toBe("demo");
  });

  it("accepts version-endpoint SHA-256 hashes expressed as unpadded SRI", async () => {
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        sha256hash: "sha256-qerEjGEpvES2+Tyan0j2xwDRkbcnmh4ZFfKN9vWbsa8",
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadOriroHubPackageArchiveMock.mockResolvedValueOnce({
      archivePath: "/tmp/orirohub-demo/archive.zip",
      integrity: DEMO_ARCHIVE_INTEGRITY,
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
    });

    const success = expectInstallSuccess(result);
    expect(success.pluginId).toBe("demo");
  });

  it("falls back to strict files[] verification when sha256hash is missing", async () => {
    const archive = await createOriroHubArchive({
      "oriro.plugin.json": '{"id":"demo"}',
      "dist/index.js": 'export const demo = "ok";',
      "_meta.json": '{"slug":"demo","version":"2026.3.22"}',
    });
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        sha256hash: null,
        files: [
          {
            path: "dist/index.js",
            size: 25,
            sha256: sha256Hex('export const demo = "ok";'),
          },
          {
            path: "oriro.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadOriroHubPackageArchiveMock.mockResolvedValueOnce({
      ...archive,
      cleanup: archiveCleanupMock,
    });
    const logger = createLoggerSpies();

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
      logger,
    });

    const success = expectInstallSuccess(result);
    expect(success.pluginId).toBe("demo");
    expect(logger.warn).toHaveBeenCalledWith(
      'OriroHub package "demo@2026.3.22" is missing sha256hash; falling back to files[] verification. Validated files: dist/index.js, oriro.plugin.json. Validated generated metadata files present in archive: _meta.json (JSON parse plus slug/version match only).',
    );
  });

  it("validates _meta.json against canonical package and resolved version metadata", async () => {
    const archive = await createOriroHubArchive({
      "oriro.plugin.json": '{"id":"demo"}',
      "_meta.json": '{"slug":"demo","version":"2026.3.22"}',
    });
    parseOriroHubPluginSpecMock.mockReturnValueOnce({ name: "DemoAlias", version: "latest" });
    fetchOriroHubPackageDetailMock.mockResolvedValueOnce({
      package: {
        name: "demo",
        displayName: "Demo",
        family: "code-plugin",
        channel: "official",
        isOfficial: true,
        createdAt: 0,
        updatedAt: 0,
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        sha256hash: null,
        files: [
          {
            path: "oriro.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadOriroHubPackageArchiveMock.mockResolvedValueOnce({
      ...archive,
      cleanup: archiveCleanupMock,
    });
    const logger = createLoggerSpies();

    const result = await installPluginFromOriroHub({
      spec: "orirohub:DemoAlias@latest",
      logger,
    });

    const success = expectInstallSuccess(result);
    expect(success.pluginId).toBe("demo");
    expect(success.version).toBe("2026.3.22");
    expect(packageDetailCall().name).toBe("DemoAlias");
    expect(packageVersionCall().name).toBe("demo");
    expect(packageVersionCall().version).toBe("latest");
    expect(logger.warn).toHaveBeenCalledWith(
      'OriroHub package "demo@2026.3.22" is missing sha256hash; falling back to files[] verification. Validated files: oriro.plugin.json. Validated generated metadata files present in archive: _meta.json (JSON parse plus slug/version match only).',
    );
  });

  it("fails closed when sha256hash is present but unrecognized instead of silently falling back", async () => {
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        sha256hash: "definitely-not-a-sha256",
        files: [
          {
            path: "oriro.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
    });

    const failure = expectInstallFailure(result);
    expect(failure.code).toBe(ORIROHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY);
    expect(failure.error).toBe(
      'OriroHub version metadata for "demo@2026.3.22" has an invalid sha256hash (unrecognized value "definitely-not-a-sha256").',
    );
    expect(downloadOriroHubPackageArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects OriroHub installs when sha256hash is explicitly null and files[] is unavailable", async () => {
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        sha256hash: null,
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
    });

    const failure = expectInstallFailure(result);
    expect(failure.code).toBe(ORIROHUB_INSTALL_ERROR_CODE.ARTIFACT_UNAVAILABLE);
    expect(failure.error).toBe(
      'OriroHub package "demo@2026.3.22" does not expose a downloadable plugin artifact yet. Use "npm:demo@2026.3.22" for launch installs while OriroHub artifact routing is being rolled out.',
    );
    expect(downloadOriroHubPackageArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects OriroHub installs when the version metadata has no archive hash or fallback files[]", async () => {
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
    });

    const failure = expectInstallFailure(result);
    expect(failure.code).toBe(ORIROHUB_INSTALL_ERROR_CODE.ARTIFACT_UNAVAILABLE);
    expect(failure.error).toBe(
      'OriroHub package "demo@2026.3.22" does not expose a downloadable plugin artifact yet. Use "npm:demo@2026.3.22" for launch installs while OriroHub artifact routing is being rolled out.',
    );
    expect(downloadOriroHubPackageArchiveMock).not.toHaveBeenCalled();
  });

  it("fails closed when files[] contains a malformed entry", async () => {
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [null as unknown as { path: string; sha256: string }],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
    });

    const failure = expectInstallFailure(result);
    expect(failure.code).toBe(ORIROHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY);
    expect(failure.error).toBe(
      'OriroHub version metadata for "demo@2026.3.22" has an invalid files[0] entry (expected an object, got null).',
    );
    expect(downloadOriroHubPackageArchiveMock).not.toHaveBeenCalled();
  });

  it("fails closed when files[] contains an invalid sha256", async () => {
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "oriro.plugin.json",
            size: 13,
            sha256: "not-a-digest",
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
    });

    expectInstallFailureFields(
      result,
      ORIROHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      'OriroHub version metadata for "demo@2026.3.22" has an invalid files[0].sha256 (value "not-a-digest" is not a 64-character hexadecimal SHA-256 digest).',
    );
    expect(downloadOriroHubPackageArchiveMock).not.toHaveBeenCalled();
  });

  it("fails closed when sha256hash is not a string", async () => {
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        sha256hash: 123 as unknown as string,
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
    });

    expectInstallFailureFields(
      result,
      ORIROHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      'OriroHub version metadata for "demo@2026.3.22" has an invalid sha256hash (non-string value of type number).',
    );
    expect(downloadOriroHubPackageArchiveMock).not.toHaveBeenCalled();
  });

  it("returns a typed install failure when the archive download throws", async () => {
    downloadOriroHubPackageArchiveMock.mockRejectedValueOnce(new Error("network timeout"));

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
    });

    expect(expectInstallFailure(result).error).toBe("network timeout");
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
  });

  it("returns a typed install failure when fallback archive verification cannot read the zip", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "oriro-orirohub-archive-"));
    tempDirs.push(dir);
    const archivePath = path.join(dir, "archive.zip");
    await fs.writeFile(archivePath, "not-a-zip", "utf8");
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "oriro.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadOriroHubPackageArchiveMock.mockResolvedValueOnce({
      archivePath,
      integrity: "sha256-not-used-in-fallback",
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
    });

    expectInstallFailureFields(
      result,
      ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      "OriroHub archive fallback verification failed while reading the downloaded archive.",
    );
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects OriroHub installs when the downloaded archive hash drifts from metadata", async () => {
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        sha256hash: "1111111111111111111111111111111111111111111111111111111111111111",
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadOriroHubPackageArchiveMock.mockResolvedValueOnce({
      archivePath: "/tmp/orirohub-demo/archive.zip",
      integrity: DEMO_ARCHIVE_INTEGRITY,
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
    });

    expectInstallFailureFields(
      result,
      ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      `OriroHub archive integrity mismatch for "demo@2026.3.22": expected sha256-ERERERERERERERERERERERERERERERERERERERERERE=, got ${DEMO_ARCHIVE_INTEGRITY}.`,
    );
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
    expect(archiveCleanupMock).toHaveBeenCalledTimes(1);
  });

  it("rejects fallback verification when an expected file is missing from the archive", async () => {
    const archive = await createOriroHubArchive({
      "oriro.plugin.json": '{"id":"demo"}',
    });
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "oriro.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
          {
            path: "dist/index.js",
            size: 25,
            sha256: sha256Hex('export const demo = "ok";'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadOriroHubPackageArchiveMock.mockResolvedValueOnce({
      ...archive,
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
    });

    expectInstallFailureFields(
      result,
      ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      'OriroHub archive contents do not match files[] metadata for "demo@2026.3.22": missing "dist/index.js".',
    );
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects fallback verification when the archive includes an unexpected file", async () => {
    const archive = await createOriroHubArchive({
      "oriro.plugin.json": '{"id":"demo"}',
      "dist/index.js": 'export const demo = "ok";',
      "extra.txt": "surprise",
    });
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "oriro.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
          {
            path: "dist/index.js",
            size: 25,
            sha256: sha256Hex('export const demo = "ok";'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadOriroHubPackageArchiveMock.mockResolvedValueOnce({
      ...archive,
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
    });

    expectInstallFailureFields(
      result,
      ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      'OriroHub archive contents do not match files[] metadata for "demo@2026.3.22": unexpected file "extra.txt".',
    );
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
  });

  it("accepts root-level files[] paths and allows _meta.json as an unvalidated generated file", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "oriro-orirohub-archive-"));
    tempDirs.push(dir);
    const archivePath = path.join(dir, "archive.zip");
    const zip = new JSZip();
    zip.file("scripts/search.py", "print('ok')\n");
    zip.file("SKILL.md", "# Demo\n");
    zip.file("_meta.json", '{"slug":"demo","version":"2026.3.22"}');
    const archiveBytes = await zip.generateAsync({ type: "nodebuffer" });
    await fs.writeFile(archivePath, archiveBytes);
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "scripts/search.py",
            size: 12,
            sha256: sha256Hex("print('ok')\n"),
          },
          {
            path: "SKILL.md",
            size: 7,
            sha256: sha256Hex("# Demo\n"),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadOriroHubPackageArchiveMock.mockResolvedValueOnce({
      archivePath,
      integrity: `sha256-${createHash("sha256").update(archiveBytes).digest("base64")}`,
      cleanup: archiveCleanupMock,
    });
    const logger = createLoggerSpies();

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
      logger,
    });

    expect(expectInstallSuccess(result).pluginId).toBe("demo");
    expect(logger.warn).toHaveBeenCalledWith(
      'OriroHub package "demo@2026.3.22" is missing sha256hash; falling back to files[] verification. Validated files: SKILL.md, scripts/search.py. Validated generated metadata files present in archive: _meta.json (JSON parse plus slug/version match only).',
    );
  });

  it("omits the skipped-files suffix when no generated extras are present", async () => {
    const archive = await createOriroHubArchive({
      "oriro.plugin.json": '{"id":"demo"}',
    });
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "oriro.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadOriroHubPackageArchiveMock.mockResolvedValueOnce({
      ...archive,
      cleanup: archiveCleanupMock,
    });
    const logger = createLoggerSpies();

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
      logger,
    });

    expect(expectInstallSuccess(result).pluginId).toBe("demo");
    expect(logger.warn).toHaveBeenCalledWith(
      'OriroHub package "demo@2026.3.22" is missing sha256hash; falling back to files[] verification. Validated files: oriro.plugin.json.',
    );
  });

  it("rejects fallback verification when _meta.json is not valid JSON", async () => {
    const archive = await createOriroHubArchive({
      "oriro.plugin.json": '{"id":"demo"}',
      "_meta.json": "{not-json",
    });
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "oriro.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadOriroHubPackageArchiveMock.mockResolvedValueOnce({
      ...archive,
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
    });

    expectInstallFailureFields(
      result,
      ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      'OriroHub archive contents do not match files[] metadata for "demo@2026.3.22": _meta.json is not valid JSON.',
    );
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects fallback verification when _meta.json slug does not match the package name", async () => {
    const archive = await createOriroHubArchive({
      "oriro.plugin.json": '{"id":"demo"}',
      "_meta.json": '{"slug":"wrong","version":"2026.3.22"}',
    });
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "oriro.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadOriroHubPackageArchiveMock.mockResolvedValueOnce({
      ...archive,
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
    });

    expectInstallFailureFields(
      result,
      ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      'OriroHub archive contents do not match files[] metadata for "demo@2026.3.22": _meta.json slug does not match the package name.',
    );
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects fallback verification when _meta.json exceeds the per-file size limit", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "oriro-orirohub-archive-"));
    tempDirs.push(dir);
    const archivePath = path.join(dir, "archive.zip");
    await fs.writeFile(archivePath, "placeholder", "utf8");
    const oversizedMetaEntry = {
      name: "_meta.json",
      dir: false,
      _data: { uncompressedSize: 256 * 1024 * 1024 + 1 },
      nodeStream: vi.fn(),
    } as unknown as JSZip.JSZipObject;
    const listedFileEntry = {
      name: "oriro.plugin.json",
      dir: false,
      _data: { uncompressedSize: 13 },
      nodeStream: () => Readable.from([Buffer.from('{"id":"demo"}')]),
    } as unknown as JSZip.JSZipObject;
    const loadAsyncSpy = vi.spyOn(JSZip, "loadAsync").mockResolvedValueOnce({
      files: {
        "_meta.json": oversizedMetaEntry,
        "oriro.plugin.json": listedFileEntry,
      },
    } as unknown as JSZip);
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "oriro.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadOriroHubPackageArchiveMock.mockResolvedValueOnce({
      archivePath,
      integrity: "sha256-not-used-in-fallback",
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
    });

    loadAsyncSpy.mockRestore();
    expectInstallFailureFields(
      result,
      ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      'OriroHub archive fallback verification rejected "_meta.json" because it exceeds the per-file size limit.',
    );
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects fallback verification when archive directories alone exceed the entry limit", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "oriro-orirohub-archive-"));
    tempDirs.push(dir);
    const archivePath = path.join(dir, "archive.zip");
    await fs.writeFile(archivePath, "placeholder", "utf8");
    const zipEntries = Object.fromEntries(
      Array.from({ length: 50_001 }, (_, index) => [
        `folder-${index}/`,
        {
          name: `folder-${index}/`,
          dir: true,
        },
      ]),
    );
    const loadAsyncSpy = vi.spyOn(JSZip, "loadAsync").mockResolvedValueOnce({
      files: zipEntries,
    } as unknown as JSZip);
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "oriro.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadOriroHubPackageArchiveMock.mockResolvedValueOnce({
      archivePath,
      integrity: "sha256-not-used-in-fallback",
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
    });

    loadAsyncSpy.mockRestore();
    expectInstallFailureFields(
      result,
      ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      "OriroHub archive fallback verification exceeded the archive entry limit.",
    );
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects fallback verification when the actual ZIP central directory exceeds the entry limit", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "oriro-orirohub-archive-"));
    tempDirs.push(dir);
    const archivePath = path.join(dir, "archive.zip");
    await fs.writeFile(
      archivePath,
      createZipCentralDirectoryArchive({
        actualEntryCount: 50_001,
        declaredEntryCount: 1,
        declaredCentralDirectorySize: 0,
      }),
    );
    const loadAsyncSpy = vi.spyOn(JSZip, "loadAsync");
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "oriro.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadOriroHubPackageArchiveMock.mockResolvedValueOnce({
      archivePath,
      integrity: "sha256-not-used-in-fallback",
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
    });

    loadAsyncSpy.mockRestore();
    expectInstallFailureFields(
      result,
      ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      "OriroHub archive fallback verification exceeded the archive entry limit.",
    );
    expect(loadAsyncSpy).not.toHaveBeenCalled();
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects fallback verification when the downloaded archive exceeds the ZIP size limit", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "oriro-orirohub-archive-"));
    tempDirs.push(dir);
    const archivePath = path.join(dir, "archive.zip");
    await fs.writeFile(archivePath, "placeholder", "utf8");
    const realStat = fs.stat.bind(fs);
    const statSpy = vi.spyOn(fs, "stat").mockImplementation(async (filePath, options) => {
      if (filePath === archivePath) {
        return {
          size: 256 * 1024 * 1024 + 1,
        } as Awaited<ReturnType<typeof fs.stat>>;
      }
      return await realStat(filePath, options);
    });
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "oriro.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadOriroHubPackageArchiveMock.mockResolvedValueOnce({
      archivePath,
      integrity: "sha256-not-used-in-fallback",
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
    });

    statSpy.mockRestore();
    expectInstallFailureFields(
      result,
      ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      "OriroHub archive fallback verification rejected the downloaded archive because it exceeds the ZIP archive size limit.",
    );
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects fallback verification when a file hash drifts from files[] metadata", async () => {
    const archive = await createOriroHubArchive({
      "oriro.plugin.json": '{"id":"demo"}',
    });
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "oriro.plugin.json",
            size: 13,
            sha256: "1".repeat(64),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadOriroHubPackageArchiveMock.mockResolvedValueOnce({
      ...archive,
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
    });

    expectInstallFailureFields(
      result,
      ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      `OriroHub archive contents do not match files[] metadata for "demo@2026.3.22": expected oriro.plugin.json to hash to ${"1".repeat(64)}, got ${sha256Hex('{"id":"demo"}')}.`,
    );
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects fallback metadata with an unsafe files[] path", async () => {
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "../evil.txt",
            size: 4,
            sha256: "1".repeat(64),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
    });

    expectInstallFailureFields(
      result,
      ORIROHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      'OriroHub version metadata for "demo@2026.3.22" has an invalid files[0].path (path "../evil.txt" contains dot segments).',
    );
    expect(downloadOriroHubPackageArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects fallback metadata with leading or trailing path whitespace", async () => {
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "oriro.plugin.json ",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
    });

    expectInstallFailureFields(
      result,
      ORIROHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      'OriroHub version metadata for "demo@2026.3.22" has an invalid files[0].path (path "oriro.plugin.json " has leading or trailing whitespace).',
    );
    expect(downloadOriroHubPackageArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects fallback verification when the archive includes a whitespace-suffixed file path", async () => {
    const archive = await createOriroHubArchive({
      "oriro.plugin.json": '{"id":"demo"}',
      "oriro.plugin.json ": '{"id":"demo"}',
    });
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "oriro.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadOriroHubPackageArchiveMock.mockResolvedValueOnce({
      ...archive,
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
    });

    expectInstallFailureFields(
      result,
      ORIROHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      'OriroHub archive contents do not match files[] metadata for "demo@2026.3.22": invalid package file path "oriro.plugin.json " (path "oriro.plugin.json " has leading or trailing whitespace).',
    );
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects fallback metadata with duplicate files[] paths", async () => {
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "oriro.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
          {
            path: "oriro.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
    });

    expectInstallFailureFields(
      result,
      ORIROHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      'OriroHub version metadata for "demo@2026.3.22" has duplicate files[] path "oriro.plugin.json".',
    );
    expect(downloadOriroHubPackageArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects fallback metadata when files[] includes generated _meta.json", async () => {
    fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "_meta.json",
            size: 64,
            sha256: sha256Hex('{"slug":"demo","version":"2026.3.22"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });

    const result = await installPluginFromOriroHub({
      spec: "orirohub:demo",
    });

    expectInstallFailureFields(
      result,
      ORIROHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      'OriroHub version metadata for "demo@2026.3.22" must not include generated file "_meta.json" in files[].',
    );
    expect(downloadOriroHubPackageArchiveMock).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "rejects packages whose plugin API range exceeds the runtime version",
      setup: () => {
        resolveCompatibilityHostVersionMock.mockReturnValueOnce("2026.3.21");
      },
      spec: "orirohub:demo",
      expected: {
        ok: false,
        code: ORIROHUB_INSTALL_ERROR_CODE.INCOMPATIBLE_PLUGIN_API,
        error:
          'Plugin "demo" requires plugin API >=2026.3.22, but this Oriro runtime exposes 2026.3.21.',
      },
    },
    {
      name: "rejects skill families and redirects to skills install",
      setup: () => {
        fetchOriroHubPackageDetailMock.mockResolvedValueOnce({
          package: {
            name: "calendar",
            displayName: "Calendar",
            family: "skill",
            channel: "official",
            isOfficial: true,
            createdAt: 0,
            updatedAt: 0,
          },
        });
      },
      spec: "orirohub:calendar",
      expected: {
        ok: false,
        code: ORIROHUB_INSTALL_ERROR_CODE.SKILL_PACKAGE,
        error: '"calendar" is a skill. Use "oriro skills install calendar" instead.',
      },
    },
    {
      name: "redirects skill families before missing archive metadata checks",
      setup: () => {
        fetchOriroHubPackageDetailMock.mockResolvedValueOnce({
          package: {
            name: "calendar",
            displayName: "Calendar",
            family: "skill",
            channel: "official",
            isOfficial: true,
            createdAt: 0,
            updatedAt: 0,
          },
        });
        fetchOriroHubPackageVersionMock.mockResolvedValueOnce({
          version: {
            version: "2026.3.22",
            createdAt: 0,
            changelog: "",
          },
        });
      },
      spec: "orirohub:calendar",
      expected: {
        ok: false,
        code: ORIROHUB_INSTALL_ERROR_CODE.SKILL_PACKAGE,
        error: '"calendar" is a skill. Use "oriro skills install calendar" instead.',
      },
    },
    {
      name: "returns typed package-not-found failures",
      setup: () => {
        fetchOriroHubPackageDetailMock.mockRejectedValueOnce(
          new OriroHubRequestError({
            path: "/api/v1/packages/demo",
            status: 404,
            body: "Package not found",
          }),
        );
      },
      spec: "orirohub:demo",
      expected: {
        ok: false,
        code: ORIROHUB_INSTALL_ERROR_CODE.PACKAGE_NOT_FOUND,
        error: "Package not found on OriroHub.",
      },
    },
    {
      name: "returns typed version-not-found failures",
      setup: () => {
        parseOriroHubPluginSpecMock.mockReturnValueOnce({ name: "demo", version: "9.9.9" });
        fetchOriroHubPackageVersionMock.mockRejectedValueOnce(
          new OriroHubRequestError({
            path: "/api/v1/packages/demo/versions/9.9.9",
            status: 404,
            body: "Version not found",
          }),
        );
      },
      spec: "orirohub:demo@9.9.9",
      expected: {
        ok: false,
        code: ORIROHUB_INSTALL_ERROR_CODE.VERSION_NOT_FOUND,
        error: "Version not found on OriroHub: demo@9.9.9.",
      },
    },
  ] as const)("$name", async ({ setup, spec, expected }) => {
    await expectOriroHubInstallError({ setup, spec, expected });
  });
});
