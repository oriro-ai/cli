// Plugin OriroHub release tests validate plugin release metadata and artifacts.
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { delimiter, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildOriroReleaseOriroHubPlan,
  buildOriroReleaseOriroHubRuntimeState,
  parseOriroReleaseOriroHubPlanArgs,
} from "../scripts/lib/oriro-release-orirohub-plan.ts";
import {
  collectOriroHubPublishablePluginPackages,
  collectOriroHubVersionGateErrors,
  collectPluginOriroHubReleasePathsFromGitRange,
  collectPluginOriroHubReleasePlan,
  resolveChangedOriroHubPublishablePluginPackages,
  resolveSelectedOriroHubPublishablePluginPackages,
  type PublishablePluginPackage,
} from "../scripts/lib/plugin-orirohub-release.ts";
import {
  collectPublishablePluginPackages,
  ORIRO_PLUGIN_NPM_REPOSITORY_URL,
} from "../scripts/lib/plugin-npm-release.ts";
import { cleanupTempDirs, makeTempRepoRoot } from "./helpers/temp-repo.js";

const tempDirs: string[] = [];

afterEach(() => {
  cleanupTempDirs(tempDirs);
});

describe("resolveChangedOriroHubPublishablePluginPackages", () => {
  const publishablePlugins: PublishablePluginPackage[] = [
    {
      extensionId: "feishu",
      packageDir: "extensions/feishu",
      packageName: "@oriro/feishu",
      version: "2026.4.1",
      channel: "stable",
      publishTag: "latest",
    },
    {
      extensionId: "zalo",
      packageDir: "extensions/zalo",
      packageName: "@oriro/zalo",
      version: "2026.4.1-beta.1",
      channel: "beta",
      publishTag: "beta",
    },
  ];

  it("ignores shared release-tooling changes", () => {
    expect(
      resolveChangedOriroHubPublishablePluginPackages({
        plugins: publishablePlugins,
        changedPaths: ["pnpm-lock.yaml"],
      }),
    ).toStrictEqual([]);
  });
});

describe("collectOriroHubPublishablePluginPackages", () => {
  it("requires the OriroHub external plugin contract", () => {
    const repoDir = createTempPluginRepo({
      includeOriroHubContract: false,
    });

    expect(() => collectOriroHubPublishablePluginPackages(repoDir)).toThrow(
      "oriro.compat.pluginApi is required for external code plugin packages.",
    );
  });

  it("rejects unsafe extension directory names", () => {
    const repoDir = createTempPluginRepo({
      extensionId: "Demo Plugin",
    });

    expect(() => collectOriroHubPublishablePluginPackages(repoDir)).toThrow(
      "Demo Plugin: extension directory name must match",
    );
  });

  it("validates only selected package names when filters are provided", () => {
    const repoDir = createTempPluginRepo({
      extraExtensionIds: ["broken-plugin"],
    });
    writeFileSync(
      join(repoDir, "extensions", "broken-plugin", "package.json"),
      JSON.stringify(
        {
          name: "@oriro/broken-plugin",
          version: "2026.4.1",
          oriro: {
            extensions: ["./index.ts"],
            release: {
              publishToOriroHub: true,
            },
          },
        },
        null,
        2,
      ),
    );

    expect(
      collectOriroHubPublishablePluginPackages(repoDir, {
        packageNames: ["@oriro/demo-plugin"],
      }).map((plugin) => plugin.packageName),
    ).toEqual(["@oriro/demo-plugin"]);
  });
});

describe("Oriro dual-published plugin metadata", () => {
  const dualPublishedPlugins = [
    {
      extensionId: "cohere",
      packageName: "@oriro/cohere-provider",
      install: {
        orirohubSpec: "orirohub:@oriro/cohere-provider",
        defaultChoice: "npm",
        minHostVersion: ">=2026.6.8",
        npmSpec: "@oriro/cohere-provider",
      },
    },
    {
      extensionId: "diagnostics-otel",
      packageName: "@oriro/diagnostics-otel",
      install: {
        orirohubSpec: "orirohub:@oriro/diagnostics-otel",
        defaultChoice: "npm",
        minHostVersion: ">=2026.4.25",
        npmSpec: "@oriro/diagnostics-otel",
      },
    },
    {
      extensionId: "diagnostics-prometheus",
      packageName: "@oriro/diagnostics-prometheus",
      install: {
        orirohubSpec: "orirohub:@oriro/diagnostics-prometheus",
        defaultChoice: "npm",
        minHostVersion: ">=2026.4.25",
        npmSpec: "@oriro/diagnostics-prometheus",
      },
    },
    {
      extensionId: "gmi",
      packageName: "@oriro/gmi-provider",
      install: {
        orirohubSpec: "orirohub:@oriro/gmi-provider",
        defaultChoice: "npm",
        minHostVersion: ">=2026.6.8",
        npmSpec: "@oriro/gmi-provider",
      },
    },
  ] as const;

  it("keeps dual-published plugins selectable through both OriroHub and npm release paths", () => {
    const packageNames = dualPublishedPlugins.map((plugin) => plugin.packageName);
    const oriroHubPublishable = collectOriroHubPublishablePluginPackages(undefined, {
      packageNames,
    });
    const npmPublishable = collectPublishablePluginPackages(undefined, {
      packageNames,
    });

    expect(oriroHubPublishable.map((plugin) => plugin.packageName)).toEqual(packageNames);
    expect(npmPublishable.map((plugin) => plugin.packageName)).toEqual(packageNames);

    for (const plugin of dualPublishedPlugins) {
      const packageJson = JSON.parse(
        readFileSync(`extensions/${plugin.extensionId}/package.json`, "utf8"),
      ) as {
        oriro?: {
          install?: {
            orirohubSpec?: string;
            defaultChoice?: string;
            minHostVersion?: string;
            npmSpec?: string;
          };
          release?: {
            publishToOriroHub?: boolean;
            publishToNpm?: boolean;
          };
        };
      };

      expect(packageJson.oriro?.install).toEqual(plugin.install);
      expect(packageJson.oriro?.release).toEqual({
        publishToOriroHub: true,
        publishToNpm: true,
      });
    }
  });
});

