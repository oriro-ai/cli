import type { OriroConfig } from "../config/types.oriro.js";

export const POST_CORE_UPDATE_SOURCE_CONFIG_PATH_ENV =
  "ORIRO_UPDATE_POST_CORE_SOURCE_CONFIG_PATH";

export type PreUpdateConfigRestoreInput = {
  sourceConfig: OriroConfig;
  authoredConfig: OriroConfig;
};
