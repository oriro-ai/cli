// OriroHub lifecycle tests cover registry metadata lookup and error handling.
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTrackedTempDirs } from "../../test-utils/tracked-temp-dirs.js";

const fetchOriroHubSkillDetailMock = vi.fn();
const fetchOriroHubSkillInstallResolutionMock = vi.fn();
const fetchOriroHubSkillVerificationMock = vi.fn();
const downloadOriroHubSkillArchiveMock = vi.fn();
const downloadOriroHubSkillArchiveUrlMock = vi.fn();
const downloadOriroHubGitHubSkillArchiveMock = vi.fn();
const reportOriroHubSkillInstallTelemetryMock = vi.fn();
const resolveOriroHubBaseUrlMock = vi.fn(() => "https://orirohub.ai");
const isDefaultOriroHubBaseUrlMock = vi.fn((baseUrl?: string) => !baseUrl);
const searchOriroHubSkillsMock = vi.fn();
const archiveCleanupMock = vi.fn();
const withExtractedArchiveRootMock = vi.fn();
const installPackageDirMock = vi.fn();
const evaluateSkillInstallPolicyMock = vi.fn();
const pathExistsMock = vi.fn();
const tempDirs = createTrackedTempDirs();

vi.mock("../../infra/orirohub.js", () => ({
  fetchOriroHubSkillDetail: fetchOriroHubSkillDetailMock,
  fetchOriroHubSkillInstallResolution: fetchOriroHubSkillInstallResolutionMock,
  fetchOriroHubSkillVerification: fetchOriroHubSkillVerificationMock,
  downloadOriroHubSkillArchive: downloadOriroHubSkillArchiveMock,
  downloadOriroHubSkillArchiveUrl: downloadOriroHubSkillArchiveUrlMock,
  downloadOriroHubGitHubSkillArchive: downloadOriroHubGitHubSkillArchiveMock,
  reportOriroHubSkillInstallTelemetry: reportOriroHubSkillInstallTelemetryMock,
  isDefaultOriroHubBaseUrl: isDefaultOriroHubBaseUrlMock,
  resolveOriroHubBaseUrl: resolveOriroHubBaseUrlMock,
  searchOriroHubSkills: searchOriroHubSkillsMock,
}));

vi.mock("../../infra/install-flow.js", () => ({
  withExtractedArchiveRoot: withExtractedArchiveRootMock,
}));

vi.mock("../../infra/install-package-dir.js", () => ({
  installPackageDir: installPackageDirMock,
}));

vi.mock("../../plugins/install-security-scan.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../plugins/install-security-scan.js")>();
  return {
    ...actual,
    evaluateSkillInstallPolicy: (...args: unknown[]) => evaluateSkillInstallPolicyMock(...args),
  };
});

vi.mock("../../infra/fs-safe.js", () => ({
  pathExists: pathExistsMock,
}));

const {
  installSkillFromOriroHub,
  readVerifiedOriroHubSkillSourceUrl,
  resolveOriroHubSkillStatusLinkSync,
  resolveOriroHubSkillVerificationTarget,
  searchSkillsFromOriroHub,
  updateSkillsFromOriroHub,
} = await import("./orirohub.js");

// The code builds OS-native install paths (path.join → "C:\…\skills\x" on Windows,
// "/…/skills/x" on POSIX). Compare paths semantically — normalize separators and drop a
// leading drive letter — so these assertions hold on every platform, not just POSIX.
const normPath = (p: string | undefined) => (p ?? "").replace(/\\/g, "/").replace(/^[A-Za-z]:/, "");

function expectInstallPackageSourceDir(sourceDir: string) {
  const call = installPackageDirMock.mock.calls.at(0);
  if (!call) {
    throw new Error("expected installPackageDir call");
  }
  expect(normPath(call[0]?.sourceDir)).toBe(normPath(sourceDir));
}

function installPolicyInput() {
  const call = evaluateSkillInstallPolicyMock.mock.calls.at(0);
  if (!call) {
    throw new Error("expected evaluateSkillInstallPolicy call");
  }
  return call[0] as
    | {
        origin?: { registry?: string; slug?: string; ownerHandle?: string };
        requestedSpecifier?: string;
        source?: { kind?: string; authority?: string; mutable?: boolean; network?: boolean };
      }
    | undefined;
}

function expectInstalledSkill(
  result: Awaited<ReturnType<typeof installSkillFromOriroHub>>,
  expected: { slug?: string; version?: string; targetDir?: string } = {},
) {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`expected skill install success, got ${result.error}`);
  }
  if (expected.slug) {
    expect(result.slug).toBe(expected.slug);
  }
  if (expected.version) {
    expect(result.version).toBe(expected.version);
  }
  if (expected.targetDir) {
    expect(normPath(result.targetDir)).toBe(normPath(expected.targetDir));
  }
}

function expectInvalidSlug(result: Awaited<ReturnType<typeof installSkillFromOriroHub>>) {
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error("expected invalid slug failure");
  }
  expect(result.error).toContain("Invalid skill slug");
}

