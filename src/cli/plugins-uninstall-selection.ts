// Plugin uninstall id resolver for registry ids, display names, npm specs, and OriroHub specs.
import type { OriroConfig } from "../config/types.oriro.js";
import { parseOriroHubPluginSpec } from "../infra/orirohub-spec.js";
import type { PluginRecord } from "../plugins/registry.js";

/** Resolve user input to the plugin id that should be removed from config/install records. */
export function resolvePluginUninstallId<
  TPlugin extends Pick<PluginRecord, "id" | "name">,
>(params: {
  rawId: string;
  config: OriroConfig;
  plugins: TPlugin[];
}): { pluginId: string; plugin?: TPlugin } {
  const rawId = params.rawId.trim();
  const plugin = params.plugins.find((entry) => entry.id === rawId || entry.name === rawId);
  if (plugin) {
    return { pluginId: plugin.id, plugin };
  }

  for (const [pluginId, install] of Object.entries(params.config.plugins?.installs ?? {})) {
    if (
      install.spec === rawId ||
      install.resolvedSpec === rawId ||
      install.resolvedName === rawId ||
      install.marketplacePlugin === rawId
    ) {
      return { pluginId };
    }
  }

  const requestedOriroHub = parseOriroHubPluginSpec(rawId);
  if (requestedOriroHub) {
    for (const [pluginId, install] of Object.entries(params.config.plugins?.installs ?? {})) {
      const installedOriroHubName =
        install.orirohubPackage ??
        parseOriroHubPluginSpec(install.spec ?? "")?.name ??
        parseOriroHubPluginSpec(install.resolvedSpec ?? "")?.name;
      if (installedOriroHubName === requestedOriroHub.name) {
        return { pluginId };
      }
    }
  }

  return { pluginId: rawId };
}
