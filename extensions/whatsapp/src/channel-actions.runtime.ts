// Whatsapp plugin module implements channel actions behavior.
import { createActionGate } from "oriro/plugin-sdk/channel-actions";
import type { ChannelMessageActionName } from "oriro/plugin-sdk/channel-contract";
import type { OriroConfig } from "oriro/plugin-sdk/config-contracts";

export { listWhatsAppAccountIds, resolveWhatsAppAccount } from "./accounts.js";
export { resolveWhatsAppReactionLevel } from "./reaction-level.js";
export { createActionGate, type ChannelMessageActionName, type OriroConfig };