describe("collectOriroHubVersionGateErrors", () => {
  it("requires a version bump when a publishable plugin changes", () => {
    const repoDir = createTempPluginRepo();
    const baseRef = git(repoDir, ["rev-parse", "HEAD"]);

    writeFileSync(
      join(repoDir, "extensions", "demo-plugin", "index.ts"),
      "export const demo = 2;\n",
    );
    git(repoDir, ["add", "."]);
    git(repoDir, [
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.com",
      "commit",
      "-m",
      "change plugin",
    ]);
    const headRef = git(repoDir, ["rev-parse", "HEAD"]);

    const errors = collectOriroHubVersionGateErrors({
      rootDir: repoDir,
      plugins: collectOriroHubPublishablePluginPackages(repoDir),
      gitRange: { baseRef, headRef },
    });

    expect(errors).toEqual([
      "@oriro/demo-plugin@2026.4.1: changed publishable plugin still has the same version in package.json.",
    ]);
  });

  it("does not require a version bump for the first OriroHub opt-in", () => {
    const repoDir = createTempPluginRepo({
      publishToOriroHub: false,
    });
    const baseRef = git(repoDir, ["rev-parse", "HEAD"]);

    writeFileSync(
      join(repoDir, "extensions", "demo-plugin", "package.json"),
      JSON.stringify(
        {
          name: "@oriro/demo-plugin",
          version: "2026.4.1",
          type: "module",
          repository: {
            type: "git",
            url: ORIRO_PLUGIN_NPM_REPOSITORY_URL,
          },
          oriro: {
            extensions: ["./index.ts"],
            compat: {
              pluginApi: ">=2026.4.1",
            },
            install: {
              npmSpec: "@oriro/demo-plugin",
            },
            build: {
              oriroVersion: "2026.4.1",
            },
            release: {
              publishToOriroHub: true,
            },
          },
        },
        null,
        2,
      ),
    );
    git(repoDir, ["add", "."]);
    git(repoDir, [
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.com",
      "commit",
      "-m",
      "opt in",
    ]);
    const headRef = git(repoDir, ["rev-parse", "HEAD"]);

    const errors = collectOriroHubVersionGateErrors({
      rootDir: repoDir,
      plugins: collectOriroHubPublishablePluginPackages(repoDir),
      gitRange: { baseRef, headRef },
    });

    expect(errors).toStrictEqual([]);
  });

  it("does not require a version bump for shared release-tooling changes", () => {
    const repoDir = createTempPluginRepo();
    const { baseRef, headRef } = commitSharedReleaseToolingChange(repoDir);

    const errors = collectOriroHubVersionGateErrors({
      rootDir: repoDir,
      plugins: collectOriroHubPublishablePluginPackages(repoDir),
      gitRange: { baseRef, headRef },
    });

    expect(errors).toStrictEqual([]);
  });
});

describe("resolveSelectedOriroHubPublishablePluginPackages", () => {
  it("selects all publishable plugins when shared release tooling changes", () => {
    const repoDir = createTempPluginRepo({
      extraExtensionIds: ["demo-two"],
    });
    const { baseRef, headRef } = commitSharedReleaseToolingChange(repoDir);

    const selected = resolveSelectedOriroHubPublishablePluginPackages({
      rootDir: repoDir,
      plugins: collectOriroHubPublishablePluginPackages(repoDir),
      gitRange: { baseRef, headRef },
    });

    expect(selected.map((plugin) => plugin.extensionId)).toEqual(["demo-plugin", "demo-two"]);
  });

  it("selects all publishable plugins when the shared setup action changes", () => {
    const repoDir = createTempPluginRepo({
      extraExtensionIds: ["demo-two"],
    });
    const baseRef = git(repoDir, ["rev-parse", "HEAD"]);

    mkdirSync(join(repoDir, ".github", "actions", "setup-node-env"), { recursive: true });
    writeFileSync(
      join(repoDir, ".github", "actions", "setup-node-env", "action.yml"),
      "name: setup-node-env\n",
    );
    git(repoDir, ["add", "."]);
    git(repoDir, [
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.com",
      "commit",
      "-m",
      "shared helpers",
    ]);
    const headRef = git(repoDir, ["rev-parse", "HEAD"]);

    const selected = resolveSelectedOriroHubPublishablePluginPackages({
      rootDir: repoDir,
      plugins: collectOriroHubPublishablePluginPackages(repoDir),
      gitRange: { baseRef, headRef },
    });

    expect(selected.map((plugin) => plugin.extensionId)).toEqual(["demo-plugin", "demo-two"]);
  });
});

