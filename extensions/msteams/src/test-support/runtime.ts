// Msteams plugin module implements runtime behavior.
import os from "node:os";
import path from "node:path";
import type { OpenKeyedStoreOptions } from "oriro/plugin-sdk/plugin-state-runtime";
import { createPluginStateKeyedStoreForTests } from "oriro/plugin-sdk/plugin-state-test-runtime";
import type { PluginRuntime } from "../../runtime-api.js";

export const msteamsRuntimeStub = {
  state: {
    openKeyedStore: (options: OpenKeyedStoreOptions) =>
      createPluginStateKeyedStoreForTests("msteams", options),
    resolveStateDir: (env: NodeJS.ProcessEnv = process.env, homedir?: () => string) => {
      const override = env.ORIRO_STATE_DIR?.trim() || env.ORIRO_STATE_DIR?.trim();
      if (override) {
        return override;
      }
      const resolvedHome = homedir ? homedir() : os.homedir();
      return path.join(resolvedHome, ".oriro");
    },
  },
} as unknown as PluginRuntime;
