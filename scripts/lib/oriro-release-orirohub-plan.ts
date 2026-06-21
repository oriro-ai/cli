// Oriro release OriroHub plan script supports release workflow routing.
import { resolve } from "node:path";
import {
  collectPluginOriroHubReleasePlan,
  type PublishablePluginPackage,
} from "./plugin-orirohub-release.ts";
import {
  parsePluginReleaseSelection,
  parsePluginReleaseSelectionMode,
  type PluginReleaseSelectionMode,
} from "./plugin-npm-release.ts";

type OriroHubPlanPackage = Pick<PublishablePluginPackage, "packageName">;

type OriroHubDispatchInputs = Record<string, string>;

type OriroHubDispatchTarget = {
  workflow: "plugin-orirohub-release.yml" | "plugin-orirohub-new.yml";
  ref: string;
  shouldDispatch: boolean;
  packages: string[];
  inputs: OriroHubDispatchInputs;
};

export type OriroReleaseOriroHubPlanArgs = {
  releaseTag: string;
  releasePublishBranch: string;
  releasePublishRunId: string;
  pluginPublishScope: PluginReleaseSelectionMode;
  plugins: string[];
};

export type OriroReleaseOriroHubPlan = {
  oriroHubWorkflowRef: string;
  releasePublishBranch: string;
  normal: OriroHubDispatchTarget;
  bootstrap: OriroHubDispatchTarget;
  summary: {
    normalCount: number;
    bootstrapCount: number;
    missingTrustedPublisherCount: number;
    normalPlugins: string;
    bootstrapPlugins: string;
    missingTrustedPlugins: string;
  };
  verifier: {
    oriroHubWorkflowRef: string;
  };
};

export type OriroReleaseOriroHubRuntimeStateArgs = {
  repository: string;
  waitForOriroHub: boolean;
  forceSkipOriroHub: boolean;
  normalRunId?: string;
  bootstrapRunId?: string;
  bootstrapCompleted: boolean;
};

export type OriroReleaseOriroHubRuntimeState = {
  verifierArgs: string[];
  proofLines: {
    normal: string;
    bootstrap: string;
  };
};

function requireArg(value: string | undefined, label: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }
  return trimmed;
}

function packageNames(packages: readonly OriroHubPlanPackage[]): string[] {
  return packages.map((plugin) => plugin.packageName);
}

function joinPackageNames(packages: readonly string[]): string {
  return packages.join(",");
}

