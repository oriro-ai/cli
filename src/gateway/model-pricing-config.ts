// Gateway model-pricing config helper.
// Resolves whether cost/pricing metadata should be available to Gateway surfaces.
import type { OriroConfig } from "../config/types.oriro.js";

/** Returns whether gateway model pricing/cost metadata should be shown. */
export function isGatewayModelPricingEnabled(config: OriroConfig): boolean {
  return config.models?.pricing?.enabled !== false;
}
