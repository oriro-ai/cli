// Qqbot plugin module implements qqbot test support behavior.
import type { OriroConfig } from "oriro/plugin-sdk/config-contracts";

export function makeQqbotSecretRefConfig(): OriroConfig {
  return {
    channels: {
      qqbot: {
        appId: "123456",
        clientSecret: {
          source: "env",
          provider: "default",
          id: "QQBOT_CLIENT_SECRET",
        },
      },
    },
  } as OriroConfig;
}

export function makeQqbotDefaultAccountConfig(): OriroConfig {
  return {
    channels: {
      qqbot: {
        defaultAccount: "bot2",
        accounts: {
          bot2: { appId: "123456" },
        },
      },
    },
  } as OriroConfig;
}
