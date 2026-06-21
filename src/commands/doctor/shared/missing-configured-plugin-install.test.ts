// Missing configured plugin install tests cover doctor diagnostics for absent plugin installs.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveRegistryUpdateChannel } from "../../../infra/update-channels.js";
import {
  resolveOriroHubInstallSpecsForUpdateChannel,
  resolveNpmInstallSpecsForUpdateChannel,
} from "../../../plugins/install-channel-specs.js";
import { VERSION } from "../../../version.js";

function expectedNpmInstallSpec(spec: string): string {
  return resolveNpmInstallSpecsForUpdateChannel({
    spec,
    updateChannel: resolveRegistryUpdateChannel({ currentVersion: VERSION }),
  }).installSpec;
}

function expectedOriroHubInstallSpec(spec: string): string {
  return resolveOriroHubInstallSpecsForUpdateChannel({
    spec,
    updateChannel: resolveRegistryUpdateChannel({ currentVersion: VERSION }),
  }).installSpec;
}

function currentOriroReleaseBase(): string {
  return VERSION.replace(/-(?:alpha|beta)\.[1-9]\d*$/u, "");
}

function expectRecordFields(record: unknown, expected: Record<string, unknown>) {
  if (!record || typeof record !== "object") {
    throw new Error("Expected record");
  }
  const actual = record as Record<string, unknown>;
  for (const [key, value] of Object.entries(expected)) {
    expect(actual[key]).toEqual(value);
  }
  return actual;
}

function mockCallArg(mock: ReturnType<typeof vi.fn>, callIndex = 0, argIndex = 0) {
  const call = mock.mock.calls[callIndex];
  if (!call) {
    throw new Error(`Expected mock call ${callIndex}`);
  }
  return call[argIndex];
}

const mocks = vi.hoisted(() => ({
  installPluginFromOriroHub: vi.fn(),
  installPluginFromNpmSpec: vi.fn(),
  listChannelPluginCatalogEntries: vi.fn(),
  listOfficialExternalPluginCatalogEntries: vi.fn(),
  loadInstalledPluginIndex: vi.fn(),
  loadInstalledPluginIndexInstallRecords: vi.fn(),
  loadPluginMetadataSnapshot: vi.fn(),
  getOfficialExternalPluginCatalogManifest: vi.fn(
    (entry: { oriro?: unknown }) => entry.oriro,
  ),
  resolveOfficialExternalPluginId: vi.fn((entry: { id?: string }) => entry.id),
  resolveOfficialExternalPluginInstall: vi.fn(
    (entry: { install?: unknown }) => entry.install ?? null,
  ),
  resolveOfficialExternalPluginLabel: vi.fn(
    (entry: { label?: string; id?: string }) => entry.label ?? entry.id ?? "plugin",
  ),
  resolveOfficialExternalProviderContractPluginIds: vi.fn(),
  resolveOfficialExternalProviderPluginIds: vi.fn(),
  resolveOfficialExternalProviderPluginIdsForEnv: vi.fn(),
  resolveOfficialExternalWebProviderContractPluginIdsForEnv: vi.fn(),
  resolveDefaultPluginExtensionsDir: vi.fn(() => "/tmp/oriro-plugins"),
  resolveDefaultPluginNpmDir: vi.fn(() => "/tmp/oriro-npm"),
  resolvePluginNpmPackageDir: vi.fn(
    ({ npmDir, packageName }: { npmDir?: string; packageName: string }) =>
      path.join(
        npmDir ?? "/tmp/oriro-npm",
        "projects",
        packageName.replace(/[^a-zA-Z0-9._-]+/g, "-"),
        "node_modules",
        ...packageName.split("/"),
      ),
  ),
  resolvePluginInstallDir: vi.fn(
    (pluginId: string, extensionsDir = "/tmp/oriro-plugins") => `${extensionsDir}/${pluginId}`,
  ),
  validatePluginId: vi.fn(() => null),
  resolveProviderInstallCatalogEntries: vi.fn(),
  updateNpmInstalledPlugins: vi.fn(),
  writePersistedInstalledPluginIndexInstallRecords: vi.fn(),
}));

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oriro-plugin-stub-repair-"));
  tempDirs.push(dir);
  return dir;
}

function writeLegacyNpmDeclarationStub(params: {
  pluginDir: string;
  pluginId: string;
  npmSpec: string;
}): void {
  fs.mkdirSync(params.pluginDir, { recursive: true });
  fs.writeFileSync(
    path.join(params.pluginDir, "oriro.extension.json"),
    JSON.stringify({
      name: params.pluginId,
      type: "npm",
      npmSpec: params.npmSpec,
    }),
    "utf8",
  );
}

vi.mock("../../../channels/plugins/catalog.js", () => ({
  listChannelPluginCatalogEntries: mocks.listChannelPluginCatalogEntries,
  listRawChannelPluginCatalogEntries: mocks.listChannelPluginCatalogEntries,
}));

vi.mock("../../../plugins/installed-plugin-index-records.js", () => ({
  loadInstalledPluginIndexInstallRecords: mocks.loadInstalledPluginIndexInstallRecords,
  writePersistedInstalledPluginIndexInstallRecords:
    mocks.writePersistedInstalledPluginIndexInstallRecords,
}));

vi.mock("../../../plugins/installed-plugin-index.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../plugins/installed-plugin-index.js")>()),
  loadInstalledPluginIndex: mocks.loadInstalledPluginIndex,
}));

vi.mock("../../../plugins/install-paths.js", () => ({
  resolveDefaultPluginExtensionsDir: mocks.resolveDefaultPluginExtensionsDir,
  resolveDefaultPluginNpmDir: mocks.resolveDefaultPluginNpmDir,
  resolvePluginNpmPackageDir: mocks.resolvePluginNpmPackageDir,
  resolvePluginInstallDir: mocks.resolvePluginInstallDir,
  validatePluginId: mocks.validatePluginId,
}));

vi.mock("../../../plugins/install.js", () => ({
  installPluginFromNpmSpec: mocks.installPluginFromNpmSpec,
}));

vi.mock("../../../plugins/orirohub.js", () => ({
  ORIROHUB_INSTALL_ERROR_CODE: {
    PACKAGE_NOT_FOUND: "package_not_found",
    VERSION_NOT_FOUND: "version_not_found",
    ARTIFACT_UNAVAILABLE: "artifact_unavailable",
    ARTIFACT_DOWNLOAD_UNAVAILABLE: "artifact_download_unavailable",
  },
  installPluginFromOriroHub: mocks.installPluginFromOriroHub,
}));

vi.mock("../../../plugins/plugin-metadata-snapshot.js", () => ({
  loadPluginMetadataSnapshot: mocks.loadPluginMetadataSnapshot,
  resolvePluginMetadataSnapshot: mocks.loadPluginMetadataSnapshot,
}));

vi.mock("../../../plugins/official-external-plugin-catalog.js", () => ({
  getOfficialExternalPluginCatalogManifest: mocks.getOfficialExternalPluginCatalogManifest,
  listOfficialExternalPluginCatalogEntries: mocks.listOfficialExternalPluginCatalogEntries,
  resolveOfficialExternalPluginId: mocks.resolveOfficialExternalPluginId,
  resolveOfficialExternalPluginInstall: mocks.resolveOfficialExternalPluginInstall,
  resolveOfficialExternalPluginLabel: mocks.resolveOfficialExternalPluginLabel,
  resolveOfficialExternalProviderContractPluginIds:
    mocks.resolveOfficialExternalProviderContractPluginIds,
  resolveOfficialExternalProviderPluginIds: mocks.resolveOfficialExternalProviderPluginIds,
  resolveOfficialExternalProviderPluginIdsForEnv:
    mocks.resolveOfficialExternalProviderPluginIdsForEnv,
  resolveOfficialExternalWebProviderContractPluginIdsForEnv:
    mocks.resolveOfficialExternalWebProviderContractPluginIdsForEnv,
}));

vi.mock("../../../plugins/provider-install-catalog.js", () => ({
  resolveProviderInstallCatalogEntries: mocks.resolveProviderInstallCatalogEntries,
}));

vi.mock("../../../plugins/update.js", () => ({
  updateNpmInstalledPlugins: mocks.updateNpmInstalledPlugins,
}));

