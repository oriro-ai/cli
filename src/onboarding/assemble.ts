// ORIRO onboarding — the ASSEMBLER. Builds one Pi session with EVERY ORIRO module wired:
// keyless Mux model + Guardian gate + Head tool + Scriber + Orchestrator (as Pi extension
// factories) + the bundled skills (via additionalSkillPaths). This is what turns the proven
// modules into the actual CLI. Keyless by construction — Pi never sees a paid model. Zero footprint.
import {
  createAgentSession,
  AuthStorage,
  ModelRegistry,
  SessionManager,
  SettingsManager,
  DefaultResourceLoader,
  getAgentDir,
} from "@earendil-works/pi-coding-agent";
import type { AgentSession } from "@earendil-works/pi-coding-agent";
import { registerOriroMux } from "../routers/mux-provider.js";
import { registerGuardian } from "../guardian/pi-gate.js";
import { registerHead } from "../head/pi-tool.js";
import { registerScribe, attachScribe } from "../scribe/scribe-pi.js";
import { registerOrchestrator } from "../orchestrate.js";
import { registerAgentRunner } from "../agents/pi-tool.js";
import { skillRoots } from "../skills/loader.js";
import type { KeylessRouter } from "../routers/floor.js";

export interface AssembledSession {
  session: AgentSession;
  extensionsResult: unknown;
}

/**
 * Assemble a full ORIRO session on Pi. The agent gets: the keyless free-router Mux as its model,
 * Guardian on every tool_call (default-on, fail-closed), the Head `inspect_site` tool, the Scriber
 * `scribe_recall` tool + turn capture (consent-gated), the `deploy_agents` orchestrator, and the
 * 322 bundled skills (CORE in-prompt / TAIL on-demand). Never a paid key.
 */
export async function assembleOriroSession(opts: { cwd?: string; routers?: KeylessRouter[] } = {}): Promise<AssembledSession> {
  const cwd = opts.cwd ?? process.cwd();
  const authStorage = AuthStorage.inMemory();
  const modelRegistry = ModelRegistry.inMemory(authStorage);
  const settingsManager = SettingsManager.create(cwd);

  // Optional bound routers let an Agent run pin its own brain; omitted → the user's active pool/floor.
  const model = registerOriroMux(modelRegistry, opts.routers ? { routers: opts.routers } : {}); // free pool/floor — never a paid key
  if (!model) throw new Error("ORIRO keyless model unavailable");

  const resourceLoader = new DefaultResourceLoader({
    cwd,
    agentDir: getAgentDir(),
    settingsManager,
    additionalSkillPaths: skillRoots(), // bundled library + the user's own ~/.oriro/skills
    extensionFactories: [registerGuardian, registerHead, registerScribe, registerOrchestrator, registerAgentRunner],
  });
  await resourceLoader.reload();

  const { session, extensionsResult } = await createAgentSession({
    model,
    authStorage,
    modelRegistry,
    settingsManager,
    sessionManager: SessionManager.inMemory(),
    resourceLoader,
  });

  attachScribe(session); // capture each turn to the Scriber (no-op unless the user consented)
  return { session, extensionsResult };
}
