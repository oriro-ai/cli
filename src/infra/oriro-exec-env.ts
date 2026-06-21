/** Process env key that marks child commands as launched by the Oriro CLI. */
export const ORIRO_CLI_ENV_VAR = "ORIRO_CLI";

/** Stable marker value used for Oriro-launched subprocess detection. */
export const ORIRO_CLI_ENV_VALUE = "1";

/** Returns a cloned env object with the Oriro CLI marker set. */
export function markOriroExecEnv<T extends Record<string, string | undefined>>(
  /** Source environment to clone before adding the subprocess marker. */
  env: T,
): T {
  return {
    ...env,
    [ORIRO_CLI_ENV_VAR]: ORIRO_CLI_ENV_VALUE,
  };
}

/** Mutates an existing process env object so current-process children inherit the marker. */
export function ensureOriroExecMarkerOnProcess(
  /** Process env object to mutate; defaults to the current process environment. */
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  env[ORIRO_CLI_ENV_VAR] = ORIRO_CLI_ENV_VALUE;
  return env;
}