describe("collectPluginOriroHubReleasePlan", () => {
  it("keeps existing trusted packages with missing versions as normal candidates", async () => {
    const repoDir = createTempPluginRepo();
    const { fetchImpl, requests } = createOriroHubPlanFetch({
      packages: {
        "@oriro/demo-plugin": {
          status: 200,
          body: {
            package: {},
            owner: {},
          },
        },
      },
      trustedPublishers: {
        "@oriro/demo-plugin": {
          status: 200,
          body: {
            trustedPublisher: {
              repository: "oriro-ai/cli",
              workflowFilename: "plugin-orirohub-release.yml",
            },
          },
        },
      },
      versions: {
        "@oriro/demo-plugin@2026.4.1": 404,
      },
    });

    const plan = await collectPluginOriroHubReleasePlan({
      rootDir: repoDir,
      selection: ["@oriro/demo-plugin"],
      fetchImpl,
      registryBaseUrl: "https://orirohub.ai",
    });

    expect(plan.candidates.map((plugin) => plugin.packageName)).toEqual(["@oriro/demo-plugin"]);
    expect(plan.bootstrapCandidates).toStrictEqual([]);
    expect(plan.missingTrustedPublisher).toStrictEqual([]);
    expect(requests).toEqual([
      "/api/v1/packages/%40oriro%2Fdemo-plugin",
      "/api/v1/packages/%40oriro%2Fdemo-plugin/trusted-publisher",
      "/api/v1/packages/%40oriro%2Fdemo-plugin/versions/2026.4.1",
    ]);
  });

  it("cancels unused OriroHub package and version response bodies", async () => {
    const repoDir = createTempPluginRepo();
    const canceled: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const requestUrl =
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const url = new URL(requestUrl);

      if (url.pathname === "/api/v1/packages/%40oriro%2Fdemo-plugin") {
        return new Response(
          new ReadableStream<Uint8Array>({
            cancel() {
              canceled.push("package");
            },
          }),
          { status: 200 },
        );
      }
      if (url.pathname === "/api/v1/packages/%40oriro%2Fdemo-plugin/trusted-publisher") {
        return new Response(
          JSON.stringify({
            trustedPublisher: {
              repository: "oriro-ai/cli",
              workflowFilename: "plugin-orirohub-release.yml",
            },
          }),
          { status: 200 },
        );
      }
      if (url.pathname === "/api/v1/packages/%40oriro%2Fdemo-plugin/versions/2026.4.1") {
        return new Response(
          new ReadableStream<Uint8Array>({
            cancel() {
              canceled.push("version");
            },
          }),
          { status: 404 },
        );
      }

      throw new Error(`Unexpected OriroHub request to ${url.pathname}`);
    };

    await collectPluginOriroHubReleasePlan({
      rootDir: repoDir,
      selection: ["@oriro/demo-plugin"],
      fetchImpl,
      registryBaseUrl: "https://orirohub.ai",
    });

    expect(canceled).toEqual(["package", "version"]);
  });

  it("retries a rate-limited trusted publisher lookup", async () => {
    const repoDir = createTempPluginRepo();
    let trustedPublisherRequests = 0;
    let rateLimitedBodyCanceled = false;
    let firstTrustedPublisherRequestAt: number | undefined;
    let retryTrustedPublisherRequestAt: number | undefined;
    const fetchImpl: typeof fetch = async (input) => {
      const requestUrl =
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const pathname = new URL(requestUrl).pathname;
      if (pathname === "/api/v1/packages/%40oriro%2Fdemo-plugin") {
        return new Response("{}", { status: 200 });
      }
      if (pathname === "/api/v1/packages/%40oriro%2Fdemo-plugin/trusted-publisher") {
        trustedPublisherRequests += 1;
        if (trustedPublisherRequests === 1) {
          firstTrustedPublisherRequestAt = Date.now();
          return new Response(
            new ReadableStream({
              cancel() {
                rateLimitedBodyCanceled = true;
              },
            }),
            { status: 429 },
          );
        }
        retryTrustedPublisherRequestAt = Date.now();
        return new Response(
          JSON.stringify({
            trustedPublisher: {
              repository: "oriro-ai/cli",
              workflowFilename: "plugin-orirohub-release.yml",
            },
          }),
          { status: 200 },
        );
      }
      if (pathname === "/api/v1/packages/%40oriro%2Fdemo-plugin/versions/2026.4.1") {
        return new Response("", { status: 404 });
      }
      throw new Error(`Unexpected OriroHub request to ${pathname}`);
    };

    const plan = await collectPluginOriroHubReleasePlan({
      rootDir: repoDir,
      selection: ["@oriro/demo-plugin"],
      fetchImpl,
      registryBaseUrl: "https://orirohub.ai",
    });

    expect(trustedPublisherRequests).toBe(2);
    expect(rateLimitedBodyCanceled).toBe(true);
    expect(retryTrustedPublisherRequestAt).toBeGreaterThanOrEqual(
      (firstTrustedPublisherRequestAt ?? Number.POSITIVE_INFINITY) + 900,
    );
    expect(plan.candidates.map((plugin) => plugin.packageName)).toEqual(["@oriro/demo-plugin"]);
  });

  it("honors an HTTP-date Retry-After header", async () => {
    const repoDir = createTempPluginRepo();
    const retryAfter = "Wed, 21 Oct 2030 07:28:00 GMT";
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(Date.parse(retryAfter) - 1_000);
    let trustedPublisherRequests = 0;
    let firstTrustedPublisherRequestAt: number | undefined;
    let retryTrustedPublisherRequestAt: number | undefined;
    const fetchImpl: typeof fetch = async (input) => {
      const requestUrl =
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const pathname = new URL(requestUrl).pathname;
      if (pathname === "/api/v1/packages/%40oriro%2Fdemo-plugin") {
        return new Response("{}", { status: 200 });
      }
      if (pathname === "/api/v1/packages/%40oriro%2Fdemo-plugin/trusted-publisher") {
        trustedPublisherRequests += 1;
        if (trustedPublisherRequests === 1) {
          firstTrustedPublisherRequestAt = performance.now();
          return new Response("", { status: 429, headers: { "retry-after": retryAfter } });
        }
        retryTrustedPublisherRequestAt = performance.now();
        return new Response(
          JSON.stringify({
            trustedPublisher: {
              repository: "oriro-ai/cli",
              workflowFilename: "plugin-orirohub-release.yml",
            },
          }),
          { status: 200 },
        );
      }
      if (pathname === "/api/v1/packages/%40oriro%2Fdemo-plugin/versions/2026.4.1") {
        return new Response("", { status: 404 });
      }
      throw new Error(`Unexpected OriroHub request to ${pathname}`);
    };

    try {
      await collectPluginOriroHubReleasePlan({
        rootDir: repoDir,
        selection: ["@oriro/demo-plugin"],
        fetchImpl,
        registryBaseUrl: "https://orirohub.ai",
      });
    } finally {
      nowSpy.mockRestore();
    }

    expect(trustedPublisherRequests).toBe(2);
    expect(retryTrustedPublisherRequestAt).toBeGreaterThanOrEqual(
      (firstTrustedPublisherRequestAt ?? Number.POSITIVE_INFINITY) + 900,
    );
  });

  it("falls back to the bounded retry schedule for an excessive Retry-After header", async () => {
    const repoDir = createTempPluginRepo();
    let trustedPublisherRequests = 0;
    let firstTrustedPublisherRequestAt: number | undefined;
    let retryTrustedPublisherRequestAt: number | undefined;
    const fetchImpl: typeof fetch = async (input) => {
      const requestUrl =
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const pathname = new URL(requestUrl).pathname;
      if (pathname === "/api/v1/packages/%40oriro%2Fdemo-plugin") {
        return new Response("{}", { status: 200 });
      }
      if (pathname === "/api/v1/packages/%40oriro%2Fdemo-plugin/trusted-publisher") {
        trustedPublisherRequests += 1;
        if (trustedPublisherRequests === 1) {
          firstTrustedPublisherRequestAt = Date.now();
          return new Response("", { status: 429, headers: { "retry-after": "999999999999" } });
        }
        retryTrustedPublisherRequestAt = Date.now();
        return new Response(
          JSON.stringify({
            trustedPublisher: {
              repository: "oriro-ai/cli",
              workflowFilename: "plugin-orirohub-release.yml",
            },
          }),
          { status: 200 },
        );
      }
      if (pathname === "/api/v1/packages/%40oriro%2Fdemo-plugin/versions/2026.4.1") {
        return new Response("", { status: 404 });
      }
      throw new Error(`Unexpected OriroHub request to ${pathname}`);
    };

    await collectPluginOriroHubReleasePlan({
      rootDir: repoDir,
      selection: ["@oriro/demo-plugin"],
      fetchImpl,
      registryBaseUrl: "https://orirohub.ai",
    });

    expect(trustedPublisherRequests).toBe(2);
    expect(retryTrustedPublisherRequestAt).toBeGreaterThanOrEqual(
      (firstTrustedPublisherRequestAt ?? Number.POSITIVE_INFINITY) + 900,
    );
  });

  it("routes missing package rows to bootstrap candidates instead of normal candidates", async () => {
    const repoDir = createTempPluginRepo();
    const { fetchImpl } = createOriroHubPlanFetch({
      packages: {
        "@oriro/demo-plugin": {
          status: 404,
        },
      },
    });

    const plan = await collectPluginOriroHubReleasePlan({
      rootDir: repoDir,
      selection: ["@oriro/demo-plugin"],
      fetchImpl,
      registryBaseUrl: "https://orirohub.ai",
    });

    expect(plan.candidates).toStrictEqual([]);
    expect(plan.bootstrapCandidates.map((plugin) => plugin.packageName)).toEqual([
      "@oriro/demo-plugin",
    ]);
    expect(plan.bootstrapCandidates[0]).toMatchObject({
      alreadyPublished: false,
      artifactName: "orirohub-package-oriro-demo-plugin-2026.4.1",
      packageName: "@oriro/demo-plugin",
      version: "2026.4.1",
    });
    expect(plan.missingTrustedPublisher).toStrictEqual([]);
  });

  it("routes existing packages without trusted publisher config out of normal candidates", async () => {
    const repoDir = createTempPluginRepo();
    const { fetchImpl } = createOriroHubPlanFetch({
      packages: {
        "@oriro/demo-plugin": {
          status: 200,
          body: {
            package: {},
            owner: {},
          },
        },
      },
      trustedPublishers: {
        "@oriro/demo-plugin": {
          status: 200,
          body: {
            trustedPublisher: null,
          },
        },
      },
      versions: {
        "@oriro/demo-plugin@2026.4.1": 404,
      },
    });

    const plan = await collectPluginOriroHubReleasePlan({
      rootDir: repoDir,
      selection: ["@oriro/demo-plugin"],
      fetchImpl,
      registryBaseUrl: "https://orirohub.ai",
    });

    expect(plan.candidates).toStrictEqual([]);
    expect(plan.bootstrapCandidates).toStrictEqual([]);
    expect(plan.missingTrustedPublisher.map((plugin) => plugin.packageName)).toEqual([
      "@oriro/demo-plugin",
    ]);
    expect(plan.missingTrustedPublisher[0]).toMatchObject({
      alreadyPublished: false,
      artifactName: "orirohub-package-oriro-demo-plugin-2026.4.1",
      packageName: "@oriro/demo-plugin",
      version: "2026.4.1",
    });
  });

  it("keeps OriroHub trusted publisher timeouts active while reading response bodies", async () => {
    const repoDir = createTempPluginRepo();
    const fetchImpl: typeof fetch = async (input) => {
      const requestUrl =
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const url = new URL(requestUrl);
      if (url.pathname === "/api/v1/packages/%40oriro%2Fdemo-plugin") {
        return new Response("{}", { status: 200 });
      }
      if (url.pathname === "/api/v1/packages/%40oriro%2Fdemo-plugin/trusted-publisher") {
        return new Response(new ReadableStream<Uint8Array>({ start() {} }), { status: 200 });
      }
      throw new Error(`Unexpected OriroHub request to ${url.pathname}`);
    };

    await expect(
      collectPluginOriroHubReleasePlan({
        rootDir: repoDir,
        selection: ["@oriro/demo-plugin"],
        fetchImpl,
        registryBaseUrl: "https://orirohub.ai",
        requestTimeoutMs: 5,
      }),
    ).rejects.toThrow("OriroHub request timed out after 5ms");
  });

  it("routes environment-pinned trusted publisher config out of normal candidates", async () => {
    const repoDir = createTempPluginRepo();
    const { fetchImpl } = createOriroHubPlanFetch({
      packages: {
        "@oriro/demo-plugin": {
          status: 200,
          body: {
            package: {},
            owner: {},
          },
        },
      },
      trustedPublishers: {
        "@oriro/demo-plugin": {
          status: 200,
          body: {
            trustedPublisher: {
              repository: "oriro-ai/cli",
              workflowFilename: "plugin-orirohub-release.yml",
              environment: "orirohub-plugin-release",
            },
          },
        },
      },
      versions: {
        "@oriro/demo-plugin@2026.4.1": 404,
      },
    });

    const plan = await collectPluginOriroHubReleasePlan({
      rootDir: repoDir,
      selection: ["@oriro/demo-plugin"],
      fetchImpl,
      registryBaseUrl: "https://orirohub.ai",
    });

    expect(plan.candidates).toStrictEqual([]);
    expect(plan.bootstrapCandidates).toStrictEqual([]);
    expect(plan.missingTrustedPublisher.map((plugin) => plugin.packageName)).toEqual([
      "@oriro/demo-plugin",
    ]);
  });

  it("skips versions that already exist on OriroHub", async () => {
    const repoDir = createTempPluginRepo();
    const { fetchImpl } = createOriroHubPlanFetch({
      packages: {
        "@oriro/demo-plugin": {
          status: 200,
          body: {
            package: {},
            owner: {},
          },
        },
      },
      trustedPublishers: {
        "@oriro/demo-plugin": {
          status: 200,
          body: {
            trustedPublisher: null,
          },
        },
      },
      versions: {
        "@oriro/demo-plugin@2026.4.1": 200,
      },
    });

    const plan = await collectPluginOriroHubReleasePlan({
      rootDir: repoDir,
      selection: ["@oriro/demo-plugin"],
      fetchImpl,
      registryBaseUrl: "https://orirohub.ai",
    });

    expect(plan.candidates).toStrictEqual([]);
    expect(plan.bootstrapCandidates).toStrictEqual([]);
    expect(plan.missingTrustedPublisher.map((plugin) => plugin.packageName)).toEqual([
      "@oriro/demo-plugin",
    ]);
    expect(plan.missingTrustedPublisher[0]).toMatchObject({
      alreadyPublished: true,
      artifactName: "orirohub-package-oriro-demo-plugin-2026.4.1",
      packageName: "@oriro/demo-plugin",
      version: "2026.4.1",
    });
    expect(plan.skippedPublished).toHaveLength(1);
    expect(plan.skippedPublished[0]).toEqual({
      alreadyPublished: true,
      artifactName: "orirohub-package-oriro-demo-plugin-2026.4.1",
      channel: "stable",
      extensionId: "demo-plugin",
      packageDir: "extensions/demo-plugin",
      packageName: "@oriro/demo-plugin",
      publishTag: "latest",
      version: "2026.4.1",
    });
  });

  it("plans selected packages without validating unrelated publishable packages", async () => {
    const repoDir = createTempPluginRepo({
      extraExtensionIds: ["broken-plugin"],
    });
    writeFileSync(
      join(repoDir, "extensions", "broken-plugin", "package.json"),
      JSON.stringify(
        {
          name: "@oriro/broken-plugin",
          version: "2026.4.1",
          oriro: {
            extensions: ["./index.ts"],
            release: {
              publishToOriroHub: true,
            },
          },
        },
        null,
        2,
      ),
    );

    const plan = await collectPluginOriroHubReleasePlan({
      rootDir: repoDir,
      selection: ["@oriro/demo-plugin"],
      fetchImpl: createOriroHubPlanFetch({
        packages: {
          "@oriro/demo-plugin": {
            status: 200,
            body: {
              package: {},
              owner: {},
            },
          },
        },
        trustedPublishers: {
          "@oriro/demo-plugin": {
            status: 200,
            body: {
              trustedPublisher: {
                repository: "oriro-ai/cli",
                workflowFilename: "plugin-orirohub-release.yml",
              },
            },
          },
        },
        versions: {
          "@oriro/demo-plugin@2026.4.1": 404,
        },
      }).fetchImpl,
      registryBaseUrl: "https://orirohub.ai",
    });

    expect(plan.candidates.map((plugin) => plugin.packageName)).toEqual(["@oriro/demo-plugin"]);
    expect(plan.candidates.map((plugin) => plugin.artifactName)).toEqual([
      "orirohub-package-oriro-demo-plugin-2026.4.1",
    ]);
  });
});