describe("repairMissingConfiguredPluginInstalls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadPluginMetadataSnapshot.mockReturnValue({
      plugins: [],
      diagnostics: [],
    });
    mocks.loadInstalledPluginIndex.mockReturnValue({
      plugins: [],
      diagnostics: [],
      installRecords: {},
    });
    mocks.loadInstalledPluginIndexInstallRecords.mockResolvedValue({});
    mocks.listChannelPluginCatalogEntries.mockReturnValue([]);
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue([]);
    mocks.resolveDefaultPluginExtensionsDir.mockReturnValue("/tmp/oriro-plugins");
    mocks.resolveDefaultPluginNpmDir.mockReturnValue("/tmp/oriro-npm");
    mocks.resolveProviderInstallCatalogEntries.mockReturnValue([]);
    mocks.resolveOfficialExternalProviderPluginIdsForEnv.mockReturnValue([]);
    mocks.resolveOfficialExternalWebProviderContractPluginIdsForEnv.mockReturnValue([]);
    mocks.resolveOfficialExternalProviderContractPluginIds.mockImplementation(
      ({ contract, providerIds }: { contract: string; providerIds: ReadonlySet<string> }) => {
        const configuredProviderIds = new Set(
          [...providerIds].map((providerId) => providerId.trim().toLowerCase()),
        );
        const entries = mocks.listOfficialExternalPluginCatalogEntries.getMockImplementation()?.();
        if (!Array.isArray(entries)) {
          return [];
        }
        return entries.flatMap((entry) => {
          if (!entry || typeof entry !== "object") {
            return [];
          }
          const candidate = entry as {
            id?: string;
            oriro?: {
              plugin?: { id?: string };
              contracts?: Record<string, unknown>;
            };
          };
          const pluginId = candidate.oriro?.plugin?.id ?? candidate.id;
          const ownedProviderIds = candidate.oriro?.contracts?.[contract];
          if (
            !pluginId ||
            !Array.isArray(ownedProviderIds) ||
            !ownedProviderIds.some(
              (providerId) =>
                typeof providerId === "string" &&
                configuredProviderIds.has(providerId.trim().toLowerCase()),
            )
          ) {
            return [];
          }
          return [pluginId];
        });
      },
    );
    mocks.resolveOfficialExternalProviderPluginIds.mockImplementation(
      ({ providerIds }: { providerIds: ReadonlySet<string> }) => {
        const configuredProviderIds = new Set(
          [...providerIds].map((providerId) => providerId.trim().toLowerCase()),
        );
        const entries = mocks.listOfficialExternalPluginCatalogEntries.getMockImplementation()?.();
        if (!Array.isArray(entries)) {
          return [];
        }
        return entries.flatMap((entry) => {
          if (!entry || typeof entry !== "object") {
            return [];
          }
          const candidate = entry as {
            id?: string;
            oriro?: {
              plugin?: { id?: string };
              providers?: Array<{ id?: string; aliases?: string[] }>;
            };
          };
          const pluginId = candidate.oriro?.plugin?.id ?? candidate.id;
          const ownsConfiguredProvider = candidate.oriro?.providers?.some((provider) =>
            [provider.id, ...(provider.aliases ?? [])].some(
              (providerId) =>
                typeof providerId === "string" &&
                configuredProviderIds.has(providerId.trim().toLowerCase()),
            ),
          );
          return pluginId && ownsConfiguredProvider ? [pluginId] : [];
        });
      },
    );
    mocks.installPluginFromOriroHub.mockResolvedValue({
      ok: true,
      pluginId: "matrix",
      targetDir: "/tmp/oriro-plugins/matrix",
      version: "1.2.3",
      orirohub: {
        source: "orirohub",
        orirohubUrl: "https://orirohub.ai",
        orirohubPackage: "@oriro/plugin-matrix",
        orirohubFamily: "code-plugin",
        orirohubChannel: "official",
        version: "1.2.3",
        integrity: "sha256-orirohub",
        resolvedAt: "2026-05-01T00:00:00.000Z",
        oriropackSha256: "0".repeat(64),
        oriropackSpecVersion: 1,
        oriropackManifestSha256: "1".repeat(64),
        oriropackSize: 1234,
      },
    });
    mocks.installPluginFromNpmSpec.mockResolvedValue({
      ok: true,
      pluginId: "matrix",
      targetDir: "/tmp/oriro-plugins/matrix",
      version: "1.2.3",
      npmResolution: {
        name: "@oriro/plugin-matrix",
        version: "1.2.3",
        resolvedSpec: "@oriro/plugin-matrix@1.2.3",
        integrity: "sha512-test",
        resolvedAt: "2026-05-01T00:00:00.000Z",
      },
    });
  });

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("installs a missing configured Oriro channel plugin from npm by default", async () => {
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "matrix",
        pluginId: "matrix",
        meta: { label: "Matrix" },
        install: {
          npmSpec: "@oriro/plugin-matrix@1.2.3",
          expectedIntegrity: "sha512-test",
        },
        trustedSourceLinkedOfficialInstall: true,
      },
    ]);

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        channels: {
          matrix: { enabled: true, homeserver: "https://matrix.example.org" },
        },
      },
      env: {},
    });

    expect(mocks.installPluginFromOriroHub).not.toHaveBeenCalled();
    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec), {
      spec: "@oriro/plugin-matrix@1.2.3",
      extensionsDir: "/tmp/oriro-plugins",
      expectedPluginId: "matrix",
      expectedIntegrity: "sha512-test",
      trustedSourceLinkedOfficialInstall: true,
    });
    const records = mockCallArg(mocks.writePersistedInstalledPluginIndexInstallRecords);
    expectRecordFields((records as Record<string, unknown>).matrix, {
      source: "npm",
      spec: "@oriro/plugin-matrix@1.2.3",
      installPath: "/tmp/oriro-plugins/matrix",
      version: "1.2.3",
    });
    expect(mockCallArg(mocks.writePersistedInstalledPluginIndexInstallRecords, 0, 1)).toEqual({
      env: {},
    });
    expect(result.changes).toEqual([
      'Installed missing configured plugin "matrix" from @oriro/plugin-matrix@1.2.3.',
    ]);
    expect(result.warnings).toStrictEqual([]);
  });

  it("uses an explicit OriroHub install spec before npm", async () => {
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "matrix",
        pluginId: "matrix",
        meta: { label: "Matrix" },
        install: {
          orirohubSpec: "orirohub:@oriro/plugin-matrix@stable",
          npmSpec: "@oriro/plugin-matrix@1.2.3",
          expectedIntegrity: "sha512-test",
        },
      },
    ]);

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        channels: {
          matrix: { enabled: true, homeserver: "https://matrix.example.org" },
        },
      },
      env: {},
    });

    expectRecordFields(mockCallArg(mocks.installPluginFromOriroHub), {
      spec: "orirohub:@oriro/plugin-matrix@stable",
      expectedPluginId: "matrix",
    });
    expect(mocks.installPluginFromNpmSpec).not.toHaveBeenCalled();
    expect(result.changes).toEqual([
      'Installed missing configured plugin "matrix" from orirohub:@oriro/plugin-matrix@stable.',
    ]);
    expect(result.warnings).toStrictEqual([]);
  });

  it("installs a missing channel plugin selected by environment config from npm", async () => {
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: true,
      pluginId: "matrix",
      targetDir: "/tmp/oriro-plugins/matrix",
      version: "1.2.3",
      npmResolution: {
        name: "@oriro/plugin-matrix",
        version: "1.2.3",
        resolvedSpec: "@oriro/plugin-matrix@1.2.3",
        integrity: "sha512-matrix",
        resolvedAt: "2026-05-01T00:00:00.000Z",
      },
    });
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "matrix",
        pluginId: "matrix",
        meta: { label: "Matrix" },
        install: {
          npmSpec: "@oriro/plugin-matrix@1.2.3",
        },
        trustedSourceLinkedOfficialInstall: true,
      },
    ]);

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {},
      env: { MATRIX_HOMESERVER: "https://matrix.example.org" },
    });

    expect(mocks.installPluginFromOriroHub).not.toHaveBeenCalled();
    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec), {
      spec: "@oriro/plugin-matrix@1.2.3",
      extensionsDir: "/tmp/oriro-plugins",
      expectedPluginId: "matrix",
      trustedSourceLinkedOfficialInstall: true,
    });
    const records = mockCallArg(mocks.writePersistedInstalledPluginIndexInstallRecords);
    expectRecordFields((records as Record<string, unknown>).matrix, {
      source: "npm",
      spec: "@oriro/plugin-matrix@1.2.3",
      installPath: "/tmp/oriro-plugins/matrix",
    });
    expect(mockCallArg(mocks.writePersistedInstalledPluginIndexInstallRecords, 0, 1)).toEqual({
      env: { MATRIX_HOMESERVER: "https://matrix.example.org" },
    });
    expect(result.changes).toEqual([
      'Installed missing configured plugin "matrix" from @oriro/plugin-matrix@1.2.3.',
    ]);
    expect(result.warnings).toStrictEqual([]);
  });

  it("falls back to npm when an Oriro channel plugin artifact is unavailable on OriroHub", async () => {
    mocks.installPluginFromOriroHub.mockResolvedValueOnce({
      ok: false,
      code: "artifact_unavailable",
      error: "OriroHub artifact download is not available yet.",
    });
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "matrix",
        pluginId: "matrix",
        meta: { label: "Matrix" },
        install: {
          orirohubSpec: "orirohub:@oriro/plugin-matrix@stable",
          npmSpec: "@oriro/plugin-matrix@1.2.3",
        },
        trustedSourceLinkedOfficialInstall: true,
      },
    ]);

    const { repairMissingPluginInstallsForIds } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingPluginInstallsForIds({
      cfg: {},
      pluginIds: [],
      channelIds: ["matrix"],
      env: {},
    });

    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec), {
      spec: "@oriro/plugin-matrix@1.2.3",
      expectedPluginId: "matrix",
      trustedSourceLinkedOfficialInstall: true,
    });
    expect(result.changes).toEqual([
      'OriroHub orirohub:@oriro/plugin-matrix@stable unavailable for "matrix"; falling back to npm @oriro/plugin-matrix@1.2.3.',
      'Installed missing configured plugin "matrix" from @oriro/plugin-matrix@1.2.3.',
    ]);
    expect(result.warnings).toStrictEqual([]);
  });

  it("does not fall back from OriroHub to non-Oriro npm packages", async () => {
    mocks.installPluginFromOriroHub.mockResolvedValueOnce({
      ok: false,
      code: "artifact_download_unavailable",
      error: "OriroHub artifact download is not available yet.",
    });
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "matrix",
        pluginId: "matrix",
        meta: { label: "Matrix" },
        install: {
          orirohubSpec: "orirohub:@oriro/plugin-matrix@stable",
          npmSpec: "@someone-else/plugin-matrix@1.2.3",
        },
      },
    ]);

    const { repairMissingPluginInstallsForIds } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingPluginInstallsForIds({
      cfg: {},
      pluginIds: [],
      channelIds: ["matrix"],
      env: {},
    });

    expect(mocks.installPluginFromNpmSpec).not.toHaveBeenCalled();
    expect(result.changes).toStrictEqual([]);
    expect(result.warnings).toEqual([
      'Failed to install missing configured plugin "matrix" from orirohub:@oriro/plugin-matrix@stable: OriroHub artifact download is not available yet.',
    ]);
  });

  it("honors npm-first catalog metadata for missing Oriro channel plugins", async () => {
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: true,
      pluginId: "twitch",
      targetDir: "/tmp/oriro-plugins/twitch",
      version: "2026.5.2",
      npmResolution: {
        name: "@oriro/twitch",
        version: "2026.5.2",
        resolvedSpec: "@oriro/twitch@2026.5.2",
        integrity: "sha512-twitch",
        resolvedAt: "2026-05-01T00:00:00.000Z",
      },
    });
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "twitch",
        pluginId: "twitch",
        meta: { label: "Twitch" },
        install: {
          npmSpec: "@oriro/twitch",
          defaultChoice: "npm",
        },
        trustedSourceLinkedOfficialInstall: true,
      },
    ]);

    const { repairMissingPluginInstallsForIds } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingPluginInstallsForIds({
      cfg: {},
      pluginIds: [],
      channelIds: ["twitch"],
      env: {},
    });

    expect(mocks.installPluginFromOriroHub).not.toHaveBeenCalled();
    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec), {
      spec: expectedNpmInstallSpec("@oriro/twitch"),
      expectedPluginId: "twitch",
      trustedSourceLinkedOfficialInstall: true,
    });
    expect(result.changes).toEqual([
      `Installed missing configured plugin "twitch" from ${expectedNpmInstallSpec("@oriro/twitch")}.`,
    ]);
  });

  it("installs missing configured non-channel plugins from the official external catalog", async () => {
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: true,
      pluginId: "diagnostics-otel",
      targetDir: "/tmp/oriro-plugins/diagnostics-otel",
      version: "2026.5.2",
      npmResolution: {
        name: "@oriro/diagnostics-otel",
        version: "2026.5.2",
        resolvedSpec: "@oriro/diagnostics-otel@2026.5.2",
        integrity: "sha512-otel",
        resolvedAt: "2026-05-01T00:00:00.000Z",
      },
    });
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue([
      {
        id: "diagnostics-otel",
        label: "Diagnostics OpenTelemetry",
        install: {
          orirohubSpec: "orirohub:@oriro/diagnostics-otel",
          npmSpec: "@oriro/diagnostics-otel",
          defaultChoice: "npm",
        },
      },
    ]);

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        plugins: {
          entries: {
            "diagnostics-otel": { enabled: true },
          },
        },
      },
      env: {},
    });

    expect(mocks.installPluginFromOriroHub).not.toHaveBeenCalled();
    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec), {
      spec: expectedNpmInstallSpec("@oriro/diagnostics-otel"),
      expectedPluginId: "diagnostics-otel",
    });
    expect(result.changes).toEqual([
      `Installed missing configured plugin "diagnostics-otel" from ${expectedNpmInstallSpec("@oriro/diagnostics-otel")}.`,
    ]);
  });

  it("installs the official llama.cpp plugin for configured local memory embeddings", async () => {
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: true,
      pluginId: "llama-cpp",
      targetDir: "/tmp/oriro-plugins/llama-cpp",
      version: "2026.6.2",
      npmResolution: {
        name: "@oriro/llama-cpp-provider",
        version: "2026.6.2",
        resolvedSpec: "@oriro/llama-cpp-provider@2026.6.2",
        integrity: "sha512-llama",
        resolvedAt: "2026-06-08T00:00:00.000Z",
      },
    });
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue([
      {
        id: "llama-cpp",
        label: "llama.cpp Provider",
        oriro: {
          plugin: { id: "llama-cpp", label: "llama.cpp Provider" },
          contracts: { embeddingProviders: ["local"] },
          install: {
            npmSpec: "@oriro/llama-cpp-provider",
            defaultChoice: "npm",
          },
        },
        install: {
          npmSpec: "@oriro/llama-cpp-provider",
          defaultChoice: "npm",
        },
      },
    ]);

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        agents: {
          defaults: {
            memorySearch: {
              provider: "local",
            },
          },
        },
      },
      env: {},
    });

    expect(mocks.installPluginFromOriroHub).not.toHaveBeenCalled();
    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec), {
      spec: expectedNpmInstallSpec("@oriro/llama-cpp-provider"),
      expectedPluginId: "llama-cpp",
    });
    expect(result.changes).toEqual([
      `Installed missing configured plugin "llama-cpp" from ${expectedNpmInstallSpec("@oriro/llama-cpp-provider")}.`,
    ]);
  });

  it("does not let runtime fallback metadata override official catalog install specs", async () => {
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: true,
      pluginId: "acpx",
      targetDir: "/tmp/oriro-plugins/acpx",
      version: "2026.5.2-beta.2",
      npmResolution: {
        name: "@oriro/acpx",
        version: "2026.5.2-beta.2",
        resolvedSpec: "@oriro/acpx@2026.5.2-beta.2",
        integrity: "sha512-acpx",
        resolvedAt: "2026-05-01T00:00:00.000Z",
      },
    });
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue([
      {
        id: "acpx",
        label: "ACPX Runtime",
        install: {
          npmSpec: "@oriro/acpx",
          defaultChoice: "npm",
        },
      },
    ]);

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        acp: {
          backend: "acpx",
        },
      },
      env: {},
    });

    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec), {
      spec: expectedNpmInstallSpec("@oriro/acpx"),
      expectedPluginId: "acpx",
      trustedSourceLinkedOfficialInstall: true,
    });
    expect(result.changes).toEqual([
      `Installed missing configured plugin "acpx" from ${expectedNpmInstallSpec("@oriro/acpx")}.`,
    ]);
  });

  it("does not install disabled configured plugin entries", async () => {
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue([
      {
        id: "diagnostics-otel",
        label: "Diagnostics OpenTelemetry",
        install: {
          npmSpec: "@oriro/diagnostics-otel",
          defaultChoice: "npm",
        },
      },
    ]);

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        plugins: {
          entries: {
            "diagnostics-otel": { enabled: false },
          },
        },
      },
      env: {},
    });

    expect(mocks.installPluginFromOriroHub).not.toHaveBeenCalled();
    expect(mocks.installPluginFromNpmSpec).not.toHaveBeenCalled();
    expect(mocks.writePersistedInstalledPluginIndexInstallRecords).not.toHaveBeenCalled();
    expect(result).toEqual({ changes: [], warnings: [], records: {} });
  });

  it.each([
    ["enabled-only disabled stub", { channels: { matrix: { enabled: false } } }],
    [
      "disabled configured channel",
      { channels: { matrix: { enabled: false, homeserver: "https://matrix.example.org" } } },
    ],
  ])("does not install channel plugins for a %s", async (_label, cfg) => {
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "matrix",
        pluginId: "matrix",
        meta: { label: "Matrix" },
        install: {
          npmSpec: "@oriro/plugin-matrix@1.2.3",
        },
      },
    ]);

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg,
      env: {},
    });

    expect(mocks.installPluginFromOriroHub).not.toHaveBeenCalled();
    expect(mocks.installPluginFromNpmSpec).not.toHaveBeenCalled();
    expect(mocks.writePersistedInstalledPluginIndexInstallRecords).not.toHaveBeenCalled();
    expect(result).toEqual({ changes: [], warnings: [], records: {} });
  });

  it("does not install channel plugins when the matching plugin entry is disabled", async () => {
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "matrix",
        pluginId: "matrix",
        meta: { label: "Matrix" },
        install: {
          npmSpec: "@oriro/plugin-matrix@1.2.3",
        },
      },
    ]);

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        plugins: {
          entries: {
            matrix: { enabled: false },
          },
        },
        channels: {
          matrix: { homeserver: "https://matrix.example.org" },
        },
      },
      env: {},
    });

    expect(mocks.installPluginFromOriroHub).not.toHaveBeenCalled();
    expect(mocks.installPluginFromNpmSpec).not.toHaveBeenCalled();
    expect(mocks.writePersistedInstalledPluginIndexInstallRecords).not.toHaveBeenCalled();
    expect(result).toEqual({ changes: [], warnings: [], records: {} });
  });

  it("does not download configured channel plugins that are still bundled", async () => {
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "matrix",
        pluginId: "matrix",
        origin: "bundled",
        meta: { label: "Matrix" },
        install: {
          npmSpec: "@oriro/matrix",
        },
      },
    ]);
    mocks.loadPluginMetadataSnapshot.mockReturnValue({
      plugins: [
        {
          id: "matrix",
          origin: "bundled",
          packageName: "@oriro/matrix",
          channels: ["matrix"],
        },
      ],
      diagnostics: [],
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        plugins: {
          entries: {
            matrix: { enabled: true },
          },
        },
        channels: {
          matrix: { enabled: true, homeserver: "https://matrix.example.org" },
        },
      },
      env: {},
    });

    expect(mocks.updateNpmInstalledPlugins).not.toHaveBeenCalled();
    expect(mocks.installPluginFromOriroHub).not.toHaveBeenCalled();
    expect(mocks.installPluginFromNpmSpec).not.toHaveBeenCalled();
    expect(mocks.writePersistedInstalledPluginIndexInstallRecords).not.toHaveBeenCalled();
    expect(result).toEqual({ changes: [], warnings: [], records: {} });
  });

  it("removes stale managed install records when the configured plugin is bundled", async () => {
    const records = {
      matrix: {
        source: "npm",
        spec: "@oriro/matrix",
        installPath: "/missing/matrix",
      },
    };
    mocks.loadInstalledPluginIndexInstallRecords.mockResolvedValue(records);
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "matrix",
        pluginId: "matrix",
        origin: "bundled",
        meta: { label: "Matrix" },
        install: {
          npmSpec: "@oriro/matrix",
        },
      },
    ]);
    mocks.loadPluginMetadataSnapshot.mockReturnValue({
      plugins: [
        {
          id: "matrix",
          origin: "bundled",
          packageName: "@oriro/matrix",
          channels: ["matrix"],
        },
      ],
      diagnostics: [
        {
          pluginId: "matrix",
          message: "manifest without channelConfigs metadata",
        },
      ],
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        plugins: {
          entries: {
            matrix: { enabled: true },
          },
        },
        channels: {
          matrix: { enabled: true, homeserver: "https://matrix.example.org" },
        },
      },
      env: {},
    });

    expect(mocks.updateNpmInstalledPlugins).not.toHaveBeenCalled();
    expect(mocks.installPluginFromOriroHub).not.toHaveBeenCalled();
    expect(mocks.installPluginFromNpmSpec).not.toHaveBeenCalled();
    expect(mocks.writePersistedInstalledPluginIndexInstallRecords).toHaveBeenCalledWith(
      {},
      {
        env: {},
      },
    );
    expect(result).toEqual({
      changes: ['Removed stale managed install record for bundled plugin "matrix".'],
      warnings: [],
      records: {},
    });
  });

  it("uses current bundled discovery to remove records before stale snapshots can reinstall official plugins", async () => {
    const records = {
      "google-meet": {
        source: "npm",
        spec: "@oriro/google-meet",
        resolvedName: "@oriro/google-meet",
        installPath: "/missing/google-meet",
      },
    };
    mocks.loadInstalledPluginIndexInstallRecords.mockResolvedValue(records);
    mocks.loadPluginMetadataSnapshot.mockReturnValue({
      plugins: [
        {
          id: "google-meet",
          origin: "npm",
          packageName: "@oriro/google-meet",
        },
      ],
      diagnostics: [],
    });
    mocks.loadInstalledPluginIndex.mockReturnValue({
      plugins: [
        {
          pluginId: "google-meet",
          origin: "bundled",
          packageName: "@oriro/google-meet",
        },
      ],
      diagnostics: [],
      installRecords: {},
    });
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue([
      {
        id: "google-meet",
        label: "Google Meet",
        install: { npmSpec: "@oriro/google-meet" },
        oriro: {
          id: "google-meet",
          install: { npmSpec: "@oriro/google-meet" },
        },
      },
    ]);

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        plugins: {
          entries: {
            "google-meet": { enabled: true },
          },
        },
      },
      env: {},
    });

    expect(mocks.installPluginFromNpmSpec).not.toHaveBeenCalled();
    expect(mocks.writePersistedInstalledPluginIndexInstallRecords).toHaveBeenCalledWith(
      {},
      {
        env: {},
      },
    );
    expect(result).toEqual({
      changes: ['Removed stale managed install record for bundled plugin "google-meet".'],
      warnings: [],
      records: {},
    });
  });

  it("removes stale bundled install records even when the plugin is not configured", async () => {
    const records = {
      "google-meet": {
        source: "npm",
        spec: "@oriro/google-meet",
        resolvedName: "@oriro/google-meet",
        installPath: "/missing/google-meet",
      },
    };
    mocks.loadInstalledPluginIndexInstallRecords.mockResolvedValue(records);
    mocks.loadPluginMetadataSnapshot.mockReturnValue({
      plugins: [],
      diagnostics: [],
    });
    mocks.loadInstalledPluginIndex.mockReturnValue({
      plugins: [
        {
          pluginId: "google-meet",
          origin: "bundled",
          packageName: "@oriro/google-meet",
        },
      ],
      diagnostics: [],
      installRecords: {},
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {},
      env: {},
    });

    expect(mocks.installPluginFromNpmSpec).not.toHaveBeenCalled();
    expect(mocks.writePersistedInstalledPluginIndexInstallRecords).toHaveBeenCalledWith(
      {},
      {
        env: {},
      },
    );
    expect(result).toEqual({
      changes: ['Removed stale managed install record for bundled plugin "google-meet".'],
      warnings: [],
      records: {},
    });
  });

  it.each([
    [
      "npm",
      {
        source: "npm",
        spec: "@oriro/matrix-fork",
        resolvedName: "@oriro/matrix-fork",
        resolvedSpec: "@oriro/matrix-fork@1.2.3",
        installPath: "/missing/matrix-fork",
      },
    ],
    [
      "orirohub",
      {
        source: "orirohub",
        spec: "orirohub:@oriro/matrix-fork@stable",
        orirohubPackage: "@oriro/matrix-fork",
        installPath: "/missing/matrix-fork",
      },
    ],
  ])(
    "keeps %s install records whose package names only share a bundled prefix",
    async (_, record) => {
      const records = { matrix: record };
      mocks.loadInstalledPluginIndexInstallRecords.mockResolvedValue(records);
      mocks.listChannelPluginCatalogEntries.mockReturnValue([
        {
          id: "matrix",
          pluginId: "matrix",
          origin: "bundled",
          meta: { label: "Matrix" },
          install: {
            npmSpec: "@oriro/matrix",
          },
        },
      ]);
      mocks.loadPluginMetadataSnapshot.mockReturnValue({
        plugins: [
          {
            id: "matrix",
            origin: "bundled",
            packageName: "@oriro/matrix",
            channels: ["matrix"],
          },
        ],
        diagnostics: [
          {
            pluginId: "matrix",
            message: "manifest without channelConfigs metadata",
          },
        ],
      });

      const { repairMissingConfiguredPluginInstalls } =
        await import("./missing-configured-plugin-install.js");
      const result = await repairMissingConfiguredPluginInstalls({
        cfg: {
          plugins: {
            entries: {
              matrix: { enabled: true },
            },
          },
          channels: {
            matrix: { enabled: true, homeserver: "https://matrix.example.org" },
          },
        },
        env: {},
      });

      expect(mocks.updateNpmInstalledPlugins).not.toHaveBeenCalled();
      expect(mocks.installPluginFromOriroHub).not.toHaveBeenCalled();
      expect(mocks.installPluginFromNpmSpec).not.toHaveBeenCalled();
      expect(mocks.writePersistedInstalledPluginIndexInstallRecords).not.toHaveBeenCalled();
      expect(result).toEqual({ changes: [], warnings: [], records });
    },
  );

  it("defers missing external payload repair during the package update doctor pass", async () => {
    const records = {
      discord: {
        source: "npm",
        spec: "@oriro/discord",
        installPath: "/missing/discord",
      },
    };
    mocks.loadInstalledPluginIndexInstallRecords.mockResolvedValue(records);
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "discord",
        pluginId: "discord",
        meta: { label: "Discord" },
        install: {
          npmSpec: "@oriro/discord",
        },
      },
    ]);

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        plugins: {
          entries: {
            discord: { enabled: true },
          },
        },
        channels: {
          discord: { enabled: true },
        },
      },
      env: {
        ORIRO_UPDATE_IN_PROGRESS: "1",
        ORIRO_UPDATE_DEFER_CONFIGURED_PLUGIN_INSTALL_REPAIR: "1",
      },
    });

    expect(mocks.updateNpmInstalledPlugins).not.toHaveBeenCalled();
    expect(mocks.installPluginFromOriroHub).not.toHaveBeenCalled();
    expect(mocks.installPluginFromNpmSpec).not.toHaveBeenCalled();
    expect(mocks.writePersistedInstalledPluginIndexInstallRecords).not.toHaveBeenCalled();
    expect(result).toEqual({
      changes: [
        'Skipped package-manager repair for configured plugin "discord" during package update; rerun "oriro doctor --fix" after the update completes.',
      ],
      warnings: [],
      deferredRepairDetails: [
        'Skipped package-manager repair for configured plugin "discord" during package update; rerun "oriro doctor --fix" after the update completes.',
      ],
      records,
    });
  });

  it("updates an existing npm target when stale baseline records miss an installed package", async () => {
    const npmRoot = makeTempDir();
    const packageDir = path.join(npmRoot, "node_modules", "@oriro", "discord");
    fs.mkdirSync(packageDir, { recursive: true });
    mocks.resolveDefaultPluginNpmDir.mockReturnValue(npmRoot);
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "discord",
        pluginId: "discord",
        meta: { label: "Discord" },
        install: {
          npmSpec: "@oriro/discord",
        },
      },
    ]);
    mocks.installPluginFromNpmSpec.mockResolvedValue({
      ok: true,
      pluginId: "discord",
      targetDir: packageDir,
      version: "1.2.3",
      npmResolution: {
        name: "@oriro/discord",
        version: "1.2.3",
        resolvedSpec: "@oriro/discord@1.2.3",
        integrity: "sha512-discord",
        resolvedAt: "2026-05-01T00:00:00.000Z",
      },
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        plugins: {
          entries: {
            discord: { enabled: true },
          },
        },
        channels: {
          discord: { enabled: true },
        },
      },
      env: {
        ORIRO_UPDATE_POST_CORE_CONVERGENCE: "1",
      },
    });

    expect(mocks.installPluginFromOriroHub).not.toHaveBeenCalled();
    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec), {
      spec: expectedNpmInstallSpec("@oriro/discord"),
      expectedPluginId: "discord",
      npmDir: npmRoot,
      mode: "update",
    });
    expect(result.changes).toEqual([
      `Installed missing configured plugin "discord" from ${expectedNpmInstallSpec("@oriro/discord")}.`,
    ]);
    expect(result.warnings).toEqual([]);
    expect(result.records.discord?.installPath).toBe(packageDir);
  });

  it("retries npm repair as an update when the install target appears stale", async () => {
    const npmRoot = makeTempDir();
    const packageDir = path.join(npmRoot, "node_modules", "@oriro", "discord");
    mocks.resolveDefaultPluginNpmDir.mockReturnValue(npmRoot);
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "discord",
        pluginId: "discord",
        meta: { label: "Discord" },
        install: {
          npmSpec: "@oriro/discord",
        },
      },
    ]);
    mocks.installPluginFromNpmSpec
      .mockResolvedValueOnce({
        ok: false,
        error: `plugin already exists: ${packageDir} (delete it first)`,
      })
      .mockResolvedValueOnce({
        ok: true,
        pluginId: "discord",
        targetDir: packageDir,
        version: "1.2.3",
        npmResolution: {
          name: "@oriro/discord",
          version: "1.2.3",
          resolvedSpec: "@oriro/discord@1.2.3",
          integrity: "sha512-discord",
          resolvedAt: "2026-05-01T00:00:00.000Z",
        },
      });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        plugins: {
          entries: {
            discord: { enabled: true },
          },
        },
      },
      env: {
        ORIRO_UPDATE_POST_CORE_CONVERGENCE: "1",
      },
    });

    expect(mocks.installPluginFromNpmSpec).toHaveBeenCalledTimes(2);
    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec, 0), {
      spec: expectedNpmInstallSpec("@oriro/discord"),
      npmDir: npmRoot,
      mode: "install",
    });
    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec, 1), {
      spec: expectedNpmInstallSpec("@oriro/discord"),
      npmDir: npmRoot,
      mode: "update",
    });
    expect(result.warnings).toEqual([]);
    expect(result.records.discord?.installPath).toBe(packageDir);
  });

  it("prefers an existing npm payload over OriroHub during post-core repair", async () => {
    const npmRoot = makeTempDir();
    const packageDir = path.join(npmRoot, "node_modules", "@oriro", "matrix");
    fs.mkdirSync(packageDir, { recursive: true });
    fs.writeFileSync(
      path.join(packageDir, "package.json"),
      JSON.stringify({ name: "@oriro/matrix", version: "1.2.3" }),
    );
    mocks.resolveDefaultPluginNpmDir.mockReturnValue(npmRoot);
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "matrix",
        pluginId: "matrix",
        meta: { label: "Matrix" },
        install: {
          orirohubSpec: "orirohub:@oriro/matrix",
          npmSpec: "@oriro/matrix",
        },
      },
    ]);
    mocks.installPluginFromOriroHub.mockResolvedValue({
      ok: false,
      error: 'Plugin "@oriro/matrix" requires plugin API >=2026.5.18.',
    });
    mocks.installPluginFromNpmSpec.mockResolvedValue({
      ok: true,
      pluginId: "matrix",
      targetDir: packageDir,
      version: "1.2.3",
      npmResolution: {
        name: "@oriro/matrix",
        version: "1.2.3",
        resolvedSpec: "@oriro/matrix@1.2.3",
        integrity: "sha512-matrix",
        resolvedAt: "2026-05-01T00:00:00.000Z",
      },
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        plugins: {
          entries: {
            matrix: { enabled: true },
          },
        },
        channels: {
          matrix: { enabled: true },
        },
      },
      env: {
        ORIRO_UPDATE_POST_CORE_CONVERGENCE: "1",
      },
    });

    expect(mocks.installPluginFromOriroHub).not.toHaveBeenCalled();
    expect(mocks.installPluginFromNpmSpec).not.toHaveBeenCalled();
    expect(result.warnings).toEqual([]);
    expectRecordFields(result.records.matrix, {
      source: "npm",
      spec: "@oriro/matrix",
      installPath: packageDir,
      version: "1.2.3",
      resolvedName: "@oriro/matrix",
      resolvedVersion: "1.2.3",
      resolvedSpec: "@oriro/matrix@1.2.3",
    });
  });

  it("passes the post-core compatibility host version to OriroHub repair", async () => {
    const npmRoot = makeTempDir();
    mocks.resolveDefaultPluginNpmDir.mockReturnValue(npmRoot);
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "whatsapp",
        pluginId: "whatsapp",
        meta: { label: "WhatsApp" },
        install: {
          orirohubSpec: "orirohub:@oriro/whatsapp",
          npmSpec: "@oriro/whatsapp",
        },
      },
    ]);
    mocks.installPluginFromOriroHub.mockResolvedValue({
      ok: true,
      pluginId: "whatsapp",
      targetDir: "/tmp/oriro-plugins/whatsapp",
      version: "1.2.3",
      orirohub: {
        source: "orirohub",
        orirohubUrl: "https://orirohub.ai",
        orirohubPackage: "@oriro/whatsapp",
        orirohubFamily: "code-plugin",
        orirohubChannel: "official",
        version: "1.2.3",
        integrity: "sha256-whatsapp",
        resolvedAt: "2026-05-01T00:00:00.000Z",
        oriropackSha256: "2".repeat(64),
        oriropackSpecVersion: 1,
        oriropackManifestSha256: "3".repeat(64),
        oriropackSize: 1234,
      },
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        plugins: {
          entries: {
            whatsapp: { enabled: true },
          },
        },
        channels: {
          whatsapp: { enabled: true },
        },
      },
      env: {
        ORIRO_COMPATIBILITY_HOST_VERSION: "2026.5.19",
        ORIRO_UPDATE_POST_CORE_CONVERGENCE: "1",
      },
    });

    expectRecordFields(mockCallArg(mocks.installPluginFromOriroHub), {
      spec: expectedOriroHubInstallSpec("orirohub:@oriro/whatsapp"),
      env: {
        ORIRO_COMPATIBILITY_HOST_VERSION: "2026.5.19",
        ORIRO_UPDATE_POST_CORE_CONVERGENCE: "1",
      },
      mode: "install",
    });
    expect(mocks.installPluginFromNpmSpec).not.toHaveBeenCalled();
    expect(result.warnings).toEqual([]);
    expectRecordFields(result.records.whatsapp, {
      source: "orirohub",
      spec: "orirohub:@oriro/whatsapp",
      installPath: "/tmp/oriro-plugins/whatsapp",
      orirohubPackage: "@oriro/whatsapp",
    });
  });

  it("repairs missing external payload during post-core convergence even with ORIRO_UPDATE_IN_PROGRESS=1", async () => {
    const records = {
      discord: {
        source: "npm",
        spec: "@oriro/discord",
        installPath: "/missing/discord",
      },
    };
    mocks.loadInstalledPluginIndexInstallRecords.mockResolvedValue(records);
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "discord",
        pluginId: "discord",
        meta: { label: "Discord" },
        install: { npmSpec: "@oriro/discord" },
      },
    ]);
    mocks.updateNpmInstalledPlugins.mockResolvedValue({
      config: {
        plugins: {
          installs: { discord: { source: "npm", installPath: "/repaired/discord" } },
        },
      },
      changed: true,
      outcomes: [{ pluginId: "discord", status: "updated", message: "ok" }],
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        plugins: {
          entries: { discord: { enabled: true } },
        },
        channels: {
          discord: { enabled: true },
        },
      },
      env: {
        ORIRO_UPDATE_IN_PROGRESS: "1",
        ORIRO_UPDATE_POST_CORE_CONVERGENCE: "1",
      },
    });

    expect(mocks.updateNpmInstalledPlugins).toHaveBeenCalledTimes(1);
    expect(result.warnings).toEqual([]);
    expect(result.changes[0]).toBe('Repaired missing configured plugin "discord".');
    expectRecordFields(result.records.discord, {
      source: "npm",
      installPath: "/repaired/discord",
    });
  });

  it("defers channel-selected external payload repair during the package update doctor pass", async () => {
    const records = {
      discord: {
        source: "npm",
        spec: "@oriro/discord",
        installPath: "/missing/discord",
      },
    };
    mocks.loadInstalledPluginIndexInstallRecords.mockResolvedValue(records);
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "discord",
        pluginId: "discord",
        meta: { label: "Discord" },
        install: {
          npmSpec: "@oriro/discord",
        },
      },
    ]);

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        channels: {
          discord: { enabled: true, token: "secret" },
        },
      },
      env: {
        ORIRO_UPDATE_IN_PROGRESS: "1",
        ORIRO_UPDATE_DEFER_CONFIGURED_PLUGIN_INSTALL_REPAIR: "1",
      },
    });

    expect(mocks.updateNpmInstalledPlugins).not.toHaveBeenCalled();
    expect(mocks.installPluginFromOriroHub).not.toHaveBeenCalled();
    expect(mocks.installPluginFromNpmSpec).not.toHaveBeenCalled();
    expect(mocks.writePersistedInstalledPluginIndexInstallRecords).not.toHaveBeenCalled();
    expect(result).toEqual({
      changes: [
        'Skipped package-manager repair for configured plugin "discord" during package update; rerun "oriro doctor --fix" after the update completes.',
      ],
      warnings: [],
      deferredRepairDetails: [
        'Skipped package-manager repair for configured plugin "discord" during package update; rerun "oriro doctor --fix" after the update completes.',
      ],
      records,
    });
  });

  it("does not install channel-selected external plugins during an opted-in package update doctor pass", async () => {
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "discord",
        pluginId: "discord",
        meta: { label: "Discord" },
        install: {
          npmSpec: "@oriro/discord",
        },
      },
    ]);

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        channels: {
          discord: { enabled: true, token: "secret" },
        },
      },
      env: {
        ORIRO_UPDATE_IN_PROGRESS: "1",
        ORIRO_UPDATE_DEFER_CONFIGURED_PLUGIN_INSTALL_REPAIR: "1",
      },
    });

    expect(mocks.updateNpmInstalledPlugins).not.toHaveBeenCalled();
    expect(mocks.installPluginFromOriroHub).not.toHaveBeenCalled();
    expect(mocks.installPluginFromNpmSpec).not.toHaveBeenCalled();
    expect(mocks.writePersistedInstalledPluginIndexInstallRecords).not.toHaveBeenCalled();
    expect(result).toEqual({ changes: [], warnings: [], records: {} });
  });

  it("installs channel-selected external plugins during a legacy package update doctor pass", async () => {
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: true,
      pluginId: "discord",
      targetDir: "/tmp/oriro-plugins/discord",
      version: "2026.5.17",
      npmResolution: {
        name: "@oriro/discord",
        version: "2026.5.17",
        resolvedSpec: "@oriro/discord@2026.5.17",
        integrity: "sha512-discord",
        resolvedAt: "2026-05-17T00:00:00.000Z",
      },
    });
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "discord",
        pluginId: "discord",
        meta: { label: "Discord" },
        install: {
          npmSpec: "@oriro/discord",
        },
      },
    ]);

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        channels: {
          discord: { enabled: true, token: "secret" },
        },
      },
      env: {
        ORIRO_UPDATE_IN_PROGRESS: "1",
      },
    });

    expect(mocks.installPluginFromNpmSpec).toHaveBeenCalledTimes(1);
    expect(result.changes).toEqual([
      `Installed missing configured plugin "discord" from ${expectedNpmInstallSpec("@oriro/discord")}.`,
    ]);
    expectRecordFields(result.records.discord, {
      source: "npm",
      installPath: "/tmp/oriro-plugins/discord",
    });
  });

  it("prefers npm over OriroHub during a legacy package update doctor pass", async () => {
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: true,
      pluginId: "whatsapp",
      targetDir: "/tmp/oriro-plugins/whatsapp",
      version: "2026.5.17",
      npmResolution: {
        name: "@oriro/whatsapp",
        version: "2026.5.17",
        resolvedSpec: "@oriro/whatsapp@2026.5.17",
        integrity: "sha512-whatsapp",
        resolvedAt: "2026-05-17T00:00:00.000Z",
      },
    });
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "whatsapp",
        pluginId: "whatsapp",
        meta: { label: "WhatsApp" },
        install: {
          orirohubSpec: "orirohub:@oriro/whatsapp",
          npmSpec: "@oriro/whatsapp",
          defaultChoice: "orirohub",
        },
      },
    ]);

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        channels: {
          whatsapp: { enabled: true, allowFrom: ["+15555550123"] },
        },
      },
      env: {
        ORIRO_UPDATE_IN_PROGRESS: "1",
      },
    });

    expect(mocks.installPluginFromOriroHub).not.toHaveBeenCalled();
    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec), {
      spec: expectedNpmInstallSpec("@oriro/whatsapp"),
      expectedPluginId: "whatsapp",
    });
    expect(result.changes).toEqual([
      `Installed missing configured plugin "whatsapp" from ${expectedNpmInstallSpec("@oriro/whatsapp")}.`,
    ]);
    expectRecordFields(result.records.whatsapp, {
      source: "npm",
      installPath: "/tmp/oriro-plugins/whatsapp",
    });
  });

  it("keeps OriroHub-only candidates available during a legacy package update doctor pass", async () => {
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "matrix",
        pluginId: "matrix",
        meta: { label: "Matrix" },
        install: {
          orirohubSpec: "orirohub:@oriro/plugin-matrix@stable",
          defaultChoice: "orirohub",
        },
      },
    ]);

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        channels: {
          matrix: { enabled: true, homeserver: "https://matrix.example.org" },
        },
      },
      env: {
        ORIRO_UPDATE_IN_PROGRESS: "1",
      },
    });

    expectRecordFields(mockCallArg(mocks.installPluginFromOriroHub), {
      spec: "orirohub:@oriro/plugin-matrix@stable",
      expectedPluginId: "matrix",
    });
    expect(mocks.installPluginFromNpmSpec).not.toHaveBeenCalled();
    expect(result.changes).toEqual([
      'Installed missing configured plugin "matrix" from orirohub:@oriro/plugin-matrix@stable.',
    ]);
  });

  it("does not install configured plugins when plugins are globally disabled", async () => {
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "matrix",
        pluginId: "matrix",
        meta: { label: "Matrix" },
        install: {
          npmSpec: "@oriro/plugin-matrix@1.2.3",
        },
      },
    ]);
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue([
      {
        id: "codex",
        label: "Codex",
        install: {
          npmSpec: "@oriro/codex",
          defaultChoice: "npm",
        },
      },
      {
        id: "diagnostics-otel",
        label: "Diagnostics OpenTelemetry",
        install: {
          npmSpec: "@oriro/diagnostics-otel",
          defaultChoice: "npm",
        },
      },
    ]);

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        plugins: {
          enabled: false,
          entries: {
            "diagnostics-otel": { enabled: true },
          },
        },
        channels: {
          matrix: { homeserver: "https://matrix.example.org" },
        },
        agents: {
          defaults: {
            agentRuntime: { id: "codex" },
          },
        },
      },
      env: {},
    });

    expect(mocks.installPluginFromOriroHub).not.toHaveBeenCalled();
    expect(mocks.installPluginFromNpmSpec).not.toHaveBeenCalled();
    expect(mocks.writePersistedInstalledPluginIndexInstallRecords).not.toHaveBeenCalled();
    expect(result).toEqual({ changes: [], warnings: [], records: {} });
  });

  it("does not install plugins merely listed in plugins.allow", async () => {
    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        plugins: {
          allow: ["codex"],
        },
      },
      env: {},
    });

    expect(mocks.installPluginFromNpmSpec).not.toHaveBeenCalled();
    expect(mocks.writePersistedInstalledPluginIndexInstallRecords).not.toHaveBeenCalled();
    expect(result).toEqual({ changes: [], warnings: [], records: {} });
  });

  it("installs a missing third-party downloadable plugin from npm only", async () => {
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: true,
      pluginId: "wecom",
      targetDir: "/tmp/oriro-plugins/wecom",
      version: "2026.4.23",
      npmResolution: {
        name: "@wecom/wecom-oriro-plugin",
        version: "2026.4.23",
        resolvedSpec: "@wecom/wecom-oriro-plugin@2026.4.23",
        integrity: "sha512-third-party",
        resolvedAt: "2026-05-01T00:00:00.000Z",
      },
    });
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "wecom",
        pluginId: "wecom",
        meta: { label: "WeCom" },
        install: {
          npmSpec: "@wecom/wecom-oriro-plugin@2026.4.23",
        },
      },
    ]);

    const { repairMissingPluginInstallsForIds } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingPluginInstallsForIds({
      cfg: {},
      pluginIds: [],
      channelIds: ["wecom"],
      env: {},
    });

    expect(mocks.installPluginFromOriroHub).not.toHaveBeenCalled();
    const installArg = mockCallArg(mocks.installPluginFromNpmSpec);
    expectRecordFields(installArg, {
      spec: "@wecom/wecom-oriro-plugin@2026.4.23",
      expectedPluginId: "wecom",
    });
    expect(installArg).not.toHaveProperty("trustedSourceLinkedOfficialInstall", true);
    expect(result.changes).toEqual([
      'Installed missing configured plugin "wecom" from @wecom/wecom-oriro-plugin@2026.4.23.',
    ]);
  });

  it("installs a missing default Codex runtime plugin from the official external catalog", async () => {
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: true,
      pluginId: "codex",
      targetDir: "/tmp/oriro-plugins/codex",
      version: "2026.5.2",
      npmResolution: {
        name: "@oriro/codex",
        version: "2026.5.2",
        resolvedSpec: "@oriro/codex@2026.5.2",
        integrity: "sha512-codex",
        resolvedAt: "2026-05-01T00:00:00.000Z",
      },
    });
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue([
      {
        id: "codex",
        label: "Codex",
        install: {
          npmSpec: "@oriro/codex",
          defaultChoice: "npm",
        },
      },
    ]);

    const { repairMissingPluginInstallsForIds } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingPluginInstallsForIds({
      cfg: {
        agents: {
          defaults: {
            model: "openai/gpt-5.4",
            agentRuntime: { id: "codex" },
          },
        },
      },
      pluginIds: ["codex"],
      env: {},
    });

    expect(mocks.resolveProviderInstallCatalogEntries).toHaveBeenCalled();
    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec), {
      spec: expectedNpmInstallSpec("@oriro/codex"),
      expectedPluginId: "codex",
      trustedSourceLinkedOfficialInstall: true,
    });
    const records = mockCallArg(mocks.writePersistedInstalledPluginIndexInstallRecords);
    expectRecordFields((records as Record<string, unknown>).codex, {
      source: "npm",
      spec: "@oriro/codex@2026.5.2",
      installPath: "/tmp/oriro-plugins/codex",
      version: "2026.5.2",
    });
    expect(mockCallArg(mocks.writePersistedInstalledPluginIndexInstallRecords, 0, 1)).toEqual({
      env: {},
    });
    expect(result.changes).toEqual([
      `Installed missing configured plugin "codex" from ${expectedNpmInstallSpec("@oriro/codex")}.`,
    ]);
    expect(result.warnings).toStrictEqual([]);
  });

  it("refreshes a stale managed Codex runtime plugin selected by the OpenAI Codex route", async () => {
    const installDir = makeTempDir();
    fs.writeFileSync(
      path.join(installDir, "package.json"),
      JSON.stringify({ name: "@oriro/codex", version: "2026.5.6" }),
    );
    const records = {
      codex: {
        source: "npm",
        spec: "@oriro/codex",
        resolvedName: "@oriro/codex",
        resolvedSpec: "@oriro/codex@2026.5.6",
        resolvedVersion: "2026.5.6",
        version: "2026.5.6",
        integrity: "sha512-old-codex",
        installPath: installDir,
      },
    };
    mocks.loadInstalledPluginIndexInstallRecords.mockResolvedValue(records);
    mocks.loadPluginMetadataSnapshot.mockReturnValue({
      plugins: [
        {
          id: "codex",
          packageVersion: "2026.5.6",
          providers: ["codex"],
        },
      ],
      diagnostics: [],
      byPluginId: new Map([
        [
          "codex",
          {
            id: "codex",
            packageVersion: "2026.5.6",
            providers: ["codex"],
          },
        ],
      ]),
    });
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: true,
      pluginId: "codex",
      targetDir: "/tmp/oriro-plugins/codex",
      version: VERSION,
      npmResolution: {
        name: "@oriro/codex",
        version: VERSION,
        resolvedSpec: `@oriro/codex@${VERSION}`,
        integrity: "sha512-new-codex",
        resolvedAt: "2026-05-01T00:00:00.000Z",
      },
    });
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue([
      {
        id: "codex",
        label: "Codex",
        install: {
          npmSpec: "@oriro/codex",
          defaultChoice: "npm",
        },
      },
    ]);

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        agents: {
          defaults: {
            model: "openai/gpt-5.5",
          },
        },
      },
      env: {},
    });

    expect(mocks.updateNpmInstalledPlugins).not.toHaveBeenCalled();
    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec), {
      spec: expectedNpmInstallSpec("@oriro/codex"),
      expectedPluginId: "codex",
      trustedSourceLinkedOfficialInstall: true,
      mode: "update",
    });
    expect(result.changes).toEqual([
      `Refreshed stale configured plugin "codex" from ${expectedNpmInstallSpec("@oriro/codex")}.`,
    ]);
    expectRecordFields(result.records.codex, {
      source: "npm",
      spec: `@oriro/codex@${VERSION}`,
      installPath: "/tmp/oriro-plugins/codex",
      version: VERSION,
      resolvedName: "@oriro/codex",
      resolvedVersion: VERSION,
      resolvedSpec: `@oriro/codex@${VERSION}`,
    });
  });

  it("does not refresh a converged beta Codex runtime plugin on the second doctor pass", async () => {
    const codexBetaVersion = `${currentOriroReleaseBase()}-beta.4`;
    const installDir = makeTempDir();
    fs.writeFileSync(
      path.join(installDir, "package.json"),
      JSON.stringify({ name: "@oriro/codex", version: "2026.5.6" }),
    );
    const records = {
      codex: {
        source: "npm",
        spec: "@oriro/codex",
        resolvedName: "@oriro/codex",
        resolvedSpec: "@oriro/codex@2026.5.6",
        resolvedVersion: "2026.5.6",
        version: "2026.5.6",
        integrity: "sha512-old-codex",
        installPath: installDir,
      },
    };
    mocks.loadInstalledPluginIndexInstallRecords.mockResolvedValue(records);
    mocks.loadPluginMetadataSnapshot.mockReturnValue({
      plugins: [
        {
          id: "codex",
          packageVersion: "2026.5.6",
          providers: ["codex"],
        },
      ],
      diagnostics: [],
      byPluginId: new Map([
        [
          "codex",
          {
            id: "codex",
            packageVersion: "2026.5.6",
            providers: ["codex"],
          },
        ],
      ]),
    });
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: true,
      pluginId: "codex",
      targetDir: installDir,
      version: codexBetaVersion,
      npmResolution: {
        name: "@oriro/codex",
        version: codexBetaVersion,
        resolvedSpec: `@oriro/codex@${codexBetaVersion}`,
        integrity: "sha512-new-codex-beta",
        resolvedAt: "2026-05-01T00:00:00.000Z",
      },
    });
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue([
      {
        id: "codex",
        label: "Codex",
        install: {
          npmSpec: "@oriro/codex",
          defaultChoice: "npm",
        },
      },
    ]);

    const cfg = {
      update: { channel: "beta" as const },
      agents: {
        defaults: {
          model: "openai/gpt-5.5",
        },
      },
    };
    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const firstPass = await repairMissingConfiguredPluginInstalls({
      cfg,
      env: {},
    });

    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec), {
      spec: "@oriro/codex@beta",
      expectedPluginId: "codex",
      trustedSourceLinkedOfficialInstall: true,
      mode: "update",
    });
    expect(firstPass.changes).toEqual([
      'Refreshed stale configured plugin "codex" from @oriro/codex@beta.',
    ]);
    expectRecordFields(firstPass.records.codex, {
      source: "npm",
      spec: `@oriro/codex@${codexBetaVersion}`,
      installPath: installDir,
      version: codexBetaVersion,
      resolvedName: "@oriro/codex",
      resolvedVersion: codexBetaVersion,
      resolvedSpec: `@oriro/codex@${codexBetaVersion}`,
    });

    mocks.installPluginFromNpmSpec.mockClear();
    mocks.writePersistedInstalledPluginIndexInstallRecords.mockClear();
    mocks.loadInstalledPluginIndexInstallRecords.mockResolvedValueOnce(firstPass.records);
    mocks.loadPluginMetadataSnapshot.mockReturnValue({
      plugins: [
        {
          id: "codex",
          packageVersion: codexBetaVersion,
          providers: ["codex"],
        },
      ],
      diagnostics: [],
      byPluginId: new Map([
        [
          "codex",
          {
            id: "codex",
            packageVersion: codexBetaVersion,
            providers: ["codex"],
          },
        ],
      ]),
    });

    const secondPass = await repairMissingConfiguredPluginInstalls({
      cfg,
      env: {},
    });

    expect(mocks.installPluginFromNpmSpec).not.toHaveBeenCalled();
    expect(mocks.writePersistedInstalledPluginIndexInstallRecords).not.toHaveBeenCalled();
    expect(secondPass).toEqual({ changes: [], warnings: [], records: firstPass.records });
  });

  it("does not downgrade a newer managed Codex runtime plugin", async () => {
    const installDir = makeTempDir();
    fs.writeFileSync(
      path.join(installDir, "package.json"),
      JSON.stringify({ name: "@oriro/codex", version: "9999.1.1" }),
    );
    const records = {
      codex: {
        source: "npm",
        spec: "@oriro/codex",
        resolvedName: "@oriro/codex",
        resolvedSpec: "@oriro/codex@9999.1.1",
        resolvedVersion: "9999.1.1",
        version: "9999.1.1",
        integrity: "sha512-newer-codex",
        installPath: installDir,
      },
    };
    mocks.loadInstalledPluginIndexInstallRecords.mockResolvedValue(records);
    mocks.loadPluginMetadataSnapshot.mockReturnValue({
      plugins: [
        {
          id: "codex",
          packageVersion: "9999.1.1",
          providers: ["codex", "openai-codex", "openai"],
        },
      ],
      diagnostics: [],
      byPluginId: new Map([
        [
          "codex",
          {
            id: "codex",
            packageVersion: "9999.1.1",
            providers: ["codex", "openai-codex", "openai"],
          },
        ],
      ]),
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        agents: {
          defaults: {
            model: "openai/gpt-5.5",
          },
        },
      },
      env: {},
    });

    expect(mocks.installPluginFromNpmSpec).not.toHaveBeenCalled();
    expect(mocks.writePersistedInstalledPluginIndexInstallRecords).not.toHaveBeenCalled();
    expect(result).toEqual({ changes: [], warnings: [], records });
  });

  it.each([
    [
      "default OpenAI model route",
      {
        agents: {
          defaults: {
            model: "openai/gpt-5.5",
          },
        },
      },
      {},
    ],
    [
      "provider runtime policy",
      {
        models: {
          providers: {
            openai: {
              baseUrl: "https://api.openai.com/v1",
              agentRuntime: { id: "codex" },
              models: [],
            },
          },
        },
      },
      {},
    ],
    [
      "default model runtime policy",
      {
        agents: {
          defaults: {
            models: {
              "openai/gpt-5.5": { agentRuntime: { id: "codex" } },
            },
          },
        },
      },
      {},
    ],
    [
      "default selectable OpenAI agent model",
      {
        agents: {
          defaults: {
            model: { primary: "anthropic/claude-sonnet-4-6" },
            models: {
              "openai/gpt-5.5": {},
            },
          },
        },
      },
      {},
    ],
    [
      "agent model runtime policy",
      {
        agents: {
          list: [
            {
              id: "main",
              model: "anthropic/claude-opus-4-7",
              models: {
                "anthropic/claude-opus-4-7": { agentRuntime: { id: "codex" } },
              },
            },
          ],
        },
      },
      {},
    ],
  ])("repairs a missing Codex plugin selected by %s", async (_label, cfg, env) => {
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: true,
      pluginId: "codex",
      targetDir: "/tmp/oriro-plugins/codex",
      version: "2026.5.2",
      npmResolution: {
        name: "@oriro/codex",
        version: "2026.5.2",
        resolvedSpec: "@oriro/codex@2026.5.2",
        integrity: "sha512-codex",
        resolvedAt: "2026-05-01T00:00:00.000Z",
      },
    });
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue([
      {
        id: "codex",
        label: "Codex",
        install: {
          npmSpec: "@oriro/codex",
          defaultChoice: "npm",
        },
      },
    ]);

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg,
      env,
    });

    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec), {
      spec: expectedNpmInstallSpec("@oriro/codex"),
      expectedPluginId: "codex",
      trustedSourceLinkedOfficialInstall: true,
    });
    const records = mockCallArg(mocks.writePersistedInstalledPluginIndexInstallRecords);
    expectRecordFields((records as Record<string, unknown>).codex, {
      source: "npm",
      spec: "@oriro/codex@2026.5.2",
      installPath: "/tmp/oriro-plugins/codex",
      version: "2026.5.2",
    });
    expect(mockCallArg(mocks.writePersistedInstalledPluginIndexInstallRecords, 0, 1)).toEqual({
      env,
    });
    expect(result.changes).toEqual([
      `Installed missing configured plugin "codex" from ${expectedNpmInstallSpec("@oriro/codex")}.`,
    ]);
    expect(result.warnings).toEqual([]);
    expect(Object.keys(result.records)).toEqual(["codex"]);
    expectRecordFields(result.records.codex, {
      source: "npm",
      spec: "@oriro/codex@2026.5.2",
      installPath: "/tmp/oriro-plugins/codex",
      version: "2026.5.2",
      resolvedName: "@oriro/codex",
      resolvedSpec: "@oriro/codex@2026.5.2",
      integrity: "sha512-codex",
      resolvedAt: "2026-05-01T00:00:00.000Z",
    });
    expect(typeof result.records.codex?.installedAt).toBe("string");
  });

  it.each([
    [
      "default agent runtime",
      {
        agents: {
          defaults: {
            agentRuntime: { id: "codex" },
          },
        },
      },
      {},
    ],
    [
      "agent runtime override",
      {
        agents: {
          list: [{ id: "main", agentRuntime: { id: "codex" } }],
        },
      },
      {},
    ],
    ["environment runtime override", {}, { ORIRO_AGENT_RUNTIME: "codex" }],
  ])("ignores legacy whole-agent Codex runtime selected by %s", async (_label, cfg, env) => {
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue([
      {
        id: "codex",
        label: "Codex",
        install: {
          npmSpec: "@oriro/codex",
          defaultChoice: "npm",
        },
      },
    ]);

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg,
      env,
    });

    expect(mocks.installPluginFromNpmSpec).not.toHaveBeenCalled();
    expect(mocks.writePersistedInstalledPluginIndexInstallRecords).not.toHaveBeenCalled();
    expect(result).toEqual({ changes: [], warnings: [], records: {} });
  });

  it("does not install a blocked downloadable plugin from explicit channel ids", async () => {
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "matrix",
        pluginId: "matrix",
        meta: { label: "Matrix" },
        install: {
          npmSpec: "@oriro/plugin-matrix@1.2.3",
        },
      },
    ]);

    const { repairMissingPluginInstallsForIds } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingPluginInstallsForIds({
      cfg: {},
      pluginIds: [],
      channelIds: ["matrix"],
      blockedPluginIds: ["matrix"],
      env: {},
    });

    expect(mocks.installPluginFromOriroHub).not.toHaveBeenCalled();
    expect(mocks.installPluginFromNpmSpec).not.toHaveBeenCalled();
    expect(result).toEqual({ changes: [], warnings: [], records: {} });
  });

  it("does not install a channel catalog plugin when a configured plugin already owns that channel", async () => {
    mocks.loadPluginMetadataSnapshot.mockReturnValue({
      plugins: [
        {
          id: "oriro-lark",
          origin: "config",
          channels: ["feishu"],
          channelConfigs: {
            feishu: {
              schema: {
                type: "object",
              },
            },
          },
        },
      ],
      diagnostics: [],
    });
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "feishu",
        pluginId: "feishu",
        meta: { label: "Feishu" },
        install: {
          npmSpec: "@oriro/feishu",
        },
        trustedSourceLinkedOfficialInstall: true,
      },
    ]);

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        plugins: {
          entries: {
            "oriro-lark": {
              enabled: true,
            },
          },
        },
        channels: {
          feishu: {
            footer: {
              model: false,
            },
          },
        },
      },
      env: {},
    });

    expect(mocks.installPluginFromOriroHub).not.toHaveBeenCalled();
    expect(mocks.installPluginFromNpmSpec).not.toHaveBeenCalled();
    expect(mocks.writePersistedInstalledPluginIndexInstallRecords).not.toHaveBeenCalled();
    expect(result).toEqual({ changes: [], warnings: [], records: {} });
  });

  it("still installs a channel catalog plugin when the configured owner is blocked by the allowlist", async () => {
    mocks.loadPluginMetadataSnapshot.mockReturnValue({
      plugins: [
        {
          id: "oriro-lark",
          origin: "config",
          channels: ["feishu"],
          channelConfigs: {
            feishu: {
              schema: {
                type: "object",
              },
            },
          },
        },
      ],
      diagnostics: [],
    });
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "feishu",
        pluginId: "feishu",
        meta: { label: "Feishu" },
        install: {
          npmSpec: "@oriro/feishu",
        },
        trustedSourceLinkedOfficialInstall: true,
      },
    ]);
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: true,
      pluginId: "feishu",
      targetDir: "/tmp/oriro-plugins/feishu",
      version: "2026.5.2",
      npmResolution: {
        name: "@oriro/feishu",
        version: "2026.5.2",
        resolvedSpec: "@oriro/feishu@2026.5.2",
      },
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        plugins: {
          allow: ["some-other-plugin"],
          entries: {
            "oriro-lark": {
              enabled: true,
            },
          },
        },
        channels: {
          feishu: {
            footer: {
              model: false,
            },
          },
        },
      },
      env: {},
    });

    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec), {
      spec: expectedNpmInstallSpec("@oriro/feishu"),
      expectedPluginId: "feishu",
      trustedSourceLinkedOfficialInstall: true,
    });
    expect(result.changes).toEqual([
      `Installed missing configured plugin "feishu" from ${expectedNpmInstallSpec("@oriro/feishu")}.`,
    ]);
  });

  it("still installs a channel catalog plugin when that plugin is explicitly configured", async () => {
    mocks.loadPluginMetadataSnapshot.mockReturnValue({
      plugins: [
        {
          id: "oriro-lark",
          origin: "config",
          channels: ["feishu"],
          channelConfigs: {
            feishu: {
              schema: {
                type: "object",
              },
            },
          },
        },
      ],
      diagnostics: [],
    });
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "feishu",
        pluginId: "feishu",
        meta: { label: "Feishu" },
        install: {
          npmSpec: "@oriro/feishu",
        },
        trustedSourceLinkedOfficialInstall: true,
      },
    ]);
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: true,
      pluginId: "feishu",
      targetDir: "/tmp/oriro-plugins/feishu",
      version: "2026.5.2",
      npmResolution: {
        name: "@oriro/feishu",
        version: "2026.5.2",
        resolvedSpec: "@oriro/feishu@2026.5.2",
      },
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        plugins: {
          entries: {
            feishu: {
              enabled: true,
            },
            "oriro-lark": {
              enabled: true,
            },
          },
        },
        channels: {
          feishu: {
            footer: {
              model: false,
            },
          },
        },
      },
      env: {},
    });

    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec), {
      spec: expectedNpmInstallSpec("@oriro/feishu"),
      expectedPluginId: "feishu",
      trustedSourceLinkedOfficialInstall: true,
    });
    expect(result.changes).toEqual([
      `Installed missing configured plugin "feishu" from ${expectedNpmInstallSpec("@oriro/feishu")}.`,
    ]);
  });

  it("reinstalls a missing configured plugin from its persisted install record", async () => {
    const records = {
      demo: {
        source: "npm",
        spec: "@oriro/plugin-demo@1.0.0",
        installPath: "/missing/demo",
      },
    };
    mocks.loadInstalledPluginIndexInstallRecords.mockResolvedValue(records);
    mocks.updateNpmInstalledPlugins.mockResolvedValue({
      changed: true,
      config: {
        plugins: {
          installs: {
            demo: {
              source: "npm",
              spec: "@oriro/plugin-demo@1.0.0",
              installPath: "/tmp/oriro-plugins/demo",
            },
          },
        },
      },
      outcomes: [
        {
          pluginId: "demo",
          status: "updated",
          message: "Updated demo.",
        },
      ],
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        plugins: {
          entries: {
            demo: { enabled: true },
          },
        },
      },
      env: {},
    });

    const updateArg = expectRecordFields(mockCallArg(mocks.updateNpmInstalledPlugins), {
      pluginIds: ["demo"],
    });
    const updateConfig = updateArg.config as Record<string, unknown>;
    expectRecordFields(updateConfig.plugins, { installs: records });
    const persistedRecords = mockCallArg(mocks.writePersistedInstalledPluginIndexInstallRecords);
    expectRecordFields((persistedRecords as Record<string, unknown>).demo, {
      installPath: "/tmp/oriro-plugins/demo",
    });
    expect(mockCallArg(mocks.writePersistedInstalledPluginIndexInstallRecords, 0, 1)).toEqual({
      env: {},
    });
    expect(result.changes).toEqual(['Repaired missing configured plugin "demo".']);
  });

  it("repairs a broken managed package entry from its attributed registry diagnostic", async () => {
    const records = {
      demo: {
        source: "npm",
        spec: "@oriro/plugin-demo@1.0.0",
        resolvedName: "@oriro/plugin-demo",
        resolvedSpec: "@oriro/plugin-demo@1.0.0",
        resolvedVersion: "1.0.0",
        integrity: "sha512-demo",
        installPath: "/tmp/oriro-plugins/demo",
      },
    };
    mocks.loadInstalledPluginIndexInstallRecords.mockResolvedValue(records);
    mocks.loadPluginMetadataSnapshot.mockReturnValue({
      plugins: [],
      diagnostics: [
        {
          level: "error",
          pluginId: "demo",
          message: "extension entry escapes package directory: ./index.ts",
        },
      ],
    });
    mocks.updateNpmInstalledPlugins.mockResolvedValue({
      changed: true,
      config: {
        plugins: {
          installs: {
            demo: {
              source: "npm",
              spec: "@oriro/plugin-demo@1.0.0",
              installPath: "/tmp/oriro-plugins/demo",
            },
          },
        },
      },
      outcomes: [
        {
          pluginId: "demo",
          status: "updated",
          message: "Updated demo.",
        },
      ],
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {},
      env: {},
    });

    const updateArg = expectRecordFields(mockCallArg(mocks.updateNpmInstalledPlugins), {
      pluginIds: ["demo"],
    });
    const updateConfig = updateArg.config as { plugins?: { installs?: Record<string, unknown> } };
    const updateRecord = expectRecordFields(updateConfig.plugins?.installs?.demo, {
      source: "npm",
      spec: "@oriro/plugin-demo@1.0.0",
      integrity: "sha512-demo",
      installPath: "/tmp/oriro-plugins/demo",
    });
    expect(updateRecord.resolvedSpec).toBeUndefined();
    expect(updateRecord.resolvedVersion).toBeUndefined();
    expect(result.changes).toEqual(['Repaired broken installed plugin "demo".']);
  });

  it("reinstalls a known configured plugin from the catalog when its recorded install path is missing", async () => {
    const records = {
      discord: {
        source: "npm",
        spec: "@oriro/discord",
        installPath: "/tmp/oriro-missing-discord-install-record",
      },
    };
    mocks.loadInstalledPluginIndexInstallRecords.mockResolvedValue(records);
    mocks.loadPluginMetadataSnapshot.mockReturnValue({
      plugins: [
        {
          id: "discord",
          channels: ["discord"],
        },
      ],
      diagnostics: [],
    });
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "discord",
        pluginId: "discord",
        meta: { label: "Discord" },
        install: {
          npmSpec: "@oriro/discord",
        },
        trustedSourceLinkedOfficialInstall: true,
      },
    ]);
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: true,
      pluginId: "discord",
      targetDir: "/tmp/oriro-plugins/discord",
      version: "1.2.3",
      npmResolution: {
        name: "@oriro/discord",
        version: "1.2.3",
        resolvedSpec: "@oriro/discord@1.2.3",
        integrity: "sha512-discord",
        resolvedAt: "2026-05-01T00:00:00.000Z",
      },
    });
    mocks.updateNpmInstalledPlugins.mockResolvedValue({
      changed: false,
      config: {
        plugins: {
          installs: records,
        },
      },
      outcomes: [
        {
          pluginId: "discord",
          status: "skipped",
          message: "No update applied.",
        },
      ],
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        plugins: {
          entries: {
            discord: { enabled: true },
          },
        },
        channels: {
          discord: { enabled: true },
        },
      },
      env: {},
    });

    const updateArg = expectRecordFields(mockCallArg(mocks.updateNpmInstalledPlugins), {
      pluginIds: ["discord"],
    });
    const updateConfig = updateArg.config as Record<string, unknown>;
    expectRecordFields(updateConfig.plugins, { installs: records });
    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec), {
      spec: expectedNpmInstallSpec("@oriro/discord"),
      expectedPluginId: "discord",
      trustedSourceLinkedOfficialInstall: true,
    });
    const persistedRecords = mockCallArg(mocks.writePersistedInstalledPluginIndexInstallRecords);
    expectRecordFields((persistedRecords as Record<string, unknown>).discord, {
      spec: "@oriro/discord@1.2.3",
      installPath: "/tmp/oriro-plugins/discord",
    });
    expect(mockCallArg(mocks.writePersistedInstalledPluginIndexInstallRecords, 0, 1)).toEqual({
      env: {},
    });
    expect(result.changes).toEqual([
      `Installed missing configured plugin "discord" from ${expectedNpmInstallSpec("@oriro/discord")}.`,
    ]);
  });

  it("updates a known configured plugin when its installed manifest path still exists", async () => {
    const records = {
      discord: {
        source: "npm",
        spec: "@oriro/discord",
        installPath: process.cwd(),
      },
    };
    mocks.loadInstalledPluginIndexInstallRecords.mockResolvedValue(records);
    mocks.loadPluginMetadataSnapshot.mockReturnValue({
      plugins: [
        {
          id: "discord",
          channels: ["discord"],
        },
      ],
      diagnostics: [
        {
          pluginId: "discord",
          message: "manifest without channelConfigs metadata",
        },
      ],
    });
    mocks.updateNpmInstalledPlugins.mockResolvedValue({
      changed: true,
      config: {
        plugins: {
          installs: {
            discord: {
              source: "npm",
              spec: "@oriro/discord",
              installPath: process.cwd(),
            },
          },
        },
      },
      outcomes: [
        {
          pluginId: "discord",
          status: "updated",
          message: "Updated discord.",
        },
      ],
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        plugins: {
          entries: {
            discord: { enabled: true },
          },
        },
        channels: {
          discord: { enabled: true },
        },
      },
      env: {},
    });

    const updateArg = expectRecordFields(mockCallArg(mocks.updateNpmInstalledPlugins), {
      pluginIds: ["discord"],
    });
    const updateConfig = updateArg.config as Record<string, unknown>;
    expectRecordFields(updateConfig.plugins, { installs: records });
    const persistedRecords = mockCallArg(mocks.writePersistedInstalledPluginIndexInstallRecords);
    expectRecordFields((persistedRecords as Record<string, unknown>).discord, {
      installPath: process.cwd(),
    });
    expect(mockCallArg(mocks.writePersistedInstalledPluginIndexInstallRecords, 0, 1)).toEqual({
      env: {},
    });
    expect(result.changes).toEqual(['Repaired missing configured plugin "discord".']);
  });

  it("updates a configured plugin when its installed manifest lacks channel config descriptors", async () => {
    const records = {
      discord: {
        source: "npm",
        spec: "@oriro/discord",
        installPath: "/tmp/oriro-plugins/discord",
      },
    };
    mocks.loadInstalledPluginIndexInstallRecords.mockResolvedValue(records);
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "discord",
        pluginId: "discord",
        meta: { label: "Discord" },
        install: {
          npmSpec: "@oriro/discord",
        },
      },
    ]);
    mocks.loadPluginMetadataSnapshot.mockReturnValue({
      plugins: [
        {
          id: "discord",
          channels: ["discord"],
        },
      ],
      diagnostics: [
        {
          level: "warn",
          pluginId: "discord",
          message:
            "channel plugin manifest declares discord without channelConfigs metadata; add oriro.plugin.json#channelConfigs so config schema and setup surfaces work before runtime loads",
        },
      ],
    });
    mocks.updateNpmInstalledPlugins.mockResolvedValue({
      changed: true,
      config: {
        plugins: {
          installs: {
            discord: {
              source: "npm",
              spec: "@oriro/discord",
              installPath: process.cwd(),
            },
          },
        },
      },
      outcomes: [
        {
          pluginId: "discord",
          status: "updated",
          message: "Updated discord.",
        },
      ],
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        update: { channel: "beta" },
        plugins: {
          entries: {
            discord: { enabled: true },
          },
        },
        channels: {
          discord: { enabled: true },
        },
      },
      env: {},
    });

    const updateArg = expectRecordFields(mockCallArg(mocks.updateNpmInstalledPlugins), {
      pluginIds: ["discord"],
      updateChannel: "beta",
    });
    const updateConfig = updateArg.config as Record<string, unknown>;
    expectRecordFields(updateConfig.plugins, { installs: records });
    const persistedRecords = mockCallArg(
      mocks.writePersistedInstalledPluginIndexInstallRecords,
    ) as Record<string, unknown>;
    expectRecordFields(persistedRecords.discord, { installPath: process.cwd() });
    expect(mockCallArg(mocks.writePersistedInstalledPluginIndexInstallRecords, 0, 1)).toEqual({
      env: {},
    });
    expect(result).toEqual({
      changes: ['Repaired missing configured plugin "discord".'],
      warnings: [],
      repairedPluginIds: ["discord"],
      records: {
        discord: {
          source: "npm",
          spec: "@oriro/discord",
          installPath: process.cwd(),
        },
      },
    });
  });

  it("reinstalls a recorded external web search plugin from provider-only config", async () => {
    const records = {
      brave: {
        source: "npm",
        spec: "@oriro/brave-plugin@beta",
        installPath: "/missing/brave",
      },
    };
    mocks.loadInstalledPluginIndexInstallRecords.mockResolvedValue(records);
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue([
      {
        id: "brave",
        label: "Brave",
        install: {
          npmSpec: "@oriro/brave-plugin",
          defaultChoice: "npm",
        },
        oriro: {
          plugin: { id: "brave", label: "Brave" },
          webSearchProviders: [
            {
              id: "brave",
              label: "Brave Search",
              hint: "Brave Search",
              envVars: ["BRAVE_API_KEY"],
              placeholder: "BSA...",
              signupUrl: "https://example.test/brave",
            },
          ],
        },
      },
    ]);
    mocks.updateNpmInstalledPlugins.mockResolvedValue({
      changed: true,
      config: {
        plugins: {
          installs: {
            brave: {
              source: "npm",
              spec: "@oriro/brave-plugin@beta",
              installPath: process.cwd(),
            },
          },
        },
      },
      outcomes: [
        {
          pluginId: "brave",
          status: "updated",
          message: "Updated brave.",
        },
      ],
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        tools: {
          web: {
            search: {
              provider: "brave",
            },
          },
        },
      },
      env: {},
    });

    const updateArg = expectRecordFields(mockCallArg(mocks.updateNpmInstalledPlugins), {
      pluginIds: ["brave"],
    });
    const updateConfig = updateArg.config as Record<string, unknown>;
    expectRecordFields(updateConfig.plugins, { installs: records });
    const persistedRecords = mockCallArg(
      mocks.writePersistedInstalledPluginIndexInstallRecords,
    ) as Record<string, unknown>;
    expectRecordFields(persistedRecords.brave, { installPath: process.cwd() });
    expect(mockCallArg(mocks.writePersistedInstalledPluginIndexInstallRecords, 0, 1)).toEqual({
      env: {},
    });
    expect(result.changes).toEqual(['Repaired missing configured plugin "brave".']);
  });

  it("replaces a configured official web search plugin when its installed package is source-only", async () => {
    const extensionsDir = path.join(makeTempDir(), "extensions");
    const installDir = path.join(extensionsDir, "brave");
    mocks.resolveDefaultPluginExtensionsDir.mockReturnValue(extensionsDir);
    fs.mkdirSync(installDir, { recursive: true });
    fs.writeFileSync(path.join(installDir, "package.json"), JSON.stringify({ name: "brave" }));
    const records = {
      brave: {
        source: "orirohub",
        spec: "orirohub:@oriro/brave-plugin@2026.5.1-beta.1",
        installPath: installDir,
        orirohubPackage: "@oriro/brave-plugin",
        orirohubChannel: "official",
        orirohubUrl: "https://orirohub.ai",
      },
    };
    mocks.loadInstalledPluginIndexInstallRecords.mockResolvedValue(records);
    mocks.loadPluginMetadataSnapshot.mockReturnValue({
      plugins: [],
      diagnostics: [
        {
          level: "error",
          pluginId: "brave",
          message:
            "installed plugin package requires compiled runtime output for TypeScript entry index.ts: expected ./dist/index.js, ./dist/index.mjs, ./dist/index.cjs, index.js, index.mjs, index.cjs.",
        },
      ],
    });
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue([
      {
        id: "brave",
        label: "Brave",
        install: {
          npmSpec: "@oriro/brave-plugin",
          defaultChoice: "npm",
        },
        oriro: {
          plugin: { id: "brave", label: "Brave" },
          webSearchProviders: [
            {
              id: "brave",
              label: "Brave Search",
              hint: "Brave Search",
              envVars: ["BRAVE_API_KEY"],
              placeholder: "BSA...",
              signupUrl: "https://example.test/brave",
            },
          ],
        },
      },
    ]);
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: true,
      pluginId: "brave",
      targetDir: "/tmp/oriro-plugins/brave",
      version: "2026.5.12",
      npmResolution: {
        name: "@oriro/brave-plugin",
        version: "2026.5.12",
        resolvedSpec: "@oriro/brave-plugin@2026.5.12",
        integrity: "sha512-brave",
        resolvedAt: "2026-05-01T00:00:00.000Z",
      },
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        tools: {
          web: {
            search: {
              provider: "brave",
            },
          },
        },
      },
      env: {},
    });

    expect(mocks.updateNpmInstalledPlugins).not.toHaveBeenCalled();
    expect(fs.existsSync(installDir)).toBe(false);
    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec), {
      spec: expectedNpmInstallSpec("@oriro/brave-plugin"),
      expectedPluginId: "brave",
      trustedSourceLinkedOfficialInstall: true,
      mode: "update",
    });
    const persistedRecords = mockCallArg(
      mocks.writePersistedInstalledPluginIndexInstallRecords,
    ) as Record<string, unknown>;
    expectRecordFields(persistedRecords.brave, {
      source: "npm",
      spec: "@oriro/brave-plugin@2026.5.12",
      installPath: "/tmp/oriro-plugins/brave",
      version: "2026.5.12",
    });
    expect(result).toEqual({
      changes: [
        `Installed missing configured plugin "brave" from ${expectedNpmInstallSpec("@oriro/brave-plugin")}.`,
      ],
      warnings: [],
      repairedPluginIds: ["brave"],
      records: persistedRecords,
    });
  });

  it("replaces a configured official channel plugin when only its channel is configured", async () => {
    const extensionsDir = path.join(makeTempDir(), "extensions");
    const installDir = path.join(extensionsDir, "slack");
    mocks.resolveDefaultPluginExtensionsDir.mockReturnValue(extensionsDir);
    fs.mkdirSync(installDir, { recursive: true });
    fs.writeFileSync(path.join(installDir, "package.json"), JSON.stringify({ name: "slack" }));
    const records = {
      slack: {
        source: "orirohub",
        spec: "orirohub:@oriro/slack@2026.5.12-beta.1",
        installPath: installDir,
        orirohubPackage: "@oriro/slack",
        orirohubChannel: "official",
        orirohubUrl: "https://orirohub.ai",
      },
    };
    mocks.loadInstalledPluginIndexInstallRecords.mockResolvedValue(records);
    mocks.loadPluginMetadataSnapshot.mockReturnValue({
      plugins: [],
      diagnostics: [
        {
          level: "error",
          pluginId: "slack",
          message:
            "installed plugin package requires compiled runtime output for TypeScript entry index.ts: expected ./dist/index.js.",
        },
      ],
    });
    mocks.listChannelPluginCatalogEntries.mockReturnValue([
      {
        id: "slack",
        pluginId: "slack",
        meta: { label: "Slack" },
        install: {
          npmSpec: "@oriro/slack",
          defaultChoice: "npm",
        },
        trustedSourceLinkedOfficialInstall: true,
      },
    ]);
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: true,
      pluginId: "slack",
      targetDir: "/tmp/oriro-npm/node_modules/@oriro/slack",
      version: "2026.5.12",
      npmResolution: {
        name: "@oriro/slack",
        version: "2026.5.12",
        resolvedSpec: "@oriro/slack@2026.5.12",
        integrity: "sha512-slack",
        resolvedAt: "2026-05-01T00:00:00.000Z",
      },
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        channels: {
          slack: {
            enabled: true,
            botToken: "xoxb-test",
          },
        },
      },
      env: {},
    });

    expect(mocks.updateNpmInstalledPlugins).not.toHaveBeenCalled();
    expect(fs.existsSync(installDir)).toBe(false);
    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec), {
      spec: expectedNpmInstallSpec("@oriro/slack"),
      expectedPluginId: "slack",
      trustedSourceLinkedOfficialInstall: true,
      mode: "update",
    });
    expect(result.changes).toEqual([
      `Installed missing configured plugin "slack" from ${expectedNpmInstallSpec("@oriro/slack")}.`,
    ]);
  });

  it("does not delete an arbitrary recorded path when replacing a broken official plugin", async () => {
    const installDir = makeTempDir();
    fs.writeFileSync(path.join(installDir, "package.json"), JSON.stringify({ name: "brave" }));
    const records = {
      brave: {
        source: "orirohub",
        spec: "orirohub:@oriro/brave-plugin@2026.5.1-beta.1",
        installPath: installDir,
        orirohubPackage: "@oriro/brave-plugin",
        orirohubChannel: "official",
        orirohubUrl: "https://orirohub.ai",
      },
    };
    mocks.loadInstalledPluginIndexInstallRecords.mockResolvedValue(records);
    mocks.loadPluginMetadataSnapshot.mockReturnValue({
      plugins: [],
      diagnostics: [
        {
          level: "error",
          pluginId: "brave",
          message:
            "installed plugin package requires compiled runtime output for TypeScript entry index.ts: expected ./dist/index.js.",
        },
      ],
    });
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue([
      {
        id: "brave",
        label: "Brave",
        install: {
          npmSpec: "@oriro/brave-plugin",
          defaultChoice: "npm",
        },
        oriro: {
          plugin: { id: "brave", label: "Brave" },
          webSearchProviders: [
            {
              id: "brave",
              label: "Brave Search",
              hint: "Brave Search",
              envVars: ["BRAVE_API_KEY"],
              placeholder: "BSA...",
              signupUrl: "https://example.test/brave",
            },
          ],
        },
      },
    ]);
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: true,
      pluginId: "brave",
      targetDir: "/tmp/oriro-plugins/brave",
      version: "2026.5.12",
      npmResolution: {
        name: "@oriro/brave-plugin",
        version: "2026.5.12",
        resolvedSpec: "@oriro/brave-plugin@2026.5.12",
        integrity: "sha512-brave",
        resolvedAt: "2026-05-01T00:00:00.000Z",
      },
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    await repairMissingConfiguredPluginInstalls({
      cfg: {
        tools: {
          web: {
            search: {
              provider: "brave",
            },
          },
        },
      },
      env: {},
    });

    expect(fs.existsSync(installDir)).toBe(true);
    expect(mocks.installPluginFromNpmSpec).toHaveBeenCalled();
  });

  it("keeps a broken official install record when replacement install fails", async () => {
    const extensionsDir = path.join(makeTempDir(), "extensions");
    const installDir = path.join(extensionsDir, "brave");
    mocks.resolveDefaultPluginExtensionsDir.mockReturnValue(extensionsDir);
    fs.mkdirSync(installDir, { recursive: true });
    fs.writeFileSync(path.join(installDir, "package.json"), JSON.stringify({ name: "brave" }));
    const records = {
      brave: {
        source: "orirohub",
        spec: "orirohub:@oriro/brave-plugin@2026.5.1-beta.1",
        installPath: installDir,
        orirohubPackage: "@oriro/brave-plugin",
        orirohubChannel: "official",
        orirohubUrl: "https://orirohub.ai",
      },
    };
    mocks.loadInstalledPluginIndexInstallRecords.mockResolvedValue(records);
    mocks.loadPluginMetadataSnapshot.mockReturnValue({
      plugins: [],
      diagnostics: [
        {
          level: "error",
          pluginId: "brave",
          message:
            "installed plugin package requires compiled runtime output for TypeScript entry index.ts: expected ./dist/index.js.",
        },
      ],
    });
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue([
      {
        id: "brave",
        label: "Brave",
        install: {
          npmSpec: "@oriro/brave-plugin",
          defaultChoice: "npm",
        },
        oriro: {
          plugin: { id: "brave", label: "Brave" },
          webSearchProviders: [
            {
              id: "brave",
              label: "Brave Search",
              hint: "Brave Search",
              envVars: ["BRAVE_API_KEY"],
              placeholder: "BSA...",
              signupUrl: "https://example.test/brave",
            },
          ],
        },
      },
    ]);
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: false,
      error: "network unavailable",
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        tools: {
          web: {
            search: {
              provider: "brave",
            },
          },
        },
      },
      env: {},
    });

    expect(fs.existsSync(installDir)).toBe(true);
    expect(mocks.writePersistedInstalledPluginIndexInstallRecords).not.toHaveBeenCalled();
    expect(result).toEqual({
      changes: [],
      warnings: [
        `Failed to install missing configured plugin "brave" from ${expectedNpmInstallSpec("@oriro/brave-plugin")}: network unavailable`,
      ],
      failedPluginIds: ["brave"],
      records,
    });
  });

  it("does not replace a non-official install that collides with an official plugin id", async () => {
    const extensionsDir = path.join(makeTempDir(), "extensions");
    const installDir = path.join(extensionsDir, "brave");
    mocks.resolveDefaultPluginExtensionsDir.mockReturnValue(extensionsDir);
    fs.mkdirSync(installDir, { recursive: true });
    fs.writeFileSync(path.join(installDir, "package.json"), JSON.stringify({ name: "brave" }));
    const records = {
      brave: {
        source: "path",
        sourcePath: installDir,
        installPath: installDir,
      },
    };
    mocks.loadInstalledPluginIndexInstallRecords.mockResolvedValue(records);
    mocks.loadPluginMetadataSnapshot.mockReturnValue({
      plugins: [],
      diagnostics: [
        {
          level: "error",
          pluginId: "brave",
          message:
            "installed plugin package requires compiled runtime output for TypeScript entry index.ts: expected ./dist/index.js.",
        },
      ],
    });
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue([
      {
        id: "brave",
        label: "Brave",
        install: {
          npmSpec: "@oriro/brave-plugin",
          defaultChoice: "npm",
        },
        oriro: {
          plugin: { id: "brave", label: "Brave" },
          webSearchProviders: [
            {
              id: "brave",
              label: "Brave Search",
              hint: "Brave Search",
              envVars: ["BRAVE_API_KEY"],
              placeholder: "BSA...",
              signupUrl: "https://example.test/brave",
            },
          ],
        },
      },
    ]);

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        tools: {
          web: {
            search: {
              provider: "brave",
            },
          },
        },
      },
      env: {},
    });

    expect(fs.existsSync(installDir)).toBe(true);
    expect(mocks.installPluginFromNpmSpec).not.toHaveBeenCalled();
    expect(mocks.updateNpmInstalledPlugins).not.toHaveBeenCalled();
    expect(result).toEqual({
      changes: [],
      warnings: [],
      records,
    });
  });

  it("installs a configured external web search plugin from provider-only config", async () => {
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue([
      {
        id: "brave",
        label: "Brave",
        install: {
          npmSpec: "@oriro/brave-plugin",
          defaultChoice: "npm",
        },
        oriro: {
          plugin: { id: "brave", label: "Brave" },
          webSearchProviders: [
            {
              id: "brave",
              label: "Brave Search",
              hint: "Brave Search",
              envVars: ["BRAVE_API_KEY"],
              placeholder: "BSA...",
              signupUrl: "https://example.test/brave",
              credentialPath: "plugins.entries.brave.config.webSearch.apiKey",
            },
          ],
          install: {
            npmSpec: "@oriro/brave-plugin",
            defaultChoice: "npm",
          },
        },
      },
    ]);
    mocks.resolveOfficialExternalPluginId.mockImplementation(
      (entry: { id?: string; oriro?: { plugin?: { id?: string } } }) =>
        entry.oriro?.plugin?.id ?? entry.id,
    );
    mocks.resolveOfficialExternalPluginInstall.mockImplementation(
      (entry: { install?: unknown; oriro?: { install?: unknown } }) =>
        entry.oriro?.install ?? entry.install ?? null,
    );
    mocks.resolveOfficialExternalPluginLabel.mockImplementation(
      (entry: { label?: string; oriro?: { plugin?: { label?: string } } }) =>
        entry.oriro?.plugin?.label ?? entry.label ?? "plugin",
    );
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: true,
      pluginId: "brave",
      targetDir: "/tmp/oriro-plugins/brave",
      version: "2026.5.2",
      npmResolution: {
        name: "@oriro/brave-plugin",
        version: "2026.5.2",
        resolvedSpec: "@oriro/brave-plugin@2026.5.2",
      },
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        tools: {
          web: {
            search: {
              provider: "brave",
            },
          },
        },
      },
      env: {},
    });

    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec), {
      spec: expectedNpmInstallSpec("@oriro/brave-plugin"),
      expectedPluginId: "brave",
      trustedSourceLinkedOfficialInstall: true,
    });
    expect(result.changes).toEqual([
      `Installed missing configured plugin "brave" from ${expectedNpmInstallSpec("@oriro/brave-plugin")}.`,
    ]);
  });

  it("installs configured external speech and web-fetch plugins from selected providers", async () => {
    const packages = [
      ["firecrawl", "@oriro/firecrawl-plugin"],
      ["gradium", "@oriro/gradium-speech"],
      ["inworld", "@oriro/inworld-speech"],
    ] as const;
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue(
      packages.map(([id, npmSpec]) => ({
        id,
        label: id,
        install: {
          npmSpec,
          defaultChoice: "npm",
        },
      })),
    );
    mocks.resolveOfficialExternalProviderContractPluginIds.mockImplementation(
      ({ contract }: { contract: string }) => {
        if (contract === "webFetchProviders") {
          return ["firecrawl"];
        }
        if (contract === "speechProviders") {
          return ["gradium", "inworld"];
        }
        return [];
      },
    );
    for (const [pluginId, npmSpec] of packages) {
      mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
        ok: true,
        pluginId,
        targetDir: `/tmp/oriro-plugins/${pluginId}`,
        version: "2026.6.8",
        npmResolution: {
          name: npmSpec,
          version: "2026.6.8",
          resolvedSpec: `${npmSpec}@2026.6.8`,
        },
      });
    }

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        messages: {
          tts: {
            provider: "gradium",
            providers: {
              inworld: {},
            },
          },
        },
        tools: {
          web: {
            fetch: {
              provider: "firecrawl",
            },
          },
        },
      },
      env: {},
    });

    expect(
      mocks.installPluginFromNpmSpec.mock.calls.map(
        ([params]) => (params as { expectedPluginId?: string }).expectedPluginId,
      ),
    ).toEqual(["firecrawl", "gradium", "inworld"]);
    expect(result.changes).toEqual(
      packages.map(
        ([pluginId, npmSpec]) =>
          `Installed missing configured plugin "${pluginId}" from ${expectedNpmInstallSpec(npmSpec)}.`,
      ),
    );
  });

  it("installs a configured external model provider without an auth choice", async () => {
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue([
      {
        id: "groq",
        label: "Groq",
        install: {
          npmSpec: "@oriro/groq-provider",
          defaultChoice: "npm",
        },
        oriro: {
          plugin: { id: "groq", label: "Groq" },
          providers: [{ id: "groq" }],
        },
      },
    ]);
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: true,
      pluginId: "groq",
      targetDir: "/tmp/oriro-plugins/groq",
      version: "2026.6.8",
      npmResolution: {
        name: "@oriro/groq-provider",
        version: "2026.6.8",
        resolvedSpec: "@oriro/groq-provider@2026.6.8",
      },
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        agents: {
          defaults: {
            model: "groq/llama-3.3-70b-versatile",
          },
        },
      },
      env: {},
    });

    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec), {
      spec: expectedNpmInstallSpec("@oriro/groq-provider"),
      expectedPluginId: "groq",
      trustedSourceLinkedOfficialInstall: true,
    });
    expect(result.changes).toEqual([
      `Installed missing configured plugin "groq" from ${expectedNpmInstallSpec("@oriro/groq-provider")}.`,
    ]);
  });

  it("installs an external media-understanding provider selected only by media config", async () => {
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue([
      {
        id: "groq",
        label: "Groq",
        install: {
          npmSpec: "@oriro/groq-provider",
          defaultChoice: "npm",
        },
        oriro: {
          plugin: { id: "groq", label: "Groq" },
          contracts: { mediaUnderstandingProviders: ["groq"] },
        },
      },
    ]);
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: true,
      pluginId: "groq",
      targetDir: "/tmp/oriro-plugins/groq",
      version: "2026.6.8",
      npmResolution: {
        name: "@oriro/groq-provider",
        version: "2026.6.8",
        resolvedSpec: "@oriro/groq-provider@2026.6.8",
      },
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        tools: {
          media: {
            audio: {
              models: [{ provider: "groq", model: "whisper-large-v3-turbo" }],
            },
          },
        },
      },
      env: {},
    });

    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec), {
      spec: expectedNpmInstallSpec("@oriro/groq-provider"),
      expectedPluginId: "groq",
      trustedSourceLinkedOfficialInstall: true,
    });
    expect(result.changes).toEqual([
      `Installed missing configured plugin "groq" from ${expectedNpmInstallSpec("@oriro/groq-provider")}.`,
    ]);
  });

  it("installs an external speech provider selected only by voiceModel", async () => {
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue([
      {
        id: "gradium",
        label: "Gradium",
        install: {
          npmSpec: "@oriro/gradium-speech",
          defaultChoice: "npm",
        },
        oriro: {
          plugin: { id: "gradium", label: "Gradium" },
          contracts: { speechProviders: ["gradium"] },
        },
      },
    ]);
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: true,
      pluginId: "gradium",
      targetDir: "/tmp/oriro-plugins/gradium",
      version: "2026.6.8",
      npmResolution: {
        name: "@oriro/gradium-speech",
        version: "2026.6.8",
        resolvedSpec: "@oriro/gradium-speech@2026.6.8",
      },
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        agents: {
          defaults: {
            voiceModel: { primary: "gradium/tts-default" },
          },
        },
      },
      env: {},
    });

    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec), {
      spec: expectedNpmInstallSpec("@oriro/gradium-speech"),
      expectedPluginId: "gradium",
      trustedSourceLinkedOfficialInstall: true,
    });
    expect(result.changes).toEqual([
      `Installed missing configured plugin "gradium" from ${expectedNpmInstallSpec("@oriro/gradium-speech")}.`,
    ]);
  });

  it("installs env-only web provider plugins before auto-detection", async () => {
    const packages = [
      ["exa", "@oriro/exa-plugin", "EXA_API_KEY"],
      ["firecrawl", "@oriro/firecrawl-plugin", "FIRECRAWL_API_KEY"],
    ] as const;
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue(
      packages.map(([id, npmSpec, envVar]) => ({
        id,
        label: id,
        install: {
          npmSpec,
          defaultChoice: "npm",
        },
        oriro: {
          plugin: { id, label: id },
          webSearchProviders: [
            {
              id,
              label: id,
              hint: `${id} search`,
              envVars: [envVar],
              placeholder: `${id}-key`,
              signupUrl: `https://example.com/${id}`,
            },
          ],
        },
      })),
    );
    for (const [pluginId, npmSpec] of packages) {
      mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
        ok: true,
        pluginId,
        targetDir: `/tmp/oriro-plugins/${pluginId}`,
        version: "2026.6.8",
        npmResolution: {
          name: npmSpec,
          version: "2026.6.8",
          resolvedSpec: `${npmSpec}@2026.6.8`,
        },
      });
    }

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {},
      env: {
        EXA_API_KEY: "exa-key",
        FIRECRAWL_API_KEY: "firecrawl-key",
      },
    });

    expect(
      mocks.installPluginFromNpmSpec.mock.calls.map(
        ([params]) => (params as { expectedPluginId?: string }).expectedPluginId,
      ),
    ).toEqual(["exa", "firecrawl"]);
    expect(result.changes).toEqual(
      packages.map(
        ([pluginId, npmSpec]) =>
          `Installed missing configured plugin "${pluginId}" from ${expectedNpmInstallSpec(npmSpec)}.`,
      ),
    );
  });

  it("installs env-only provider plugins before model discovery", async () => {
    mocks.resolveOfficialExternalProviderPluginIdsForEnv.mockReturnValue(["groq"]);
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue([
      {
        id: "groq",
        label: "Groq",
        install: {
          npmSpec: "@oriro/groq-provider",
          defaultChoice: "npm",
        },
        oriro: {
          plugin: { id: "groq", label: "Groq" },
        },
      },
    ]);
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: true,
      pluginId: "groq",
      targetDir: "/tmp/oriro-plugins/groq",
      version: "2026.6.8",
      npmResolution: {
        name: "@oriro/groq-provider",
        version: "2026.6.8",
        resolvedSpec: "@oriro/groq-provider@2026.6.8",
      },
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const env = { GROQ_API_KEY: "groq-key" };
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {},
      env,
    });

    expect(mocks.resolveOfficialExternalProviderPluginIdsForEnv).toHaveBeenCalledWith(env);
    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec), {
      spec: expectedNpmInstallSpec("@oriro/groq-provider"),
      expectedPluginId: "groq",
      trustedSourceLinkedOfficialInstall: true,
    });
    expect(result.changes).toEqual([
      `Installed missing configured plugin "groq" from ${expectedNpmInstallSpec("@oriro/groq-provider")}.`,
    ]);
  });

  it("installs configured external web search plugins from beta on the beta channel", async () => {
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue([
      {
        id: "brave",
        label: "Brave",
        install: {
          npmSpec: "@oriro/brave-plugin",
          defaultChoice: "npm",
        },
        oriro: {
          plugin: { id: "brave", label: "Brave" },
          webSearchProviders: [
            {
              id: "brave",
              label: "Brave Search",
              hint: "Brave Search",
              envVars: ["BRAVE_API_KEY"],
              placeholder: "BSA...",
              signupUrl: "https://example.test/brave",
              credentialPath: "plugins.entries.brave.config.webSearch.apiKey",
            },
          ],
          install: {
            npmSpec: "@oriro/brave-plugin",
            defaultChoice: "npm",
          },
        },
      },
    ]);
    mocks.resolveOfficialExternalPluginId.mockImplementation(
      (entry: { id?: string; oriro?: { plugin?: { id?: string } } }) =>
        entry.oriro?.plugin?.id ?? entry.id,
    );
    mocks.resolveOfficialExternalPluginInstall.mockImplementation(
      (entry: { install?: unknown; oriro?: { install?: unknown } }) =>
        entry.oriro?.install ?? entry.install ?? null,
    );
    mocks.resolveOfficialExternalPluginLabel.mockImplementation(
      (entry: { label?: string; oriro?: { plugin?: { label?: string } } }) =>
        entry.oriro?.plugin?.label ?? entry.label ?? "plugin",
    );
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: true,
      pluginId: "brave",
      targetDir: "/tmp/oriro-plugins/brave",
      version: "2026.5.4-beta.1",
      npmResolution: {
        name: "@oriro/brave-plugin",
        version: "2026.5.4-beta.1",
        resolvedSpec: "@oriro/brave-plugin@2026.5.4-beta.1",
      },
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        update: { channel: "beta" },
        tools: {
          web: {
            search: {
              provider: "brave",
            },
          },
        },
      },
      env: {},
    });

    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec), {
      spec: "@oriro/brave-plugin@beta",
      expectedPluginId: "brave",
      trustedSourceLinkedOfficialInstall: true,
    });
    const persistedRecords = mockCallArg(
      mocks.writePersistedInstalledPluginIndexInstallRecords,
    ) as Record<string, unknown>;
    expectRecordFields(persistedRecords.brave, {
      spec: "@oriro/brave-plugin@2026.5.4-beta.1",
    });
    expect(mockCallArg(mocks.writePersistedInstalledPluginIndexInstallRecords, 0, 1)).toEqual({
      env: {},
    });
    expect(result.changes).toEqual([
      'Installed missing configured plugin "brave" from @oriro/brave-plugin@beta.',
    ]);
  });

  it("repairs a configured plugin from a legacy npm declaration stub", async () => {
    const root = makeTempDir();
    const pluginDir = path.join(root, "extensions", "guardrail-bridge");
    writeLegacyNpmDeclarationStub({
      pluginDir,
      pluginId: "guardrail-bridge",
      npmSpec: "@guardrail-bridge/guardrail-bridge@1.0.0",
    });
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: true,
      pluginId: "guardrail-bridge",
      targetDir: "/tmp/oriro-plugins/guardrail-bridge",
      version: "1.0.0",
      npmResolution: {
        name: "@guardrail-bridge/guardrail-bridge",
        version: "1.0.0",
        resolvedSpec: "@guardrail-bridge/guardrail-bridge@1.0.0",
        integrity: "sha512-guardrail",
        resolvedAt: "2026-05-01T00:00:00.000Z",
      },
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        plugins: {
          load: {
            paths: [pluginDir],
          },
          entries: {
            "guardrail-bridge": { enabled: true },
          },
        },
      },
      env: {},
    });

    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec), {
      spec: "@guardrail-bridge/guardrail-bridge@1.0.0",
      expectedPluginId: "guardrail-bridge",
      extensionsDir: "/tmp/oriro-plugins",
    });
    expect(mockCallArg(mocks.installPluginFromNpmSpec).trustedSourceLinkedOfficialInstall).toBe(
      undefined,
    );
    const records = mockCallArg(mocks.writePersistedInstalledPluginIndexInstallRecords);
    expectRecordFields((records as Record<string, unknown>)["guardrail-bridge"], {
      source: "npm",
      spec: "@guardrail-bridge/guardrail-bridge@1.0.0",
      installPath: "/tmp/oriro-plugins/guardrail-bridge",
      version: "1.0.0",
      resolvedName: "@guardrail-bridge/guardrail-bridge",
    });
    expect(result.changes).toEqual([
      'Installed missing configured plugin "guardrail-bridge" from @guardrail-bridge/guardrail-bridge@1.0.0.',
    ]);
    expect(result.warnings).toStrictEqual([]);
  });

  it("installs Firecrawl for env-only web fetch when search is disabled", async () => {
    mocks.resolveOfficialExternalWebProviderContractPluginIdsForEnv.mockReturnValue(["firecrawl"]);
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue([
      {
        id: "firecrawl",
        label: "Firecrawl",
        install: {
          npmSpec: "@oriro/firecrawl-plugin",
          defaultChoice: "npm",
        },
        oriro: {
          plugin: { id: "firecrawl", label: "Firecrawl" },
        },
      },
    ]);
    mocks.installPluginFromNpmSpec.mockResolvedValueOnce({
      ok: true,
      pluginId: "firecrawl",
      targetDir: "/tmp/oriro-plugins/firecrawl",
      version: "2026.6.8",
      npmResolution: {
        name: "@oriro/firecrawl-plugin",
        version: "2026.6.8",
        resolvedSpec: "@oriro/firecrawl-plugin@2026.6.8",
      },
    });

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const env = { FIRECRAWL_API_KEY: "firecrawl-key" };
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        tools: {
          web: {
            search: {
              enabled: false,
            },
          },
        },
      },
      env,
    });

    expect(mocks.resolveOfficialExternalWebProviderContractPluginIdsForEnv).toHaveBeenCalledWith({
      contract: "webFetchProviders",
      env,
    });
    expectRecordFields(mockCallArg(mocks.installPluginFromNpmSpec), {
      spec: expectedNpmInstallSpec("@oriro/firecrawl-plugin"),
      expectedPluginId: "firecrawl",
      trustedSourceLinkedOfficialInstall: true,
    });
    expect(result.changes).toEqual([
      `Installed missing configured plugin "firecrawl" from ${expectedNpmInstallSpec("@oriro/firecrawl-plugin")}.`,
    ]);
  });

  it("does not install a configured external web search plugin when search is disabled", async () => {
    mocks.listOfficialExternalPluginCatalogEntries.mockReturnValue([
      {
        id: "brave",
        label: "Brave",
        install: {
          npmSpec: "@oriro/brave-plugin",
          defaultChoice: "npm",
        },
        oriro: {
          plugin: { id: "brave", label: "Brave" },
          webSearchProviders: [
            {
              id: "brave",
              label: "Brave Search",
              hint: "Brave Search",
              envVars: ["BRAVE_API_KEY"],
              placeholder: "BSA...",
              signupUrl: "https://example.test/brave",
              credentialPath: "plugins.entries.brave.config.webSearch.apiKey",
            },
          ],
          install: {
            npmSpec: "@oriro/brave-plugin",
            defaultChoice: "npm",
          },
        },
      },
    ]);
    mocks.resolveOfficialExternalPluginId.mockImplementation(
      (entry: { id?: string; oriro?: { plugin?: { id?: string } } }) =>
        entry.oriro?.plugin?.id ?? entry.id,
    );
    mocks.resolveOfficialExternalPluginInstall.mockImplementation(
      (entry: { install?: unknown; oriro?: { install?: unknown } }) =>
        entry.oriro?.install ?? entry.install ?? null,
    );
    mocks.resolveOfficialExternalPluginLabel.mockImplementation(
      (entry: { label?: string; oriro?: { plugin?: { label?: string } } }) =>
        entry.oriro?.plugin?.label ?? entry.label ?? "plugin",
    );

    const { repairMissingConfiguredPluginInstalls } =
      await import("./missing-configured-plugin-install.js");
    const result = await repairMissingConfiguredPluginInstalls({
      cfg: {
        tools: {
          web: {
            search: {
              enabled: false,
              provider: "brave",
            },
          },
        },
      },
      env: {
        BRAVE_API_KEY: "brave-key",
      },
    });

    expect(mocks.installPluginFromOriroHub).not.toHaveBeenCalled();
    expect(mocks.installPluginFromNpmSpec).not.toHaveBeenCalled();
    expect(mocks.writePersistedInstalledPluginIndexInstallRecords).not.toHaveBeenCalled();
    expect(result).toEqual({ changes: [], warnings: [], records: {} });
  });
});
