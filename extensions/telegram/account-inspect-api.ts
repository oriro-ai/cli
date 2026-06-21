// Telegram API module exposes the plugin public contract.
import type { OriroConfig } from "./runtime-api.js";
import { inspectTelegramAccount } from "./src/account-inspect.js";

export function inspectTelegramReadOnlyAccount(cfg: OriroConfig, accountId?: string | null) {
  return inspectTelegramAccount({ cfg, accountId });
}