describe("buildOriroReleaseOriroHubPlan", () => {
  it("emits a dispatch plan that keeps OriroHub children on the release tag", async () => {
    const repoDir = createTempPluginRepo({
      extraExtensionIds: ["demo-two", "demo-three"],
    });
    const { fetchImpl } = createOriroHubPlanFetch({
      packages: {
        "@oriro/demo-plugin": {
          status: 200,
          body: {
            package: {},
            owner: {},
          },
        },
        "@oriro/demo-two": {
          status: 404,
        },
        "@oriro/demo-three": {
          status: 200,
          body: {
            package: {},
            owner: {},
          },
        },
      },
      trustedPublishers: {
        "@oriro/demo-plugin": {
          status: 200,
          body: {
            trustedPublisher: {
              repository: "oriro-ai/cli",
              workflowFilename: "plugin-orirohub-release.yml",
            },
          },
        },
        "@oriro/demo-three": {
          status: 200,
          body: {
            trustedPublisher: null,
          },
        },
      },
      versions: {
        "@oriro/demo-plugin@2026.4.1": 404,
        "@oriro/demo-three@2026.4.1": 404,
      },
    });

    const plan = await buildOriroReleaseOriroHubPlan(
      {
        releaseTag: "v2026.4.1-beta.1",
        releasePublishBranch: "main",
        releasePublishRunId: "12345",
        pluginPublishScope: "all-publishable",
        plugins: [],
      },
      {
        rootDir: repoDir,
        fetchImpl,
        registryBaseUrl: "https://orirohub.ai",
      },
    );

    expect(plan.oriroHubWorkflowRef).toBe("v2026.4.1-beta.1");
    expect(plan.releasePublishBranch).toBe("main");
    expect(plan.normal).toEqual({
      workflow: "plugin-orirohub-release.yml",
      ref: "v2026.4.1-beta.1",
      shouldDispatch: true,
      packages: ["@oriro/demo-plugin"],
      inputs: {
        publish_scope: "selected",
        plugins: "@oriro/demo-plugin",
        release_publish_run_id: "12345",
        release_publish_branch: "main",
      },
    });
    expect(plan.bootstrap).toEqual({
      workflow: "plugin-orirohub-new.yml",
      ref: "v2026.4.1-beta.1",
      shouldDispatch: true,
      packages: ["@oriro/demo-two", "@oriro/demo-three"],
      inputs: {
        plugins: "@oriro/demo-two,@oriro/demo-three",
        release_publish_run_id: "12345",
        release_publish_branch: "main",
      },
    });
    expect(new Set([...plan.normal.packages, ...plan.bootstrap.packages]).size).toBe(3);
    expect(plan.summary).toEqual({
      normalCount: 1,
      bootstrapCount: 2,
      missingTrustedPublisherCount: 1,
      normalPlugins: "@oriro/demo-plugin",
      bootstrapPlugins: "@oriro/demo-two,@oriro/demo-three",
      missingTrustedPlugins: "@oriro/demo-three",
    });
    expect(plan.verifier).toEqual({
      oriroHubWorkflowRef: "v2026.4.1-beta.1",
    });
  });

  it("routes already-published packages missing trusted publisher config to bootstrap repair", async () => {
    const repoDir = createTempPluginRepo();
    const { fetchImpl } = createOriroHubPlanFetch({
      packages: {
        "@oriro/demo-plugin": {
          status: 200,
          body: {
            package: {},
            owner: {},
          },
        },
      },
      trustedPublishers: {
        "@oriro/demo-plugin": {
          status: 200,
          body: {
            trustedPublisher: null,
          },
        },
      },
      versions: {
        "@oriro/demo-plugin@2026.4.1": 200,
      },
    });

    const plan = await buildOriroReleaseOriroHubPlan(
      {
        releaseTag: "v2026.4.1-beta.1",
        releasePublishBranch: "release/2026.4.1",
        releasePublishRunId: "12345",
        pluginPublishScope: "selected",
        plugins: ["@oriro/demo-plugin"],
      },
      {
        rootDir: repoDir,
        fetchImpl,
        registryBaseUrl: "https://orirohub.ai",
      },
    );

    expect(plan.normal.shouldDispatch).toBe(false);
    expect(plan.bootstrap).toMatchObject({
      workflow: "plugin-orirohub-new.yml",
      ref: "v2026.4.1-beta.1",
      shouldDispatch: true,
      packages: ["@oriro/demo-plugin"],
      inputs: {
        plugins: "@oriro/demo-plugin",
        release_publish_run_id: "12345",
        release_publish_branch: "release/2026.4.1",
      },
    });
    expect(plan.summary).toMatchObject({
      normalCount: 0,
      bootstrapCount: 1,
      missingTrustedPublisherCount: 1,
      bootstrapPlugins: "@oriro/demo-plugin",
      missingTrustedPlugins: "@oriro/demo-plugin",
    });
  });

  it("rejects incompatible all-publishable plugin selection args", () => {
    expect(() =>
      parseOriroReleaseOriroHubPlanArgs([
        "--release-tag",
        "v2026.4.1-beta.1",
        "--release-publish-branch",
        "main",
        "--release-publish-run-id",
        "12345",
        "--plugin-publish-scope",
        "all-publishable",
        "--plugins",
        "@oriro/demo-plugin",
      ]),
    ).toThrow("plugin-publish-scope=all-publishable must not be combined with --plugins.");
  });
});

