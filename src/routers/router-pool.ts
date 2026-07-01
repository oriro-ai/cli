// ORIRO Step 6 — the router pool (replaces the donor's OpenClaw `register.ts`/`routing-apply.ts`
// which wrote `models.providers` via mutateConfigFile). On Pi there is no such config: adding a
// router = live-validate → store its resolved config → add it to the user's pool; the Best-Router
// Mux sources its routers from that pool (falling back to the keyless floor when empty).
// Local-only, dependency-free, zero OpenClaw footprint.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { oriroDir } from "../config/paths.js";
import { loadPool, savePool } from "./pool.js";
import { validateRouter, type ValidateResult } from "./validate.js";
import type { RouterEntry } from "./catalog.js";
import type { KeylessRouter } from "./floor.js";

/** Obviously-fake bearer for keyless routers: satisfies the SDK; tolerant endpoints ignore it. */
export const KEYLESS_SENTINEL = "oriro-keyless-no-key-required";

function regFile(): string {
  return join(oriroDir(), "routers", "registered.json");
}
function readReg(): Record<string, KeylessRouter> {
  try {
    return JSON.parse(readFileSync(regFile(), "utf8")) as Record<string, KeylessRouter>;
  } catch {
    return {};
  }
}
function writeReg(m: Record<string, KeylessRouter>): void {
  mkdirSync(join(oriroDir(), "routers"), { recursive: true });
  writeFileSync(regFile(), JSON.stringify(m, null, 2), "utf8");
}

export interface AddResult {
  ok: boolean;
  validation: ValidateResult;
}

/** Live-validate a catalog router, then register its config + add it to the pool. Never throws. */
export async function addRouter(entry: RouterEntry, opts?: { key?: string; modelId?: string }): Promise<AddResult> {
  if (entry.comingSoon) {
    return { ok: false, validation: { ok: false, latencyMs: 0, model: "", error: "coming soon" } };
  }
  // Only chat routers belong in the model pool — an image/speech endpoint that happened to answer
  // /chat/completions must not be admitted as the agent's brain.
  if (entry.kind && entry.kind !== "chat") {
    return { ok: false, validation: { ok: false, latencyMs: 0, model: "", error: `'${entry.id}' is a ${entry.kind} router, not a chat router` } };
  }
  const key = opts?.key ?? (entry.keyless ? KEYLESS_SENTINEL : undefined);
  const v = await validateRouter(entry, key, opts?.modelId);
  if (!v.ok) return { ok: false, validation: v }; // nothing fake/broken gets in

  const router: KeylessRouter = {
    id: entry.id,
    name: entry.displayName,
    baseUrl: entry.baseUrl,
    model: opts?.modelId ?? v.model ?? entry.freeModels[0] ?? "",
    apiKey: key ?? KEYLESS_SENTINEL,
  };
  const reg = readReg();
  reg[entry.id] = router;
  writeReg(reg);
  savePool(oriroDir(), [...loadPool(oriroDir()), entry.id]);
  return { ok: true, validation: v };
}

/** Multi-select: set the active router pool. Only ids that are actually registered are persisted —
 *  dangling/garbage ids are dropped (and reported) instead of being silently written to disk. */
export function useRouters(ids: string[]): { applied: string[]; unknown: string[] } {
  const reg = readReg();
  const applied = ids.filter((id) => reg[id]);
  const unknown = ids.filter((id) => !reg[id]);
  // Only persist when at least one id is valid. An all-invalid `use` (e.g. a typo) must be a
  // no-op — NOT clobber the user's existing active pool to empty.
  if (applied.length > 0) savePool(oriroDir(), applied);
  return { applied, unknown };
}

/** Every router the user has registered (catalog + custom --url adds), for display/inspection. */
export function registeredRouters(): KeylessRouter[] {
  return Object.values(readReg());
}

/** The user's selected pool resolved to KeylessRouter[] for the Mux (empty → caller uses the floor). */
export function resolvePool(): KeylessRouter[] {
  const reg = readReg();
  return loadPool(oriroDir())
    .map((id) => reg[id])
    .filter((r): r is KeylessRouter => Boolean(r));
}
