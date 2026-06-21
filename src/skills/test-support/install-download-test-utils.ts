// Install download test utilities provide isolated state and workspace paths.
import {
  createOriroTestState,
  type OriroTestState,
} from "../../test-utils/oriro-test-state.js";

/** Creates isolated Oriro state for install download tests. */
export async function createInstallDownloadTestState(): Promise<OriroTestState> {
  return await createOriroTestState({
    layout: "state-only",
    prefix: "oriro-skills-install-",
  });
}
