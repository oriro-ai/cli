/** Provider-index-backed model catalog rows for bundled model-list output. */
import { normalizeModelCatalogProviderId } from "@oriro/model-catalog-core/model-catalog-refs";
import type { NormalizedModelCatalogRow } from "@oriro/model-catalog-core/model-catalog-types";
import type { OriroConfig } from "../../config/types.oriro.js";
import {
  loadOriroProviderIndex,
  planProviderIndexModelCatalogRows,
} from "../../model-catalog/index.js";
import { normalizePluginsConfig, resolveEffectiveEnableState } from "../../plugins/config-state.js";

/** Loads enabled bundled provider-index catalog rows, optionally scoped by provider. */
export function loadProviderIndexCatalogRowsForList(params: {
  providerFilter?: string;
  cfg: OriroConfig;
}): readonly NormalizedModelCatalogRow[] {
  const providerFilter = params.providerFilter
    ? normalizeModelCatalogProviderId(params.providerFilter)
    : undefined;
  const index = loadOriroProviderIndex();
  return planProviderIndexModelCatalogRows({
    index,
    ...(providerFilter ? { providerFilter } : {}),
  })
    .entries.filter(
      (entry) =>
        resolveEffectiveEnableState({
          id: entry.pluginId,
          origin: "bundled",
          config: normalizePluginsConfig(params.cfg.plugins),
          rootConfig: params.cfg,
          enabledByDefault: true,
        }).enabled,
    )
    .flatMap((entry) => entry.rows);
}