describe("buildOriroReleaseOriroHubRuntimeState", () => {
  it("includes the normal OriroHub run in verifier args when the release waits for it", () => {
    const state = buildOriroReleaseOriroHubRuntimeState({
      repository: "oriro-ai/cli",
      waitForOriroHub: true,
      forceSkipOriroHub: false,
      normalRunId: "111",
      bootstrapRunId: "",
      bootstrapCompleted: false,
    });

    expect(state.verifierArgs).toEqual(["--plugin-orirohub-run", "111"]);
    expect(state.proofLines.normal).toBe(
      "- plugin OriroHub publish: https://github.com/oriro-ai/cli/actions/runs/111",
    );
    expect(state.proofLines.bootstrap).toBe("- plugin OriroHub bootstrap: not needed");
  });

  it("includes a completed bootstrap run even when there is no normal OriroHub run", () => {
    const state = buildOriroReleaseOriroHubRuntimeState({
      repository: "oriro-ai/cli",
      waitForOriroHub: false,
      forceSkipOriroHub: false,
      normalRunId: "",
      bootstrapRunId: "222",
      bootstrapCompleted: true,
    });

    expect(state.verifierArgs).toEqual(["--plugin-orirohub-bootstrap-run", "222"]);
    expect(state.proofLines.normal).toBe("- plugin OriroHub publish: no normal OIDC candidates");
    expect(state.proofLines.bootstrap).toBe(
      "- plugin OriroHub bootstrap: https://github.com/oriro-ai/cli/actions/runs/222",
    );
  });

  it("skips OriroHub verification for non-awaited incomplete runs while keeping proof links", () => {
    const state = buildOriroReleaseOriroHubRuntimeState({
      repository: "oriro-ai/cli",
      waitForOriroHub: false,
      forceSkipOriroHub: false,
      normalRunId: "111",
      bootstrapRunId: "222",
      bootstrapCompleted: false,
    });

    expect(state.verifierArgs).toEqual(["--skip-orirohub"]);
    expect(state.proofLines.normal).toBe(
      "- plugin OriroHub publish: dispatched separately, not awaited by this proof: https://github.com/oriro-ai/cli/actions/runs/111",
    );
    expect(state.proofLines.bootstrap).toBe(
      "- plugin OriroHub bootstrap: dispatched separately, not awaited by this proof: https://github.com/oriro-ai/cli/actions/runs/222",
    );
  });

  it("keeps completed bootstrap run evidence when the normal OriroHub run is not awaited", () => {
    const state = buildOriroReleaseOriroHubRuntimeState({
      repository: "oriro-ai/cli",
      waitForOriroHub: false,
      forceSkipOriroHub: false,
      normalRunId: "111",
      bootstrapRunId: "222",
      bootstrapCompleted: true,
    });

    expect(state.verifierArgs).toEqual(["--skip-orirohub", "--plugin-orirohub-bootstrap-run", "222"]);
    expect(state.proofLines.normal).toBe(
      "- plugin OriroHub publish: dispatched separately, not awaited by this proof: https://github.com/oriro-ai/cli/actions/runs/111",
    );
    expect(state.proofLines.bootstrap).toBe(
      "- plugin OriroHub bootstrap: https://github.com/oriro-ai/cli/actions/runs/222",
    );
  });

  it("forces skip-orirohub after a failed child run even if OriroHub runs completed", () => {
    const state = buildOriroReleaseOriroHubRuntimeState({
      repository: "oriro-ai/cli",
      waitForOriroHub: true,
      forceSkipOriroHub: true,
      normalRunId: "111",
      bootstrapRunId: "222",
      bootstrapCompleted: true,
    });

    expect(state.verifierArgs).toEqual(["--skip-orirohub"]);
    expect(state.proofLines.normal).toBe(
      "- plugin OriroHub publish: https://github.com/oriro-ai/cli/actions/runs/111",
    );
    expect(state.proofLines.bootstrap).toBe(
      "- plugin OriroHub bootstrap: https://github.com/oriro-ai/cli/actions/runs/222",
    );
  });
});

