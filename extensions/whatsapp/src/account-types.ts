// Whatsapp plugin module implements account types behavior.
import type { OriroConfig } from "oriro/plugin-sdk/config-contracts";

export type WhatsAppAccountConfig = NonNullable<
  NonNullable<NonNullable<OriroConfig["channels"]>["whatsapp"]>["accounts"]
>[string];
