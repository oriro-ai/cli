// Discord API module exposes the plugin public contract.
import type { OriroConfig } from "oriro/plugin-sdk/config-contracts";
import { inspectDiscordAccount } from "./src/account-inspect.js";

export function inspectDiscordReadOnlyAccount(cfg: OriroConfig, accountId?: string | null) {
  return inspectDiscordAccount({ cfg, accountId });
}
