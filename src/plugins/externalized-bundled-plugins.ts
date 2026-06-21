// Defines metadata for bundled plugins that are installed externally.
export type ExternalizedBundledPluginPreferredSource = "npm" | "orirohub";

export type ExternalizedBundledPluginBridge = {
  /** Plugin id used while the plugin was bundled in core. */
  bundledPluginId: string;
  /** Plugin id declared by the external package. Defaults to bundledPluginId. */
  pluginId?: string;
  /** Preferred external source when migrating the bundled plugin out. Defaults to npm. */
  preferredSource?: ExternalizedBundledPluginPreferredSource;
  /** npm spec Oriro can install when migrating the bundled plugin out. */
  npmSpec?: string;
  /** OriroHub spec Oriro can install when migrating the bundled plugin out. */
  orirohubSpec?: string;
  /** Optional OriroHub base URL for non-default registries. */
  orirohubUrl?: string;
  /** Bundled directory name, when it differs from bundledPluginId. */
  bundledDirName?: string;
  /** Previous bundled manifest default enablement from the persisted registry. */
  enabledByDefault?: boolean;
  /** Legacy ids that should be treated as this plugin during enablement checks. */
  legacyPluginIds?: readonly string[];
  /** Channel ids that imply this plugin is enabled when configured. */
  channelIds?: readonly string[];
  /** Plugin ids this external package supersedes for channel selection. */
  preferOver?: readonly string[];
};

function normalizePluginId(value: string | undefined): string {
  return value?.trim() ?? "";
}

function normalizeOptionalSpec(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function getExternalizedBundledPluginPreferredSource(
  bridge: ExternalizedBundledPluginBridge,
): ExternalizedBundledPluginPreferredSource {
  if (bridge.preferredSource === "orirohub") {
    return "orirohub";
  }
  if (bridge.preferredSource === "npm") {
    return "npm";
  }
  return normalizeOptionalSpec(bridge.orirohubSpec) && !normalizeOptionalSpec(bridge.npmSpec)
    ? "orirohub"
    : "npm";
}

export function getExternalizedBundledPluginNpmSpec(
  bridge: ExternalizedBundledPluginBridge,
): string {
  return normalizeOptionalSpec(bridge.npmSpec);
}

export function getExternalizedBundledPluginOriroHubSpec(
  bridge: ExternalizedBundledPluginBridge,
): string {
  return normalizeOptionalSpec(bridge.orirohubSpec);
}

export function getExternalizedBundledPluginTargetId(
  bridge: ExternalizedBundledPluginBridge,
): string {
  return normalizePluginId(bridge.pluginId) || normalizePluginId(bridge.bundledPluginId);
}

export function getExternalizedBundledPluginLookupIds(
  bridge: ExternalizedBundledPluginBridge,
): readonly string[] {
  return Array.from(
    new Set(
      [
        bridge.bundledPluginId,
        bridge.pluginId,
        ...(bridge.legacyPluginIds ?? []),
        ...(bridge.channelIds ?? []),
      ]
        .map(normalizePluginId)
        .filter(Boolean),
    ),
  );
}

export function getExternalizedBundledPluginLegacyPathSuffix(
  bridge: ExternalizedBundledPluginBridge,
): string {
  const bundledDirName = bridge.bundledDirName ?? bridge.bundledPluginId;
  return ["extensions", bundledDirName].join("/");
}
