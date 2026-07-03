// ORIRO Agents — the CATALOG (dynamic add). Agents are user-extensible like skills & connectors:
// import one from a local JSON file or a URL (a shared/community agent), validate its shape, and save
// it into the user's ~/.oriro/agents. The definition is inert data — nothing runs at add time; every
// action it takes later is still gated by Guardian at run time. Local-only; no telemetry.
import { readFileSync } from "node:fs";
import { isValidAgentName, saveAgent, loadAgent, type AgentDef } from "./store.js";

/** Coerce arbitrary JSON into a valid AgentDef or explain why it can't be one. */
export function parseAgentDef(raw: unknown, now: string): { ok: true; def: AgentDef } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "not a JSON object" };
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name.trim().toLowerCase() : "";
  if (!name) return { ok: false, error: "missing 'name'" };
  if (!isValidAgentName(name)) return { ok: false, error: `invalid name '${name}' (lowercase, digits, hyphens)` };
  const task = typeof o.task === "string" ? o.task.trim() : "";
  if (!task) return { ok: false, error: "missing 'task'" };
  const def: AgentDef = {
    name,
    task,
    ...(typeof o.description === "string" ? { description: o.description } : {}),
    ...(typeof o.router === "string" ? { router: o.router } : {}),
    ...(typeof o.cwd === "string" ? { cwd: o.cwd } : {}),
    ...(typeof o.schedule === "string" ? { schedule: o.schedule } : {}),
    createdAt: now,
    updatedAt: now,
  };
  return { ok: true, def };
}

/** Load raw agent JSON from a local path or an http(s) URL. */
export async function fetchAgentSource(pathOrUrl: string): Promise<unknown> {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    const res = await fetch(pathOrUrl);
    if (!res.ok) throw new Error(`fetch failed: HTTP ${res.status}`);
    return (await res.json()) as unknown;
  }
  return JSON.parse(readFileSync(pathOrUrl, "utf8")) as unknown;
}

export interface AddAgentResult {
  ok: boolean;
  name?: string;
  error?: string;
  overwrote?: boolean;
}

/** Add a community/shared agent from a JSON file or URL into the user's agents. */
export async function addAgentFromSource(pathOrUrl: string, now: string): Promise<AddAgentResult> {
  let raw: unknown;
  try {
    raw = await fetchAgentSource(pathOrUrl);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  const parsed = parseAgentDef(raw, now);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const overwrote = Boolean(loadAgent(parsed.def.name));
  saveAgent(parsed.def);
  return { ok: true, name: parsed.def.name, overwrote };
}