describe("plugin-orirohub-publish.sh", () => {
  it("prints help before package or OriroHub checks", () => {
    const output = execFileSync(
      "bash",
      [join(process.cwd(), "scripts/plugin-orirohub-publish.sh"), "--help"],
      {
        encoding: "utf8",
      },
    );

    expect(output.trim()).toBe(
      "usage: bash scripts/plugin-orirohub-publish.sh [--dry-run|--publish|--pack] <package-dir>",
    );
  });

  it("rejects option-like package dirs before package or OriroHub checks", () => {
    expect(() =>
      execFileSync(
        "bash",
        [join(process.cwd(), "scripts/plugin-orirohub-publish.sh"), "--dry-run", "--wat"],
        {
          encoding: "utf8",
        },
      ),
    ).toThrow("unexpected plugin OriroHub package-dir option: --wat");
  });

  it("rejects extra arguments before package or OriroHub checks", () => {
    expect(() =>
      execFileSync(
        "bash",
        [
          join(process.cwd(), "scripts/plugin-orirohub-publish.sh"),
          "--dry-run",
          "extensions/demo-plugin",
          "extra",
        ],
        {
          encoding: "utf8",
        },
      ),
    ).toThrow("unexpected plugin OriroHub publish argument: extra");
  });

  it("previews the publish command through the OriroHub CLI dry-run preflight", () => {
    const repoDir = createTempPluginRepo();
    const binDir = join(repoDir, "bin");
    const markerPath = join(repoDir, "orirohub-invoked");
    mkdirSync(binDir, { recursive: true });
    const orirohubPath = join(binDir, "orirohub");
    writeFileSync(
      orirohubPath,
      `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> ${JSON.stringify(markerPath)}
if [[ "\${1:-}" == "--workdir" ]]; then
  shift 2
fi
if [[ "\${1:-}" == "package" && "\${2:-}" == "pack" ]]; then
  pack_destination=""
  while [[ "$#" -gt 0 ]]; do
    case "$1" in
      --pack-destination)
        pack_destination="\${2:-}"
        shift 2
        ;;
      *)
        shift
        ;;
    esac
  done
  mkdir -p "$pack_destination"
  pack_path="$pack_destination/oriro-demo-plugin-2026.4.1.tgz"
  printf 'fake tgz\\n' > "$pack_path"
  printf '{"path":"%s","name":"@oriro/demo-plugin","version":"2026.4.1"}\\n' "$pack_path"
fi
exit 0
`,
    );
    chmodSync(orirohubPath, 0o755);

    const output = execFileSync(
      "bash",
      [
        join(process.cwd(), "scripts/plugin-orirohub-publish.sh"),
        "--dry-run",
        "extensions/demo-plugin",
      ],
      {
        cwd: repoDir,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${binDir}${delimiter}${process.env.PATH ?? ""}`,
        },
      },
    );

    expect(output).toContain("Publish command: ORIROHUB_WORKDIR=");
    expect(output).toContain("Resolved OriroPack:");
    const invocations = readFileSync(markerPath, "utf8");
    const resolvedRepoDir = realpathSync(repoDir);
    expect(invocations).toContain(`--workdir ${resolvedRepoDir}`);
    expect(invocations).toContain(
      `package pack ${join(resolvedRepoDir, "extensions/demo-plugin")}`,
    );
    expect(invocations).toContain("package publish ");
    expect(invocations).toContain(".tgz --tags latest");
    expect(invocations).toContain("--dry-run");
  });

  it("passes a manual override reason when trusted publisher repair requires one", () => {
    const repoDir = createTempPluginRepo();
    const binDir = join(repoDir, "bin");
    const markerPath = join(repoDir, "orirohub-invoked");
    mkdirSync(binDir, { recursive: true });
    const orirohubPath = join(binDir, "orirohub");
    writeFileSync(
      orirohubPath,
      `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> ${JSON.stringify(markerPath)}
if [[ "\${1:-}" == "--workdir" ]]; then
  shift 2
fi
if [[ "\${1:-}" == "package" && "\${2:-}" == "pack" ]]; then
  pack_destination=""
  while [[ "$#" -gt 0 ]]; do
    case "$1" in
      --pack-destination)
        pack_destination="\${2:-}"
        shift 2
        ;;
      *)
        shift
        ;;
    esac
  done
  mkdir -p "$pack_destination"
  pack_path="$pack_destination/oriro-demo-plugin-2026.4.1.tgz"
  printf 'fake tgz\\n' > "$pack_path"
  printf '{"path":"%s","name":"@oriro/demo-plugin","version":"2026.4.1"}\\n' "$pack_path"
fi
exit 0
`,
    );
    chmodSync(orirohubPath, 0o755);

    execFileSync(
      "bash",
      [
        join(process.cwd(), "scripts/plugin-orirohub-publish.sh"),
        "--publish",
        "extensions/demo-plugin",
      ],
      {
        cwd: repoDir,
        encoding: "utf8",
        env: {
          ...process.env,
          ORIRO_ORIROHUB_MANUAL_OVERRIDE_REASON:
            "GitHub Actions trusted publisher repair before OIDC migration",
          PATH: `${binDir}${delimiter}${process.env.PATH ?? ""}`,
        },
      },
    );

    const invocations = readFileSync(markerPath, "utf8");
    expect(invocations).toContain("package publish ");
    expect(invocations).toContain(
      "--manual-override-reason GitHub Actions trusted publisher repair before OIDC migration",
    );
  });

  it("packs a reusable workflow artifact without publishing", () => {
    const repoDir = createTempPluginRepo();
    const binDir = join(repoDir, "bin");
    const markerPath = join(repoDir, "orirohub-invoked");
    const outputDir = join(repoDir, "orirohub-artifacts");
    mkdirSync(binDir, { recursive: true });
    const orirohubPath = join(binDir, "orirohub");
    writeFileSync(
      orirohubPath,
      `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> ${JSON.stringify(markerPath)}
if [[ "\${1:-}" == "--workdir" ]]; then
  shift 2
fi
if [[ "\${1:-}" == "package" && "\${2:-}" == "pack" ]]; then
  pack_destination=""
  while [[ "$#" -gt 0 ]]; do
    case "$1" in
      --pack-destination)
        pack_destination="\${2:-}"
        shift 2
        ;;
      *)
        shift
        ;;
    esac
  done
  mkdir -p "$pack_destination"
  pack_path="$pack_destination/oriro-demo-plugin-2026.4.1.tgz"
  printf 'fake tgz\\n' > "$pack_path"
  printf '{"path":"%s","name":"@oriro/demo-plugin","version":"2026.4.1"}\\n' "$pack_path"
fi
exit 0
`,
    );
    chmodSync(orirohubPath, 0o755);

    const output = execFileSync(
      "bash",
      [
        join(process.cwd(), "scripts/plugin-orirohub-publish.sh"),
        "--pack",
        "extensions/demo-plugin",
      ],
      {
        cwd: repoDir,
        encoding: "utf8",
        env: {
          ...process.env,
          ORIRO_ORIROHUB_PACK_OUTPUT_DIR: outputDir,
          PATH: `${binDir}${delimiter}${process.env.PATH ?? ""}`,
        },
      },
    );

    expect(output).toContain("Packed OriroPack:");
    expect(existsSync(join(outputDir, "oriro-demo-plugin-2026.4.1.tgz"))).toBe(true);
    const invocations = readFileSync(markerPath, "utf8");
    expect(invocations).toContain("package pack ");
    expect(invocations).not.toContain("package publish ");
  });
});

describe("collectPluginOriroHubReleasePathsFromGitRange", () => {
  it("rejects unsafe git refs", () => {
    const repoDir = createTempPluginRepo();
    const headRef = git(repoDir, ["rev-parse", "HEAD"]);

    expect(() =>
      collectPluginOriroHubReleasePathsFromGitRange({
        rootDir: repoDir,
        gitRange: {
          baseRef: "--not-a-ref",
          headRef,
        },
      }),
    ).toThrow("baseRef must be a normal git ref or commit SHA.");
  });
});

function createTempPluginRepo(
  options: {
    extensionId?: string;
    extraExtensionIds?: string[];
    publishToOriroHub?: boolean;
    includeOriroHubContract?: boolean;
  } = {},
) {
  const repoDir = makeTempRepoRoot(tempDirs, "oriro-orirohub-release-");
  const extensionId = options.extensionId ?? "demo-plugin";
  const extensionIds = [extensionId, ...(options.extraExtensionIds ?? [])];

  writeFileSync(
    join(repoDir, "package.json"),
    JSON.stringify({ name: "oriro-test-root", type: "module" }, null, 2),
  );
  writeFileSync(join(repoDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  for (const currentExtensionId of extensionIds) {
    mkdirSync(join(repoDir, "extensions", currentExtensionId), { recursive: true });
    writeFileSync(
      join(repoDir, "extensions", currentExtensionId, "package.json"),
      JSON.stringify(
        {
          name: `@oriro/${currentExtensionId}`,
          version: "2026.4.1",
          type: "module",
          repository: {
            type: "git",
            url: ORIRO_PLUGIN_NPM_REPOSITORY_URL,
          },
          oriro: {
            extensions: ["./index.ts"],
            ...(options.includeOriroHubContract === false
              ? {}
              : {
                  compat: {
                    pluginApi: ">=2026.4.1",
                  },
                  build: {
                    oriroVersion: "2026.4.1",
                  },
                }),
            install: {
              npmSpec: `@oriro/${currentExtensionId}`,
            },
            release: {
              publishToOriroHub: options.publishToOriroHub ?? true,
            },
          },
        },
        null,
        2,
      ),
    );
    writeFileSync(
      join(repoDir, "extensions", currentExtensionId, "index.ts"),
      `export const ${currentExtensionId.replaceAll(/[-.]/g, "_")} = 1;\n`,
    );
    writeFileSync(join(repoDir, "extensions", currentExtensionId, "README.md"), "# Demo plugin\n");
  }

  git(repoDir, ["init", "-b", "main"]);
  git(repoDir, ["add", "."]);
  git(repoDir, [
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.com",
    "commit",
    "-m",
    "init",
  ]);

  return repoDir;
}

function commitSharedReleaseToolingChange(repoDir: string) {
  const baseRef = git(repoDir, ["rev-parse", "HEAD"]);

  mkdirSync(join(repoDir, "scripts"), { recursive: true });
  writeFileSync(join(repoDir, "scripts", "plugin-orirohub-publish.sh"), "#!/usr/bin/env bash\n");
  git(repoDir, ["add", "."]);
  git(repoDir, [
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.com",
    "commit",
    "-m",
    "shared tooling",
  ]);
  const headRef = git(repoDir, ["rev-parse", "HEAD"]);

  return { baseRef, headRef };
}

function createOriroHubPlanFetch(config: {
  packages: Record<
    string,
    {
      status: number;
      body?: unknown;
    }
  >;
  trustedPublishers?: Record<
    string,
    {
      status: number;
      body?: unknown;
    }
  >;
  versions?: Record<string, number>;
}) {
  const requests: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const requestUrl =
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(requestUrl);
    requests.push(url.pathname);

    const packageMatch = url.pathname.match(/^\/api\/v1\/packages\/([^/]+)$/u);
    if (packageMatch) {
      const packageName = decodeURIComponent(packageMatch[1]);
      const packageResponse = config.packages[packageName];
      if (!packageResponse) {
        throw new Error(`Unexpected package detail request for ${packageName}`);
      }
      return new Response(JSON.stringify(packageResponse.body ?? {}), {
        status: packageResponse.status,
      });
    }

    const trustedPublisherMatch = url.pathname.match(
      /^\/api\/v1\/packages\/([^/]+)\/trusted-publisher$/u,
    );
    if (trustedPublisherMatch) {
      const packageName = decodeURIComponent(trustedPublisherMatch[1]);
      const trustedPublisherResponse = config.trustedPublishers?.[packageName];
      if (!trustedPublisherResponse) {
        throw new Error(`Unexpected trusted-publisher request for ${packageName}`);
      }
      return new Response(JSON.stringify(trustedPublisherResponse.body ?? {}), {
        status: trustedPublisherResponse.status,
      });
    }

    const versionMatch = url.pathname.match(/^\/api\/v1\/packages\/([^/]+)\/versions\/([^/]+)$/u);
    if (versionMatch) {
      const packageName = decodeURIComponent(versionMatch[1]);
      const version = decodeURIComponent(versionMatch[2]);
      const status = config.versions?.[`${packageName}@${version}`];
      if (!status) {
        throw new Error(`Unexpected version detail request for ${packageName}@${version}`);
      }
      return new Response("{}", { status });
    }

    throw new Error(`Unexpected OriroHub request to ${url.pathname}`);
  };

  return { fetchImpl, requests };
}

function git(cwd: string, args: string[]) {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}
