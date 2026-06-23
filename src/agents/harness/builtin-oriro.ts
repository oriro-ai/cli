/**
 * Built-in Oriro harness registration.
 *
 * Harness selection uses this factory to expose the embedded Oriro runtime
 * through the same AgentHarness contract as external harness plugins.
 */
import { ORIRO_EMBEDDED_CONTEXT_ENGINE_HOST } from "../../context-engine/host-compat.js";
import { runEmbeddedAttempt } from "../embedded-agent-runner/run/attempt.js";
import type { AgentHarness } from "./types.js";

/** Creates the built-in harness backed by the embedded Oriro agent runner. */
export function createOriroAgentHarness(): AgentHarness {
  return {
    id: "oriro",
    label: "ORIRO embedded agent",
    contextEngineHostCapabilities: ORIRO_EMBEDDED_CONTEXT_ENGINE_HOST.capabilities,
    supports: () => ({ supported: true, priority: 0 }),
    runAttempt: runEmbeddedAttempt,
  };
}
