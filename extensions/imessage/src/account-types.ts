// Imessage plugin module implements account types behavior.
import type { OriroConfig } from "oriro/plugin-sdk/config-contracts";

export type IMessageAccountConfig = Omit<
  NonNullable<NonNullable<OriroConfig["channels"]>["imessage"]>,
  "accounts" | "defaultAccount"
>;
