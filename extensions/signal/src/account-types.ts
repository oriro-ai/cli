// Signal plugin module implements account types behavior.
import type { OriroConfig } from "oriro/plugin-sdk/config-contracts";

export type SignalAccountConfig = Omit<
  Exclude<NonNullable<OriroConfig["channels"]>["signal"], undefined>,
  "accounts"
>;