function optionalArg(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function runUrl(repository: string, runId: string): string {
  return `https://github.com/${repository}/actions/runs/${runId}`;
}

function assertNoPackageOverlap(
  normalPackages: readonly string[],
  bootstrapPackages: readonly string[],
) {
  const normalPackageSet = new Set(normalPackages);
  const overlap = bootstrapPackages.filter((packageName) => normalPackageSet.has(packageName));
  if (overlap.length > 0) {
    throw new Error(
      `OriroHub release plan routed package(s) to both normal and bootstrap workflows: ${overlap.join(", ")}.`,
    );
  }
}

function createDispatchTarget(params: {
  workflow: OriroHubDispatchTarget["workflow"];
  ref: string;
  packages: readonly string[];
  releasePublishRunId: string;
  releasePublishBranch: string;
  includePublishScope: boolean;
}): OriroHubDispatchTarget {
  if (params.packages.length === 0) {
    return {
      workflow: params.workflow,
      ref: params.ref,
      shouldDispatch: false,
      packages: [],
      inputs: {},
    };
  }

  const plugins = joinPackageNames(params.packages);
  return {
    workflow: params.workflow,
    ref: params.ref,
    shouldDispatch: true,
    packages: [...params.packages],
    inputs: {
      ...(params.includePublishScope ? { publish_scope: "selected" } : {}),
      plugins,
      release_publish_run_id: params.releasePublishRunId,
      release_publish_branch: params.releasePublishBranch,
    },
  };
}

export function buildOriroReleaseOriroHubRuntimeState(
  args: OriroReleaseOriroHubRuntimeStateArgs,
): OriroReleaseOriroHubRuntimeState {
  const repository = requireArg(args.repository, "repository");
  const normalRunId = optionalArg(args.normalRunId);
  const bootstrapRunId = optionalArg(args.bootstrapRunId);

  const shouldIncludeNormalRun =
    !args.forceSkipOriroHub && normalRunId !== undefined && args.waitForOriroHub;
  const shouldIncludeBootstrapRun =
    !args.forceSkipOriroHub && bootstrapRunId !== undefined && args.bootstrapCompleted;
  const shouldVerifyOriroHubPackages =
    bootstrapRunId !== undefined &&
    args.bootstrapCompleted &&
    (normalRunId === undefined || args.waitForOriroHub);
  const shouldSkipOriroHubPackages =
    args.forceSkipOriroHub || !(shouldIncludeNormalRun || shouldVerifyOriroHubPackages);

  const verifierArgs = shouldSkipOriroHubPackages ? ["--skip-orirohub"] : [];
  if (shouldIncludeNormalRun) {
    verifierArgs.push("--plugin-orirohub-run", normalRunId);
  }
  if (shouldIncludeBootstrapRun) {
    verifierArgs.push("--plugin-orirohub-bootstrap-run", bootstrapRunId);
  }

  let normalProofLine = "- plugin OriroHub publish: no normal OIDC candidates";
  if (normalRunId !== undefined && args.waitForOriroHub) {
    normalProofLine = `- plugin OriroHub publish: ${runUrl(repository, normalRunId)}`;
  } else if (normalRunId !== undefined) {
    normalProofLine = `- plugin OriroHub publish: dispatched separately, not awaited by this proof: ${runUrl(repository, normalRunId)}`;
  }

  let bootstrapProofLine = "- plugin OriroHub bootstrap: not needed";
  if (bootstrapRunId !== undefined && (args.bootstrapCompleted || args.waitForOriroHub)) {
    bootstrapProofLine = `- plugin OriroHub bootstrap: ${runUrl(repository, bootstrapRunId)}`;
  } else if (bootstrapRunId !== undefined) {
    bootstrapProofLine = `- plugin OriroHub bootstrap: dispatched separately, not awaited by this proof: ${runUrl(repository, bootstrapRunId)}`;
  }

  return {
    verifierArgs,
    proofLines: {
      normal: normalProofLine,
      bootstrap: bootstrapProofLine,
    },
  };
}

export function parseOriroReleaseOriroHubPlanArgs(
  argv: string[],
): OriroReleaseOriroHubPlanArgs {
  const values = [...argv];
  if (values[0] === "--") {
    values.shift();
  }

  let releaseTag: string | undefined;
  let releasePublishBranch: string | undefined;
  let releasePublishRunId: string | undefined;
  let pluginPublishScope: PluginReleaseSelectionMode | undefined;
  let plugins: string[] = [];
  let pluginsFlagProvided = false;

  for (let index = 0; index < values.length; index += 1) {
    const arg = values[index];
    const next = () => {
      const value = values[index + 1];
      if (value === undefined || value.startsWith("-")) {
        throw new Error(`${arg} requires a value.`);
      }
      index += 1;
      return value;
    };

    switch (arg) {
      case "--release-tag":
        releaseTag = next();
        break;
      case "--release-publish-branch":
        releasePublishBranch = next();
        break;
      case "--release-publish-run-id":
        releasePublishRunId = next();
        break;
      case "--plugin-publish-scope":
        pluginPublishScope = parsePluginReleaseSelectionMode(next());
        break;
      case "--plugins":
        plugins = parsePluginReleaseSelection(next());
        pluginsFlagProvided = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  const resolvedPluginPublishScope = pluginPublishScope ?? "all-publishable";
  if (pluginsFlagProvided && plugins.length === 0) {
    throw new Error("--plugins must include at least one package name.");
  }
  if (resolvedPluginPublishScope === "selected" && !pluginsFlagProvided) {
    throw new Error("plugin-publish-scope=selected requires --plugins.");
  }
  if (resolvedPluginPublishScope === "all-publishable" && pluginsFlagProvided) {
    throw new Error("plugin-publish-scope=all-publishable must not be combined with --plugins.");
  }

  return {
    releaseTag: requireArg(releaseTag, "--release-tag"),
    releasePublishBranch: requireArg(releasePublishBranch, "--release-publish-branch"),
    releasePublishRunId: requireArg(releasePublishRunId, "--release-publish-run-id"),
    pluginPublishScope: resolvedPluginPublishScope,
    plugins,
  };
}

export async function buildOriroReleaseOriroHubPlan(
  args: OriroReleaseOriroHubPlanArgs,
  options: {
    rootDir?: string;
    fetchImpl?: typeof fetch;
    registryBaseUrl?: string;
  } = {},
): Promise<OriroReleaseOriroHubPlan> {
  const releaseTag = requireArg(args.releaseTag, "releaseTag");
  const releasePublishBranch = requireArg(args.releasePublishBranch, "releasePublishBranch");
  const releasePublishRunId = requireArg(args.releasePublishRunId, "releasePublishRunId");
  const plan = await collectPluginOriroHubReleasePlan({
    rootDir: options.rootDir ?? resolve("."),
    selection: args.plugins,
    selectionMode: args.pluginPublishScope,
    fetchImpl: options.fetchImpl,
    registryBaseUrl: options.registryBaseUrl,
  });

  const normalPackages = packageNames(plan.candidates);
  const bootstrapPackages = [
    ...packageNames(plan.bootstrapCandidates),
    ...packageNames(plan.missingTrustedPublisher),
  ];
  const missingTrustedPlugins = packageNames(plan.missingTrustedPublisher);
  assertNoPackageOverlap(normalPackages, bootstrapPackages);

  return {
    oriroHubWorkflowRef: releaseTag,
    releasePublishBranch,
    normal: createDispatchTarget({
      workflow: "plugin-orirohub-release.yml",
      ref: releaseTag,
      packages: normalPackages,
      releasePublishRunId,
      releasePublishBranch,
      includePublishScope: true,
    }),
    bootstrap: createDispatchTarget({
      workflow: "plugin-orirohub-new.yml",
      ref: releaseTag,
      packages: bootstrapPackages,
      releasePublishRunId,
      releasePublishBranch,
      includePublishScope: false,
    }),
    summary: {
      normalCount: normalPackages.length,
      bootstrapCount: bootstrapPackages.length,
      missingTrustedPublisherCount: missingTrustedPlugins.length,
      normalPlugins: joinPackageNames(normalPackages),
      bootstrapPlugins: joinPackageNames(bootstrapPackages),
      missingTrustedPlugins: joinPackageNames(missingTrustedPlugins),
    },
    verifier: {
      oriroHubWorkflowRef: releaseTag,
    },
  };
}
