// Slack API module exposes the plugin public contract.
import type { OriroConfig } from "oriro/plugin-sdk/config-contracts";
import { inspectSlackAccount } from "./src/account-inspect.js";

export function inspectSlackReadOnlyAccount(cfg: OriroConfig, accountId?: string | null) {
  return inspectSlackAccount({ cfg, accountId });
}
