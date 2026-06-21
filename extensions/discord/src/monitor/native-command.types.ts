// Discord type declarations define plugin contracts.
import type { OriroConfig } from "oriro/plugin-sdk/config-contracts";
import type { CommandArgValues } from "oriro/plugin-sdk/native-command-registry";

export type DiscordConfig = NonNullable<OriroConfig["channels"]>["discord"];

export type DiscordCommandArgs = {
  raw?: string;
  values?: CommandArgValues;
};
