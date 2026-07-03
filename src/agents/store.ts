// ORIRO Agents — the STORE. An Agent is a saved workflow-automation unit: a task + a bound router
// (its brain) + an optional schedule. It is inert on disk and only comes alive when run() drives it
// on a router. Persisted under ~/.oriro/agents/<name>.json (override root via ORIRO_STATE_DIR).
// Local-only, dependency-free — same shape as skills/routers persistence. Nothing leaves the device.
import { mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { oriroDir } from "../config/paths.js";

/** A saved agent definition. `router` binds the brain (a registered router id); omitted = active pool. */
export interface AgentDef {
  name: string; // unique slug
  description?: string;
  task: string; // the workflow / instructions — the "what to do"
  router?: string; // bound router id (the brain). Omitted → the user's active pool / keyless floor.
  cwd?: string; // working dir for the automation (default: cwd at run time)
  schedule?: string; // automation cadence: Nm | Nh | Nd | hourly | daily. Omitted → manual run only.
  createdAt: string;
  updatedAt: string;
}

/** Per-agent runtime state (kept apart from the definition so edits don't clobber run history). */
export interface AgentState {
  [name: string]: { lastRunAt?: number; lastOk?: boolean };
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** A valid agent name is a lowercase slug — safe as a filename and a chat handle. */
export function isValidAgentName(name: string): boolean {
  return SLUG.test(name);
}

export function agentsDir(): string {
  return join(oriroDir(), "agents");
}
function agentFile(name: string): string {
  return join(agentsDir(), `${name}.json`);
}
function stateFile(): string {
  return join(agentsDir(), ".state.json");
}

/** Every saved agent, sorted by name. Corrupt/half-written files are skipped, never thrown. */
export function listAgents(): AgentDef[] {
  const dir = agentsDir();
  if (!existsSync(dir)) return [];
  const out: AgentDef[] = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json") || f.startsWith(".")) continue;
    try {
      const def = JSON.parse(readFileSync(join(dir, f), "utf8")) as AgentDef;
      if (def && typeof def.name === "string" && typeof def.task === "string") out.push(def);
    } catch {
      /* skip a corrupt agent file rather than crash the whole list */
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export function loadAgent(name: string): AgentDef | undefined {
  try {
    return JSON.parse(readFileSync(agentFile(name), "utf8")) as AgentDef;
  } catch {
    return undefined;
  }
}

/** Create or overwrite an agent. Validates the name; preserves createdAt on update. */
export function saveAgent(def: AgentDef): void {
  if (!isValidAgentName(def.name)) {
    throw new Error(`invalid agent name '${def.name}' — use lowercase letters, digits and hyphens`);
  }
  mkdirSync(agentsDir(), { recursive: true });
  writeFileSync(agentFile(def.name), JSON.stringify(def, null, 2), "utf8");
}

/** Remove an agent + its run state. Returns false if it wasn't there (no false-positive). */
export function removeAgent(name: string): boolean {
  const file = agentFile(name);
  if (!existsSync(file)) return false;
  rmSync(file, { force: true });
  const state = loadState();
  if (state[name]) {
    delete state[name];
    saveState(state);
  }
  return true;
}

export function loadState(): AgentState {
  try {
    return JSON.parse(readFileSync(stateFile(), "utf8")) as AgentState;
  } catch {
    return {};
  }
}
export function saveState(state: AgentState): void {
  mkdirSync(agentsDir(), { recursive: true });
  writeFileSync(stateFile(), JSON.stringify(state, null, 2), "utf8");
}

/** Record that an agent just ran (drives `isDue` for scheduled automation). */
export function markRun(name: string, ok: boolean, at: number): void {
  const state = loadState();
  state[name] = { lastRunAt: at, lastOk: ok };
  saveState(state);
}

/** Parse a schedule spec into an interval in ms. undefined = not schedulable (manual only). */
export function parseScheduleMs(spec?: string): number | undefined {
  if (!spec) return undefined;
  const s = spec.trim().toLowerCase();
  if (s === "hourly") return 3_600_000;
  if (s === "daily") return 86_400_000;
  const m = /^(\d+)\s*(m|h|d)$/.exec(s);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (n <= 0) return undefined;
  const mult = m[2] === "m" ? 60_000 : m[2] === "h" ? 3_600_000 : 86_400_000;
  return n * mult;
}

/** Is a scheduled agent due to run now? (Never-run scheduled agents are due on the first tick.) */
export function isDue(def: AgentDef, state: AgentState, now: number): boolean {
  const ms = parseScheduleMs(def.schedule);
  if (ms === undefined) return false;
  const last = state[def.name]?.lastRunAt ?? 0;
  return now - last >= ms;
}