async function writeOriroHubOriginFixture(params: {
  workspaceDir: string;
  slug: string;
  originSlug?: string;
  ownerHandle?: string;
  registry?: string;
  installedVersion?: string;
  installedAt?: number;
  writeLock?: boolean;
}) {
  const skillDir = path.join(params.workspaceDir, "skills", params.slug);
  const registry = params.registry ?? "https://private.example.com/orirohub";
  const installedVersion = params.installedVersion ?? "1.2.3";
  const installedAt = params.installedAt ?? 123;
  await fs.mkdir(path.join(skillDir, ".orirohub"), { recursive: true });
  await fs.writeFile(
    path.join(skillDir, ".orirohub", "origin.json"),
    `${JSON.stringify(
      {
        version: 1,
        registry,
        slug: params.originSlug ?? params.slug,
        ...(params.ownerHandle ? { ownerHandle: params.ownerHandle } : {}),
        installedVersion,
        installedAt,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  if (params.writeLock !== false) {
    await fs.mkdir(path.join(params.workspaceDir, ".orirohub"), { recursive: true });
    await fs.writeFile(
      path.join(params.workspaceDir, ".orirohub", "lock.json"),
      `${JSON.stringify(
        {
          version: 1,
          skills: {
            [params.slug]: {
              version: installedVersion,
              installedAt,
              registry,
              ...(params.ownerHandle ? { ownerHandle: params.ownerHandle } : {}),
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
  }
  return skillDir;
}

describe("skills-orirohub", () => {
  afterEach(async () => {
    await tempDirs.cleanup();
  });

  beforeEach(() => {
    fetchOriroHubSkillDetailMock.mockReset();
    fetchOriroHubSkillInstallResolutionMock.mockReset();
    fetchOriroHubSkillVerificationMock.mockReset();
    downloadOriroHubSkillArchiveMock.mockReset();
    downloadOriroHubSkillArchiveUrlMock.mockReset();
    downloadOriroHubGitHubSkillArchiveMock.mockReset();
    reportOriroHubSkillInstallTelemetryMock.mockReset();
    resolveOriroHubBaseUrlMock.mockReset();
    isDefaultOriroHubBaseUrlMock.mockReset();
    searchOriroHubSkillsMock.mockReset();
    archiveCleanupMock.mockReset();
    withExtractedArchiveRootMock.mockReset();
    installPackageDirMock.mockReset();
    evaluateSkillInstallPolicyMock.mockReset();
    pathExistsMock.mockReset();

    resolveOriroHubBaseUrlMock.mockImplementation((baseUrl?: string) =>
      (baseUrl ?? "https://orirohub.ai").replace(/\/+$/, ""),
    );
    isDefaultOriroHubBaseUrlMock.mockImplementation((baseUrl?: string) => !baseUrl);
    pathExistsMock.mockImplementation(async (input: string) => input.endsWith("SKILL.md"));
    fetchOriroHubSkillDetailMock.mockResolvedValue({
      skill: {
        slug: "agentreceipt",
        displayName: "AgentReceipt",
        createdAt: 1,
        updatedAt: 2,
      },
      latestVersion: {
        version: "1.0.0",
        createdAt: 3,
      },
    });
    fetchOriroHubSkillInstallResolutionMock.mockResolvedValue({
      ok: true,
      slug: "agentreceipt",
      installKind: "archive",
      archive: {
        version: "1.0.0",
        downloadUrl: "https://orirohub.ai/api/v1/download?slug=agentreceipt&version=1.0.0",
      },
    });
    fetchOriroHubSkillVerificationMock.mockResolvedValue({
      schema: "orirohub.skill.verify.v1",
      ok: true,
      decision: "pass",
      reasons: [],
      card: { available: true, sha256: "card-sha" },
      artifact: { sourceFingerprint: "source-fp" },
      provenance: { source: "unavailable" },
      security: { status: "clean", signals: { staticScan: { engineVersion: "v2.4.24" } } },
      signature: { status: "unsigned" },
    });
    downloadOriroHubSkillArchiveMock.mockResolvedValue({
      archivePath: "/tmp/agentreceipt.zip",
      integrity: "sha256-test",
      sha256Hex: "a".repeat(64),
      artifact: "archive",
      cleanup: archiveCleanupMock,
    });
    downloadOriroHubSkillArchiveUrlMock.mockResolvedValue({
      archivePath: "/tmp/agentreceipt.zip",
      integrity: "sha256-test",
      sha256Hex: "a".repeat(64),
      artifact: "archive",
      cleanup: archiveCleanupMock,
    });
    downloadOriroHubGitHubSkillArchiveMock.mockResolvedValue({
      archivePath: "/tmp/github-agentreceipt.zip",
      integrity: "sha256-github-test",
      sha256Hex: "b".repeat(64),
      artifact: "archive",
      cleanup: archiveCleanupMock,
    });
    reportOriroHubSkillInstallTelemetryMock.mockResolvedValue(undefined);
    archiveCleanupMock.mockResolvedValue(undefined);
    searchOriroHubSkillsMock.mockResolvedValue([]);
    withExtractedArchiveRootMock.mockImplementation(async (params) => {
      expect(params.rootMarkers).toEqual(["SKILL.md", "skill.md", "skills.md", "SKILL.MD"]);
      return await params.onExtracted("/tmp/extracted-skill");
    });
    installPackageDirMock.mockResolvedValue({
      ok: true,
      targetDir: "/tmp/workspace/skills/agentreceipt",
    });
    evaluateSkillInstallPolicyMock.mockResolvedValue(undefined);
  });

  it("installs OriroHub skills from flat-root archives", async () => {
    const result = await installSkillFromOriroHub({
      workspaceDir: "/tmp/workspace",
      slug: "agentreceipt",
    });

    expect(fetchOriroHubSkillInstallResolutionMock).toHaveBeenCalledWith({
      slug: "agentreceipt",
      baseUrl: undefined,
    });
    expect(downloadOriroHubSkillArchiveUrlMock).toHaveBeenCalledWith({
      url: "https://orirohub.ai/api/v1/download?slug=agentreceipt&version=1.0.0",
      baseUrl: undefined,
    });
    expectInstallPackageSourceDir("/tmp/extracted-skill");
    expect(installPolicyInput()).toMatchObject({
      origin: { registry: "https://orirohub.ai" },
      source: { kind: "orirohub", authority: "oriro", mutable: false, network: true },
    });
    expectInstalledSkill(result, {
      slug: "agentreceipt",
      version: "1.0.0",
      targetDir: "/tmp/workspace/skills/agentreceipt",
    });
    expect(archiveCleanupMock).toHaveBeenCalledTimes(1);
    expect(reportOriroHubSkillInstallTelemetryMock).toHaveBeenCalledWith({
      baseUrl: undefined,
      root: "/tmp/workspace",
      skills: expect.objectContaining({
        agentreceipt: expect.objectContaining({
          version: "1.0.0",
          installedAt: expect.any(Number),
          registry: "https://orirohub.ai",
        }),
      }),
    });
    const telemetrySkills = reportOriroHubSkillInstallTelemetryMock.mock.calls[0]?.[0]?.skills as
      | Record<string, Record<string, unknown>>
      | undefined;
    expect(Object.keys(telemetrySkills?.agentreceipt ?? {}).toSorted()).toEqual([
      "installedAt",
      "registry",
      "version",
    ]);
  });

  it("installs owner-qualified OriroHub skills without using owner as a local path", async () => {
    const workspaceDir = await tempDirs.make("oriro-owner-skill-");
    installPackageDirMock.mockImplementationOnce(async (params: { targetDir: string }) => {
      await fs.mkdir(params.targetDir, { recursive: true });
      await fs.writeFile(path.join(params.targetDir, "SKILL.md"), "# Weather\n", "utf8");
      return { ok: true, targetDir: params.targetDir };
    });

    const result = await installSkillFromOriroHub({
      workspaceDir,
      slug: "@demo-owner/weather",
    });

    expect(fetchOriroHubSkillInstallResolutionMock).toHaveBeenCalledWith({
      slug: "weather",
      ownerHandle: "demo-owner",
      baseUrl: undefined,
    });
    expectInstallPackageSourceDir("/tmp/extracted-skill");
    expect(installPolicyInput()).toMatchObject({
      origin: {
        registry: "https://orirohub.ai",
        slug: "weather",
        ownerHandle: "demo-owner",
      },
      requestedSpecifier: "orirohub:@demo-owner/weather@1.0.0",
    });
    expectInstalledSkill(result, {
      slug: "weather",
      version: "1.0.0",
      targetDir: path.join(workspaceDir, "skills", "weather"),
    });
    await expect(fs.access(path.join(workspaceDir, "skills", "@demo-owner"))).rejects.toThrow();

    const lock = JSON.parse(
      await fs.readFile(path.join(workspaceDir, ".orirohub", "lock.json"), "utf8"),
    ) as { skills: Record<string, Record<string, unknown>> };
    expect(lock.skills.weather).toMatchObject({
      version: "1.0.0",
      registry: "https://orirohub.ai",
      ownerHandle: "demo-owner",
    });
    const origin = JSON.parse(
      await fs.readFile(
        path.join(workspaceDir, "skills", "weather", ".orirohub", "origin.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    expect(origin).toMatchObject({
      version: 1,
      registry: "https://orirohub.ai",
      slug: "weather",
      ownerHandle: "demo-owner",
      installedVersion: "1.0.0",
    });
  });

  it("formats ambiguous OriroHub slug responses with owner-qualified guidance", async () => {
    fetchOriroHubSkillInstallResolutionMock.mockResolvedValueOnce({
      ok: false,
      slug: "weather",
      reason: "ambiguous_slug",
      message: "Multiple OriroHub publishers provide weather.",
      status: 409,
    });

    const result = await installSkillFromOriroHub({
      workspaceDir: "/tmp/workspace",
      slug: "weather",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected ambiguous slug failure");
    }
    expect(result.error).toContain('Skill "weather" is ambiguous on OriroHub.');
    expect(result.error).toContain("oriro skills install @owner/weather");
    expect(result.error).toContain("Multiple OriroHub publishers provide weather.");
  });

  it("rejects malformed owner-qualified OriroHub install refs", async () => {
    const result = await installSkillFromOriroHub({
      workspaceDir: "/tmp/workspace",
      slug: "@@demo-owner/weather",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected invalid owner-qualified failure");
    }
    expect(result.error).toContain("Invalid OriroHub owner handle");
    expect(fetchOriroHubSkillInstallResolutionMock).not.toHaveBeenCalled();
  });

  it("persists install artifact and verification provenance in the OriroHub lockfile", async () => {
    const workspaceDir = await tempDirs.make("oriro-skills-lock-");
    const skillContent = "---\nname: agentreceipt\ndescription: Receipt helper\n---\n";
    const skillSha256 = createHash("sha256").update(skillContent).digest("hex");
    installPackageDirMock.mockImplementationOnce(async (params: { targetDir: string }) => {
      await fs.mkdir(params.targetDir, { recursive: true });
      await fs.writeFile(path.join(params.targetDir, "SKILL.md"), skillContent, "utf8");
      return { ok: true, targetDir: params.targetDir };
    });

    try {
      const result = await installSkillFromOriroHub({
        workspaceDir,
        slug: "agentreceipt",
      });

      expectInstalledSkill(result, {
        slug: "agentreceipt",
        version: "1.0.0",
        targetDir: path.join(workspaceDir, "skills", "agentreceipt"),
      });
      expect(fetchOriroHubSkillVerificationMock).toHaveBeenCalledWith({
        slug: "agentreceipt",
        version: "1.0.0",
        baseUrl: undefined,
      });
      const lock = JSON.parse(
        await fs.readFile(path.join(workspaceDir, ".orirohub", "lock.json"), "utf8"),
      ) as { skills: Record<string, Record<string, unknown>> };
      expect(lock.skills.agentreceipt).toMatchObject({
        version: "1.0.0",
        registry: "https://orirohub.ai",
        artifact: {
          kind: "archive",
          sha256: "a".repeat(64),
          integrity: "sha256-test",
        },
        skillFile: {
          path: "SKILL.md",
          sha256: skillSha256,
        },
        verification: {
          schema: "orirohub.skill.verify.v1",
          ok: true,
          decision: "pass",
          reasons: [],
          provenance: { source: "unavailable" },
          security: { status: "clean", signals: { staticScan: { engineVersion: "v2.4.24" } } },
        },
      });
      const origin = JSON.parse(
        await fs.readFile(
          path.join(workspaceDir, "skills", "agentreceipt", ".orirohub", "origin.json"),
          "utf8",
        ),
      ) as Record<string, unknown>;
      expect(origin).toMatchObject({
        version: 1,
        slug: "agentreceipt",
        installedVersion: "1.0.0",
        artifact: {
          kind: "archive",
          sha256: "a".repeat(64),
          integrity: "sha256-test",
        },
        skillFile: {
          path: "SKILL.md",
          sha256: skillSha256,
        },
      });
    } finally {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it("persists the source URL from server-resolved verification provenance", async () => {
    const workspaceDir = await tempDirs.make("oriro-skills-source-");
    const sourceUrl = "https://github.com/oriro/skills/tree/main/agentreceipt";
    const verifiedSourceUrl =
      "https://github.com/oriro/skills/tree/0123456789abcdef0123456789abcdef01234567/agentreceipt";
    fetchOriroHubSkillDetailMock.mockResolvedValueOnce({
      skill: {
        slug: "agentreceipt",
        displayName: "AgentReceipt",
        createdAt: 1,
        updatedAt: 2,
      },
      latestVersion: {
        version: "1.0.0",
        createdAt: 3,
      },
    });
    fetchOriroHubSkillVerificationMock.mockResolvedValueOnce({
      schema: "orirohub.skill.verify.v1",
      ok: true,
      decision: "pass",
      reasons: [],
      card: { available: true },
      artifact: { sourceFingerprint: "source-fp" },
      provenance: {
        source: "server-resolved-github-import",
        kind: "github",
        url: sourceUrl,
        repo: "oriro/skills",
        ref: "main",
        commit: "0123456789abcdef0123456789abcdef01234567",
        path: "agentreceipt",
        importedAt: 4,
      },
      security: { status: "clean" },
      signature: { status: "unsigned" },
    });
    installPackageDirMock.mockImplementationOnce(async (params: { targetDir: string }) => {
      await fs.mkdir(params.targetDir, { recursive: true });
      await fs.writeFile(path.join(params.targetDir, "SKILL.md"), "# AgentReceipt\n", "utf8");
      return { ok: true, targetDir: params.targetDir };
    });

    try {
      const result = await installSkillFromOriroHub({
        workspaceDir,
        slug: "agentreceipt",
        version: "1.0.0",
      });

      expectInstalledSkill(result, {
        slug: "agentreceipt",
        version: "1.0.0",
        targetDir: path.join(workspaceDir, "skills", "agentreceipt"),
      });
      const lock = JSON.parse(
        await fs.readFile(path.join(workspaceDir, ".orirohub", "lock.json"), "utf8"),
      ) as { skills: Record<string, Record<string, unknown>> };
      expect(lock.skills.agentreceipt).toMatchObject({
        sourceUrl: verifiedSourceUrl,
        verification: {
          provenance: {
            source: "server-resolved-github-import",
            kind: "github",
            url: sourceUrl,
            repo: "oriro/skills",
            ref: "main",
            commit: "0123456789abcdef0123456789abcdef01234567",
            path: "agentreceipt",
            importedAt: 4,
          },
        },
      });
      const origin = JSON.parse(
        await fs.readFile(
          path.join(workspaceDir, "skills", "agentreceipt", ".orirohub", "origin.json"),
          "utf8",
        ),
      ) as Record<string, unknown>;
      expect(origin.sourceUrl).toBe(verifiedSourceUrl);
    } finally {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it("requires a full commit SHA before promoting verified source provenance", () => {
    const baseProvenance = {
      source: "server-resolved-github-import",
      repo: "oriro/skills",
      path: "agentreceipt",
    };

    expect(
      readVerifiedOriroHubSkillSourceUrl({
        ...baseProvenance,
        commit: "0123456789abcdef0123456789abcdef01234567",
      }),
    ).toBe(
      "https://github.com/oriro/skills/tree/0123456789abcdef0123456789abcdef01234567/agentreceipt",
    );
    expect(
      readVerifiedOriroHubSkillSourceUrl({
        ...baseProvenance,
        commit: "main",
      }),
    ).toBeUndefined();
    expect(
      readVerifiedOriroHubSkillSourceUrl({
        ...baseProvenance,
        commit: "0123456",
      }),
    ).toBeUndefined();
  });

  it("does not treat detail metadata as verified source provenance", async () => {
    const workspaceDir = await tempDirs.make("oriro-skills-source-");
    fetchOriroHubSkillDetailMock.mockResolvedValueOnce({
      skill: {
        slug: "agentreceipt",
        displayName: "AgentReceipt",
        createdAt: 1,
        updatedAt: 2,
        sourceUrl: "https://github.com/oriro/skills/tree/latest/agentreceipt",
      },
      latestVersion: {
        version: "1.0.0",
        createdAt: 3,
        sourceUrl: "https://github.com/oriro/skills/tree/latest/agentreceipt",
      },
    });
    fetchOriroHubSkillVerificationMock.mockRejectedValueOnce(new Error("verification down"));
    installPackageDirMock.mockImplementationOnce(async (params: { targetDir: string }) => {
      await fs.mkdir(params.targetDir, { recursive: true });
      await fs.writeFile(path.join(params.targetDir, "SKILL.md"), "# AgentReceipt\n", "utf8");
      return { ok: true, targetDir: params.targetDir };
    });

    try {
      const result = await installSkillFromOriroHub({
        workspaceDir,
        slug: "agentreceipt",
        version: "1.0.0",
      });

      expectInstalledSkill(result, {
        slug: "agentreceipt",
        version: "1.0.0",
        targetDir: path.join(workspaceDir, "skills", "agentreceipt"),
      });
      const lock = JSON.parse(
        await fs.readFile(path.join(workspaceDir, ".orirohub", "lock.json"), "utf8"),
      ) as { skills: Record<string, Record<string, unknown>> };
      expect(lock.skills.agentreceipt?.sourceUrl).toBeUndefined();
      const origin = JSON.parse(
        await fs.readFile(
          path.join(workspaceDir, "skills", "agentreceipt", ".orirohub", "origin.json"),
          "utf8",
        ),
      ) as Record<string, unknown>;
      expect(origin.sourceUrl).toBeUndefined();
    } finally {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it("does not trust URLs from unavailable verification provenance", async () => {
    const workspaceDir = await tempDirs.make("oriro-skills-source-");
    fetchOriroHubSkillVerificationMock.mockResolvedValueOnce({
      schema: "orirohub.skill.verify.v1",
      ok: true,
      decision: "pass",
      reasons: [],
      card: { available: true },
      artifact: { sourceFingerprint: "source-fp" },
      provenance: {
        source: "unavailable",
        url: "https://github.com/oriro/skills/tree/unverified/agentreceipt",
      },
      security: { status: "clean" },
      signature: { status: "unsigned" },
    });
    installPackageDirMock.mockImplementationOnce(async (params: { targetDir: string }) => {
      await fs.mkdir(params.targetDir, { recursive: true });
      await fs.writeFile(path.join(params.targetDir, "SKILL.md"), "# AgentReceipt\n", "utf8");
      return { ok: true, targetDir: params.targetDir };
    });

    try {
      const result = await installSkillFromOriroHub({
        workspaceDir,
        slug: "agentreceipt",
        version: "1.0.0",
      });

      expectInstalledSkill(result, {
        slug: "agentreceipt",
        version: "1.0.0",
        targetDir: path.join(workspaceDir, "skills", "agentreceipt"),
      });
      const lock = JSON.parse(
        await fs.readFile(path.join(workspaceDir, ".orirohub", "lock.json"), "utf8"),
      ) as { skills: Record<string, Record<string, unknown>> };
      expect(lock.skills.agentreceipt?.sourceUrl).toBeUndefined();
      const origin = JSON.parse(
        await fs.readFile(
          path.join(workspaceDir, "skills", "agentreceipt", ".orirohub", "origin.json"),
          "utf8",
        ),
      ) as Record<string, unknown>;
      expect(origin.sourceUrl).toBeUndefined();
    } finally {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it("keeps installing when the OriroHub verification snapshot is unavailable", async () => {
    const workspaceDir = await tempDirs.make("oriro-skills-lock-");
    fetchOriroHubSkillVerificationMock.mockRejectedValueOnce(new Error("verification down"));
    installPackageDirMock.mockImplementationOnce(async (params: { targetDir: string }) => {
      await fs.mkdir(params.targetDir, { recursive: true });
      await fs.writeFile(path.join(params.targetDir, "SKILL.md"), "# AgentReceipt\n", "utf8");
      return { ok: true, targetDir: params.targetDir };
    });

    try {
      const result = await installSkillFromOriroHub({
        workspaceDir,
        slug: "agentreceipt",
      });

      expectInstalledSkill(result, { slug: "agentreceipt", version: "1.0.0" });
      const lock = JSON.parse(
        await fs.readFile(path.join(workspaceDir, ".orirohub", "lock.json"), "utf8"),
      ) as { skills: Record<string, Record<string, unknown>> };
      expect(lock.skills.agentreceipt?.verification).toBeUndefined();
      expect(lock.skills.agentreceipt?.artifact).toMatchObject({
        sha256: "a".repeat(64),
        integrity: "sha256-test",
      });
    } finally {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it("installs GitHub-backed OriroHub skills from the pinned resolver source path", async () => {
    const commit = "b".repeat(40);
    fetchOriroHubSkillInstallResolutionMock.mockResolvedValueOnce({
      ok: true,
      slug: "aiq-deploy",
      installKind: "github",
      github: {
        repo: "NVIDIA/skills",
        path: "skills/aiq-deploy",
        commit,
        contentHash: "hash-aiq-deploy",
        sourceUrl: `https://github.com/NVIDIA/skills/tree/${commit}/skills/aiq-deploy`,
      },
    });
    withExtractedArchiveRootMock.mockImplementationOnce(async (params) => {
      expect(params.rootMarkers).toBeUndefined();
      return await params.onExtracted("/tmp/extracted-github-repo");
    });
    installPackageDirMock.mockResolvedValueOnce({
      ok: true,
      targetDir: "/tmp/workspace/skills/aiq-deploy",
    });

    const result = await installSkillFromOriroHub({
      workspaceDir: "/tmp/workspace",
      slug: "aiq-deploy",
    });

    expect(fetchOriroHubSkillInstallResolutionMock).toHaveBeenCalledWith({
      slug: "aiq-deploy",
      baseUrl: undefined,
    });
    expect(downloadOriroHubGitHubSkillArchiveMock).toHaveBeenCalledWith({
      repo: "NVIDIA/skills",
      commit,
    });
    expectInstallPackageSourceDir("/tmp/extracted-github-repo/skills/aiq-deploy");
    expect(installPolicyInput()).toMatchObject({
      origin: {
        registry: "https://orirohub.ai",
        repo: "NVIDIA/skills",
        path: "skills/aiq-deploy",
        commit,
      },
      source: { kind: "git", authority: "third-party", mutable: false, network: true },
    });
    expectInstalledSkill(result, {
      slug: "aiq-deploy",
      version: commit,
      targetDir: "/tmp/workspace/skills/aiq-deploy",
    });
  });

  it("passes forceInstall to the OriroHub install resolver", async () => {
    const commit = "b".repeat(40);
    fetchOriroHubSkillInstallResolutionMock.mockResolvedValueOnce({
      ok: true,
      slug: "aiq-deploy",
      installKind: "github",
      github: {
        repo: "NVIDIA/skills",
        path: "skills/aiq-deploy",
        commit,
        contentHash: "hash-aiq-deploy",
        sourceUrl: `https://github.com/NVIDIA/skills/tree/${commit}/skills/aiq-deploy`,
      },
    });
    withExtractedArchiveRootMock.mockImplementationOnce(async (params) => {
      return await params.onExtracted("/tmp/extracted-github-repo");
    });
    installPackageDirMock.mockResolvedValueOnce({
      ok: true,
      targetDir: "/tmp/workspace/skills/aiq-deploy",
    });

    const result = await installSkillFromOriroHub({
      workspaceDir: "/tmp/workspace",
      slug: "aiq-deploy",
      forceInstall: true,
    });

    expect(fetchOriroHubSkillInstallResolutionMock).toHaveBeenCalledWith({
      slug: "aiq-deploy",
      baseUrl: undefined,
      forceInstall: true,
    });
    expectInstalledSkill(result, {
      slug: "aiq-deploy",
      version: commit,
      targetDir: "/tmp/workspace/skills/aiq-deploy",
    });
  });

  it("keeps OriroHub install telemetry best-effort", async () => {
    reportOriroHubSkillInstallTelemetryMock.mockRejectedValueOnce(new Error("telemetry down"));

    const result = await installSkillFromOriroHub({
      workspaceDir: "/tmp/workspace",
      slug: "agentreceipt",
    });

    expectInstalledSkill(result, {
      slug: "agentreceipt",
      version: "1.0.0",
    });
  });

  it("marks custom OriroHub skill registries as third-party install policy authority", async () => {
    const result = await installSkillFromOriroHub({
      workspaceDir: "/tmp/workspace",
      slug: "agentreceipt",
      baseUrl: "https://orirohub.internal.example",
    });

    expectInstalledSkill(result, {
      slug: "agentreceipt",
      version: "1.0.0",
    });
    expect(installPolicyInput()).toMatchObject({
      origin: { registry: "https://orirohub.internal.example" },
      source: { kind: "orirohub", authority: "third-party", mutable: false, network: true },
    });
  });

  it.each(["skill.md", "skills.md", "SKILL.MD"])(
    "installs OriroHub archives whose packed root uses legacy marker %s",
    async (marker) => {
      pathExistsMock.mockImplementation(async (input: string) => input.endsWith(marker));

      const result = await installSkillFromOriroHub({
        workspaceDir: "/tmp/workspace",
        slug: "agentreceipt",
      });

      expectInstalledSkill(result);
      expectInstallPackageSourceDir("/tmp/extracted-skill");
    },
  );

  it("updates owner-qualified OriroHub skills with the stored owner namespace", async () => {
    const workspaceDir = await tempDirs.make("oriro-owner-update-");
    await writeOriroHubOriginFixture({
      workspaceDir,
      slug: "weather",
      ownerHandle: "demo-owner",
      registry: "https://private.example.com/orirohub",
      installedVersion: "0.9.0",
    });
    fetchOriroHubSkillInstallResolutionMock.mockResolvedValueOnce({
      ok: true,
      slug: "weather",
      installKind: "archive",
      archive: {
        version: "1.0.0",
        downloadUrl:
          "https://private.example.com/orirohub/api/v1/download?slug=weather&ownerHandle=demo-owner&version=1.0.0",
      },
    });
    installPackageDirMock.mockImplementationOnce(async (params: { targetDir: string }) => {
      await fs.mkdir(params.targetDir, { recursive: true });
      await fs.writeFile(path.join(params.targetDir, "SKILL.md"), "# Weather\n", "utf8");
      return { ok: true, targetDir: params.targetDir };
    });

    const results = await updateSkillsFromOriroHub({
      workspaceDir,
      slug: "weather",
    });

    expect(fetchOriroHubSkillInstallResolutionMock).toHaveBeenCalledWith({
      slug: "weather",
      ownerHandle: "demo-owner",
      baseUrl: "https://private.example.com/orirohub",
    });
    expect(fetchOriroHubSkillVerificationMock).toHaveBeenCalledWith({
      slug: "weather",
      ownerHandle: "demo-owner",
      version: "1.0.0",
      baseUrl: "https://private.example.com/orirohub",
    });
    expect(results).toEqual([
      {
        ok: true,
        slug: "weather",
        previousVersion: "0.9.0",
        version: "1.0.0",
        changed: true,
        targetDir: path.join(workspaceDir, "skills", "weather"),
      },
    ]);
    const lock = JSON.parse(
      await fs.readFile(path.join(workspaceDir, ".orirohub", "lock.json"), "utf8"),
    ) as { skills: Record<string, Record<string, unknown>> };
    expect(lock.skills.weather?.ownerHandle).toBe("demo-owner");
  });

  it("updates owner-qualified OriroHub skills when the requested owner matches tracking", async () => {
    const workspaceDir = await tempDirs.make("oriro-owner-update-request-");
    await writeOriroHubOriginFixture({
      workspaceDir,
      slug: "weather",
      ownerHandle: "demo-owner",
      installedVersion: "0.9.0",
    });
    fetchOriroHubSkillInstallResolutionMock.mockResolvedValueOnce({
      ok: true,
      slug: "weather",
      installKind: "archive",
      archive: {
        version: "1.0.0",
        downloadUrl:
          "https://orirohub.ai/api/v1/download?slug=weather&ownerHandle=demo-owner&version=1.0.0",
      },
    });
    installPackageDirMock.mockImplementationOnce(async (params: { targetDir: string }) => {
      await fs.mkdir(params.targetDir, { recursive: true });
      await fs.writeFile(path.join(params.targetDir, "SKILL.md"), "# Weather\n", "utf8");
      return { ok: true, targetDir: params.targetDir };
    });

    const results = await updateSkillsFromOriroHub({
      workspaceDir,
      slug: "@demo-owner/weather",
    });

    expect(fetchOriroHubSkillInstallResolutionMock).toHaveBeenCalledWith({
      slug: "weather",
      ownerHandle: "demo-owner",
      baseUrl: "https://private.example.com/orirohub",
    });
    expect(results).toEqual([
      expect.objectContaining({
        ok: true,
        slug: "weather",
        previousVersion: "0.9.0",
        version: "1.0.0",
      }),
    ]);
  });

  it("rejects owner-qualified OriroHub updates when the requested owner does not match tracking", async () => {
    const workspaceDir = await tempDirs.make("oriro-owner-update-mismatch-");
    await writeOriroHubOriginFixture({
      workspaceDir,
      slug: "weather",
      ownerHandle: "other-owner",
      installedVersion: "0.9.0",
    });

    await expect(
      updateSkillsFromOriroHub({
        workspaceDir,
        slug: "@demo-owner/weather",
      }),
    ).rejects.toThrow(
      'Skill "weather" is tracked as @other-owner/weather, not @demo-owner/weather.',
    );
    expect(fetchOriroHubSkillInstallResolutionMock).not.toHaveBeenCalled();
  });

  describe("legacy tracked slugs remain updatable", () => {
    async function createLegacyTrackedSkillFixture(slug: string) {
      const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "oriro-skills-orirohub-"));
      const skillDir = path.join(workspaceDir, "skills", slug);
      await fs.mkdir(path.join(skillDir, ".orirohub"), { recursive: true });
      await fs.mkdir(path.join(workspaceDir, ".orirohub"), { recursive: true });
      await fs.writeFile(
        path.join(skillDir, ".orirohub", "origin.json"),
        `${JSON.stringify(
          {
            version: 1,
            registry: "https://legacy.orirohub.ai",
            slug,
            installedVersion: "0.9.0",
            installedAt: 123,
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
      await fs.writeFile(
        path.join(workspaceDir, ".orirohub", "lock.json"),
        `${JSON.stringify(
          {
            version: 1,
            skills: {
              [slug]: {
                version: "0.9.0",
                installedAt: 123,
              },
            },
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
      return { workspaceDir, skillDir };
    }

    function expectLegacyUpdateSuccess(results: unknown, workspaceDir: string, slug: string) {
      expect(Array.isArray(results)).toBe(true);
      const first = (results as Array<Record<string, unknown>>)[0];
      expect(first?.ok).toBe(true);
      expect(first?.slug).toBe(slug);
      expect(first?.previousVersion).toBe("0.9.0");
      expect(first?.version).toBe("1.0.0");
      expect(first?.targetDir).toBe(path.join(workspaceDir, "skills", slug));
    }

    it("updates all tracked legacy Unicode slugs in place", async () => {
      const slug = "re\u0430ct";
      const { workspaceDir } = await createLegacyTrackedSkillFixture(slug);
      fetchOriroHubSkillInstallResolutionMock.mockResolvedValueOnce({
        ok: true,
        slug,
        installKind: "archive",
        archive: {
          version: "1.0.0",
          downloadUrl: `https://legacy.orirohub.ai/api/v1/download?slug=${encodeURIComponent(slug)}&version=1.0.0`,
        },
      });
      installPackageDirMock.mockResolvedValueOnce({
        ok: true,
        targetDir: path.join(workspaceDir, "skills", slug),
      });

      try {
        const results = await updateSkillsFromOriroHub({
          workspaceDir,
        });

        expect(fetchOriroHubSkillInstallResolutionMock).toHaveBeenCalledWith({
          slug,
          baseUrl: "https://legacy.orirohub.ai",
        });
        expect(downloadOriroHubSkillArchiveUrlMock).toHaveBeenCalledWith({
          url: `https://legacy.orirohub.ai/api/v1/download?slug=${encodeURIComponent(slug)}&version=1.0.0`,
          baseUrl: "https://legacy.orirohub.ai",
        });
        expectLegacyUpdateSuccess(results, workspaceDir, slug);
      } finally {
        await fs.rm(workspaceDir, { recursive: true, force: true });
      }
    });

    it("passes forceInstall to resolver for tracked updates", async () => {
      const slug = "agentreceipt";
      const { workspaceDir } = await createLegacyTrackedSkillFixture(slug);
      fetchOriroHubSkillInstallResolutionMock.mockResolvedValueOnce({
        ok: true,
        slug,
        installKind: "archive",
        archive: {
          version: "1.0.0",
          downloadUrl: `https://legacy.orirohub.ai/api/v1/download?slug=${encodeURIComponent(slug)}&version=1.0.0`,
        },
      });
      installPackageDirMock.mockResolvedValueOnce({
        ok: true,
        targetDir: path.join(workspaceDir, "skills", slug),
      });

      try {
        const results = await updateSkillsFromOriroHub({
          workspaceDir,
          forceInstall: true,
        });

        expect(fetchOriroHubSkillInstallResolutionMock).toHaveBeenCalledWith({
          slug,
          baseUrl: "https://legacy.orirohub.ai",
          forceInstall: true,
        });
        expectLegacyUpdateSuccess(results, workspaceDir, slug);
      } finally {
        await fs.rm(workspaceDir, { recursive: true, force: true });
      }
    });

    it("updates a legacy Unicode slug when requested explicitly", async () => {
      const slug = "re\u0430ct";
      const { workspaceDir } = await createLegacyTrackedSkillFixture(slug);
      installPackageDirMock.mockResolvedValueOnce({
        ok: true,
        targetDir: path.join(workspaceDir, "skills", slug),
      });

      try {
        const results = await updateSkillsFromOriroHub({
          workspaceDir,
          slug,
        });

        expectLegacyUpdateSuccess(results, workspaceDir, slug);
      } finally {
        await fs.rm(workspaceDir, { recursive: true, force: true });
      }
    });

    it("still rejects an untracked Unicode slug passed to update", async () => {
      const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "oriro-skills-orirohub-"));

      try {
        await expect(
          updateSkillsFromOriroHub({
            workspaceDir,
            slug: "re\u0430ct",
          }),
        ).rejects.toThrow("Invalid skill slug");
      } finally {
        await fs.rm(workspaceDir, { recursive: true, force: true });
      }
    });
  });

  describe("normalizeSlug rejects non-ASCII homograph slugs", () => {
    it("rejects Cyrillic homograph 'а' (U+0430) in slug", async () => {
      const result = await installSkillFromOriroHub({
        workspaceDir: "/tmp/workspace",
        slug: "re\u0430ct",
      });
      expectInvalidSlug(result);
    });

    it("rejects Cyrillic homograph 'е' (U+0435) in slug", async () => {
      const result = await installSkillFromOriroHub({
        workspaceDir: "/tmp/workspace",
        slug: "r\u0435act",
      });
      expectInvalidSlug(result);
    });

    it("rejects Cyrillic homograph 'о' (U+043E) in slug", async () => {
      const result = await installSkillFromOriroHub({
        workspaceDir: "/tmp/workspace",
        slug: "t\u043Edo",
      });
      expectInvalidSlug(result);
    });

    it("rejects slug with mixed Unicode and ASCII", async () => {
      const result = await installSkillFromOriroHub({
        workspaceDir: "/tmp/workspace",
        slug: "cаlеndаr",
      });
      expectInvalidSlug(result);
    });

    it("rejects slug with non-Latin scripts", async () => {
      const result = await installSkillFromOriroHub({
        workspaceDir: "/tmp/workspace",
        slug: "技能",
      });
      expectInvalidSlug(result);
    });

    it("rejects Unicode that case-folds to ASCII (Kelvin sign U+212A)", async () => {
      // "\u212A" (Kelvin sign) lowercases to "k" — must be caught before lowercasing
      const result = await installSkillFromOriroHub({
        workspaceDir: "/tmp/workspace",
        slug: "\u212Aalendar",
      });
      expectInvalidSlug(result);
    });

    it("rejects slug starting with a hyphen", async () => {
      const result = await installSkillFromOriroHub({
        workspaceDir: "/tmp/workspace",
        slug: "-calendar",
      });
      expectInvalidSlug(result);
    });

    it("rejects slug ending with a hyphen", async () => {
      const result = await installSkillFromOriroHub({
        workspaceDir: "/tmp/workspace",
        slug: "calendar-",
      });
      expectInvalidSlug(result);
    });

    it("accepts uppercase ASCII slugs (preserves original casing behavior)", async () => {
      const result = await installSkillFromOriroHub({
        workspaceDir: "/tmp/workspace",
        slug: "React",
      });
      expectInstalledSkill(result);
    });

    it("accepts valid lowercase ASCII slugs", async () => {
      const result = await installSkillFromOriroHub({
        workspaceDir: "/tmp/workspace",
        slug: "calendar-2",
      });
      expectInstalledSkill(result);
    });
  });

  describe("verification target resolution", () => {
    it("uses installed origin registry and installed version by default", async () => {
      const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "oriro-skill-verify-"));
      try {
        const skillDir = await writeOriroHubOriginFixture({
          workspaceDir,
          slug: "agentreceipt",
          registry: "https://private.example.com/orirohub/",
          installedVersion: "2.0.0",
        });

        await expect(
          resolveOriroHubSkillVerificationTarget({
            workspaceDir,
            slug: "agentreceipt",
          }),
        ).resolves.toEqual({
          ok: true,
          slug: "agentreceipt",
          baseUrl: "https://private.example.com/orirohub",
          version: "2.0.0",
          tag: undefined,
          resolution: {
            source: "installed",
            selector: "installed-version",
            registry: "https://private.example.com/orirohub",
            skillDir,
            installedVersion: "2.0.0",
          },
        });
      } finally {
        await fs.rm(workspaceDir, { recursive: true, force: true });
      }
    });

    it("uses installed owner namespace when resolving owner-qualified verification targets", async () => {
      const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "oriro-skill-verify-"));
      try {
        await writeOriroHubOriginFixture({
          workspaceDir,
          slug: "weather",
          ownerHandle: "demo-owner",
          registry: "https://private.example.com/orirohub",
          installedVersion: "2.0.0",
        });

        await expect(
          resolveOriroHubSkillVerificationTarget({
            workspaceDir,
            slug: "weather",
          }),
        ).resolves.toMatchObject({
          ok: true,
          slug: "weather",
          ownerHandle: "demo-owner",
          baseUrl: "https://private.example.com/orirohub",
          version: "2.0.0",
          tag: undefined,
          resolution: {
            source: "installed",
            selector: "installed-version",
            registry: "https://private.example.com/orirohub",
            installedVersion: "2.0.0",
          },
        });
      } finally {
        await fs.rm(workspaceDir, { recursive: true, force: true });
      }
    });

    it("keeps the installed registry when an explicit version overrides the installed version", async () => {
      const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "oriro-skill-verify-"));
      try {
        await writeOriroHubOriginFixture({
          workspaceDir,
          slug: "agentreceipt",
          registry: "https://private.example.com/orirohub",
          installedVersion: "2.0.0",
        });

        await expect(
          resolveOriroHubSkillVerificationTarget({
            workspaceDir,
            slug: "agentreceipt",
            version: "2.1.0",
            baseUrl: "https://orirohub.ai",
          }),
        ).resolves.toMatchObject({
          ok: true,
          slug: "agentreceipt",
          baseUrl: "https://private.example.com/orirohub",
          version: "2.1.0",
          tag: undefined,
          resolution: {
            source: "installed",
            selector: "version",
            registry: "https://private.example.com/orirohub",
            installedVersion: "2.0.0",
          },
        });
      } finally {
        await fs.rm(workspaceDir, { recursive: true, force: true });
      }
    });

    it("keeps the installed registry when an explicit tag is provided", async () => {
      const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "oriro-skill-verify-"));
      try {
        await writeOriroHubOriginFixture({
          workspaceDir,
          slug: "agentreceipt",
          registry: "https://private.example.com/orirohub",
          installedVersion: "2.0.0",
        });

        await expect(
          resolveOriroHubSkillVerificationTarget({
            workspaceDir,
            slug: "agentreceipt",
            tag: "beta",
            baseUrl: "https://orirohub.ai",
          }),
        ).resolves.toMatchObject({
          ok: true,
          slug: "agentreceipt",
          baseUrl: "https://private.example.com/orirohub",
          version: undefined,
          tag: "beta",
          resolution: {
            source: "installed",
            selector: "tag",
            registry: "https://private.example.com/orirohub",
            installedVersion: "2.0.0",
          },
        });
      } finally {
        await fs.rm(workspaceDir, { recursive: true, force: true });
      }
    });

    it("rejects installed owner namespace metadata that does not match lock tracking", async () => {
      const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "oriro-skill-verify-"));
      try {
        await writeOriroHubOriginFixture({
          workspaceDir,
          slug: "weather",
          ownerHandle: "demo-owner",
        });
        const lockPath = path.join(workspaceDir, ".orirohub", "lock.json");
        const lock = JSON.parse(await fs.readFile(lockPath, "utf8")) as {
          skills: Record<string, { ownerHandle?: string }>;
        };
        lock.skills.weather.ownerHandle = "other-owner";
        await fs.writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`, "utf8");

        const result = await resolveOriroHubSkillVerificationTarget({
          workspaceDir,
          slug: "weather",
        });

        expect(result.ok).toBe(false);
        if (result.ok) {
          throw new Error("expected owner mismatch failure");
        }
        expect(result.error).toContain("origin metadata does not match");
      } finally {
        await fs.rm(workspaceDir, { recursive: true, force: true });
      }
    });

    it("rejects installed origin metadata without workspace lock tracking", async () => {
      const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "oriro-skill-verify-"));
      try {
        await writeOriroHubOriginFixture({
          workspaceDir,
          slug: "agentreceipt",
          writeLock: false,
        });

        const result = await resolveOriroHubSkillVerificationTarget({
          workspaceDir,
          slug: "agentreceipt",
        });

        expect(result.ok).toBe(false);
        if (result.ok) {
          throw new Error("expected untracked origin failure");
        }
        expect(result.error).toContain("not tracked by the workspace OriroHub lockfile");
      } finally {
        await fs.rm(workspaceDir, { recursive: true, force: true });
      }
    });

    it("rejects installed origin metadata for a different skill slug", async () => {
      const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "oriro-skill-verify-"));
      try {
        await writeOriroHubOriginFixture({
          workspaceDir,
          slug: "agentreceipt",
          originSlug: "trusted-skill",
        });

        const result = await resolveOriroHubSkillVerificationTarget({
          workspaceDir,
          slug: "agentreceipt",
        });

        expect(result.ok).toBe(false);
        if (result.ok) {
          throw new Error("expected slug mismatch failure");
        }
        expect(result.error).toContain('origin metadata for "trusted-skill"');
      } finally {
        await fs.rm(workspaceDir, { recursive: true, force: true });
      }
    });

    it("rejects installed origin metadata that does not match lock tracking", async () => {
      const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "oriro-skill-verify-"));
      try {
        await writeOriroHubOriginFixture({
          workspaceDir,
          slug: "agentreceipt",
          installedVersion: "2.0.0",
          installedAt: 123,
        });
        const lockPath = path.join(workspaceDir, ".orirohub", "lock.json");
        const lock = JSON.parse(await fs.readFile(lockPath, "utf8")) as {
          skills: Record<string, { version: string; installedAt: number; registry: string }>;
        };
        lock.skills.agentreceipt = {
          ...lock.skills.agentreceipt,
          version: "1.0.0",
        };
        await fs.writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`, "utf8");

        const result = await resolveOriroHubSkillVerificationTarget({
          workspaceDir,
          slug: "agentreceipt",
        });

        expect(result.ok).toBe(false);
        if (result.ok) {
          throw new Error("expected lock mismatch failure");
        }
        expect(result.error).toContain("does not match the workspace OriroHub lockfile");
      } finally {
        await fs.rm(workspaceDir, { recursive: true, force: true });
      }
    });

    it("rejects installed origin metadata when lock registry disagrees", async () => {
      const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "oriro-skill-verify-"));
      try {
        await writeOriroHubOriginFixture({
          workspaceDir,
          slug: "agentreceipt",
          registry: "https://origin.example.com/orirohub",
          installedVersion: "2.0.0",
          installedAt: 123,
        });
        const lockPath = path.join(workspaceDir, ".orirohub", "lock.json");
        const lock = JSON.parse(await fs.readFile(lockPath, "utf8")) as {
          skills: Record<string, { version: string; installedAt: number; registry: string }>;
        };
        lock.skills.agentreceipt = {
          ...lock.skills.agentreceipt,
          registry: "https://other.example.com/orirohub",
        };
        await fs.writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`, "utf8");

        const result = await resolveOriroHubSkillVerificationTarget({
          workspaceDir,
          slug: "agentreceipt",
        });

        expect(result.ok).toBe(false);
        if (result.ok) {
          throw new Error("expected registry mismatch failure");
        }
        expect(result.error).toContain("does not match the workspace OriroHub lockfile");
      } finally {
        await fs.rm(workspaceDir, { recursive: true, force: true });
      }
    });

    it("rejects lock-tracked installed skills without origin metadata", async () => {
      const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "oriro-skill-verify-"));
      try {
        await fs.mkdir(path.join(workspaceDir, ".orirohub"), { recursive: true });
        await fs.writeFile(
          path.join(workspaceDir, ".orirohub", "lock.json"),
          `${JSON.stringify(
            {
              version: 1,
              skills: {
                agentreceipt: {
                  version: "2.0.0",
                  installedAt: 123,
                  registry: "https://private.example.com/orirohub",
                },
              },
            },
            null,
            2,
          )}\n`,
          "utf8",
        );

        const result = await resolveOriroHubSkillVerificationTarget({
          workspaceDir,
          slug: "agentreceipt",
        });

        expect(result.ok).toBe(false);
        if (result.ok) {
          throw new Error("expected missing origin failure");
        }
        expect(result.error).toContain("missing OriroHub origin metadata");
      } finally {
        await fs.rm(workspaceDir, { recursive: true, force: true });
      }
    });

    it("rejects malformed workspace locks before registry fallback", async () => {
      const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "oriro-skill-verify-"));
      try {
        await fs.mkdir(path.join(workspaceDir, ".orirohub"), { recursive: true });
        await fs.writeFile(path.join(workspaceDir, ".orirohub", "lock.json"), "{not json", "utf8");

        const result = await resolveOriroHubSkillVerificationTarget({
          workspaceDir,
          slug: "agentreceipt",
        });

        expect(result.ok).toBe(false);
        if (result.ok) {
          throw new Error("expected malformed lock failure");
        }
        expect(result.error).toContain("Malformed workspace OriroHub lockfile");
      } finally {
        await fs.rm(workspaceDir, { recursive: true, force: true });
      }
    });

    it("uses the configured registry and latest selector for uninstalled skills", async () => {
      const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "oriro-skill-verify-"));
      resolveOriroHubBaseUrlMock.mockReturnValueOnce("https://configured.example.com/orirohub");
      try {
        await expect(
          resolveOriroHubSkillVerificationTarget({
            workspaceDir,
            slug: "agentreceipt",
            baseUrl: "https://configured.example.com/orirohub/",
          }),
        ).resolves.toEqual({
          ok: true,
          slug: "agentreceipt",
          baseUrl: "https://configured.example.com/orirohub",
          version: undefined,
          tag: undefined,
          resolution: {
            source: "registry",
            selector: "latest",
            registry: "https://configured.example.com/orirohub",
            skillDir: undefined,
            installedVersion: undefined,
          },
        });
      } finally {
        await fs.rm(workspaceDir, { recursive: true, force: true });
      }
    });

    it("fails clearly when installed origin metadata is malformed", async () => {
      const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "oriro-skill-verify-"));
      try {
        const skillDir = path.join(workspaceDir, "skills", "agentreceipt");
        await fs.mkdir(path.join(skillDir, ".orirohub"), { recursive: true });
        await fs.writeFile(path.join(skillDir, ".orirohub", "origin.json"), "{not json", "utf8");

        const result = await resolveOriroHubSkillVerificationTarget({
          workspaceDir,
          slug: "agentreceipt",
        });

        expect(result.ok).toBe(false);
        if (result.ok) {
          throw new Error("expected malformed origin failure");
        }
        expect(result.error).toContain("Malformed OriroHub origin metadata");
        expect(result.error).toContain(path.join(skillDir, ".orirohub", "origin.json"));
      } finally {
        await fs.rm(workspaceDir, { recursive: true, force: true });
      }
    });

    it("fails clearly for invalid slugs and conflicting selectors", async () => {
      await expect(
        resolveOriroHubSkillVerificationTarget({
          workspaceDir: "/tmp/workspace",
          slug: "bad/slug",
        }),
      ).resolves.toMatchObject({
        ok: false,
        error: "Invalid skill slug: bad/slug",
      });

      await expect(
        resolveOriroHubSkillVerificationTarget({
          workspaceDir: "/tmp/workspace",
          slug: "agentreceipt",
          version: "1.0.0",
          tag: "latest",
        }),
      ).resolves.toMatchObject({
        ok: false,
        error: "Use either --version or --tag.",
      });
    });
  });

  it("uses search for browse-all skill discovery", async () => {
    searchOriroHubSkillsMock.mockResolvedValueOnce([
      {
        score: 1,
        slug: "calendar",
        displayName: "Calendar",
        summary: "Calendar skill",
        version: "1.2.3",
        updatedAt: 123,
      },
    ]);

    await expect(searchSkillsFromOriroHub({ limit: 20 })).resolves.toEqual([
      {
        score: 1,
        slug: "calendar",
        displayName: "Calendar",
        summary: "Calendar skill",
        version: "1.2.3",
        updatedAt: 123,
      },
    ]);
    expect(searchOriroHubSkillsMock).toHaveBeenCalledWith({
      query: "*",
      limit: 20,
      baseUrl: undefined,
    });
  });
});

describe("OriroHub origin provenance readback", () => {
  async function writeOriginWithProvenance(params: {
    workspaceDir: string;
    slug: string;
    origin: Record<string, unknown>;
    lockSkill?: Record<string, unknown>;
  }) {
    const skillDir = path.join(params.workspaceDir, "skills", params.slug);
    await fs.mkdir(path.join(skillDir, ".orirohub"), { recursive: true });
    await fs.writeFile(path.join(skillDir, "SKILL.md"), "# Skill\n", "utf8");
    await fs.writeFile(
      path.join(skillDir, ".orirohub", "origin.json"),
      `${JSON.stringify(params.origin, null, 2)}\n`,
      "utf8",
    );
    await fs.mkdir(path.join(params.workspaceDir, ".orirohub"), { recursive: true });
    await fs.writeFile(
      path.join(params.workspaceDir, ".orirohub", "lock.json"),
      `${JSON.stringify(
        {
          version: 1,
          skills: {
            [params.slug]: params.lockSkill ?? {
              version: params.origin.installedVersion,
              installedAt: params.origin.installedAt,
              registry: params.origin.registry,
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    return skillDir;
  }

  it("restores matching provenance and rejects one-sided origin edits", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "oriro-origin-prov-"));
    try {
      const artifact = {
        kind: "oriropack" as const,
        sha256: "a".repeat(64),
        integrity: "sha256-test",
      };
      const skillFile = { path: "SKILL.md", sha256: "b".repeat(64) };
      const sourceUrl = "https://github.com/acme/skills/tree/abc/agentreceipt";
      const origin = {
        version: 1,
        registry: "https://orirohub.ai",
        slug: "agentreceipt",
        installedVersion: "1.0.0",
        installedAt: 123,
        sourceUrl,
        artifact,
        skillFile,
      };
      const skillDir = await writeOriginWithProvenance({
        workspaceDir,
        slug: "agentreceipt",
        origin,
        lockSkill: {
          version: "1.0.0",
          installedAt: 123,
          registry: "https://orirohub.ai",
          sourceUrl,
          artifact,
          skillFile,
        },
      });

      const link = resolveOriroHubSkillStatusLinkSync({
        workspaceDir,
        skillDir,
        skillKey: "agentreceipt",
      });

      expect(link?.status).toBe("linked");
      expect(link?.valid).toBe(true);
      if (link?.status !== "linked") {
        throw new Error(`expected linked status, got ${link?.status}`);
      }
      expect(link.artifact).toEqual(artifact);
      expect(link.skillFile).toEqual(skillFile);
      expect(link.sourceUrl).toBe(sourceUrl);

      const originPath = path.join(skillDir, ".orirohub", "origin.json");
      for (const override of [
        { sourceUrl: "https://github.com/acme/skills/tree/tampered/agentreceipt" },
        {
          artifact: {
            kind: "oriropack",
            sha256: "c".repeat(64),
            integrity: "sha256-tampered",
          },
        },
        { skillFile: { path: "SKILL.md", sha256: "d".repeat(64) } },
      ]) {
        await fs.writeFile(
          originPath,
          `${JSON.stringify({ ...origin, ...override }, null, 2)}\n`,
          "utf8",
        );
        expect(
          resolveOriroHubSkillStatusLinkSync({
            workspaceDir,
            skillDir,
            skillKey: "agentreceipt",
          }),
        ).toMatchObject({
          status: "invalid",
          valid: false,
          reason: expect.stringContaining("does not match the workspace OriroHub lockfile"),
        });
      }
    } finally {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it("drops malformed provenance fields while keeping the link valid", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "oriro-origin-prov-"));
    try {
      const skillDir = await writeOriginWithProvenance({
        workspaceDir,
        slug: "agentreceipt",
        origin: {
          version: 1,
          registry: "https://orirohub.ai",
          slug: "agentreceipt",
          installedVersion: "1.0.0",
          installedAt: 123,
          sourceUrl: "   ",
          artifact: { kind: "bogus", sha256: 42, integrity: "" },
          skillFile: { path: "", sha256: "c".repeat(64) },
        },
      });

      const link = resolveOriroHubSkillStatusLinkSync({
        workspaceDir,
        skillDir,
        skillKey: "agentreceipt",
      });

      expect(link?.status).toBe("linked");
      if (link?.status !== "linked") {
        throw new Error(`expected linked status, got ${link?.status}`);
      }
      expect(link.artifact).toBeUndefined();
      expect(link.skillFile).toBeUndefined();
      expect(link.sourceUrl).toBeUndefined();
    } finally {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    }
  });
});
