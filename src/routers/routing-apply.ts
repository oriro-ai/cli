// ORIRO Step 6 — wire the Best-Router Mux into the live turn (gap C). Maps the selected
// pool, ordered by the Mux's health/latency ranking, into the base model resolver's
// { primary, fallbacks } shape. The agent then uses the best router first and fails over
// through the rest automatically — reusing the base's own failover machinery, Mux-ordered.
import { mutateConfigFile } from "../config/mutate.js";
import { loadMuxState, RouterMux } from "./mux.js";
import { loadPool } from "./pool.js";

export interface AppliedRouting {
  primary?: string;
  fallbacks: string[];
}

/** Order the pool best-first (Mux health/latency); pool order for not-yet-ranked routers. */
function rankPool(dir: string, pool: string[]): string[] {
  const mux = new RouterMux(pool);
  mux.load(loadMuxState(dir));
  const ranked = mux.ranked(); // healthy + fastest-first (may omit cooling-down)
  return [...ranked, ...pool.filter((id) => !ranked.includes(id))];
}

/** Apply the selected pool to agents.defaults.model as { primary, fallbacks }. */
export async function applyPoolToModel(dir: string): Promise<AppliedRouting> {
  const pool = loadPool(dir);
  if (pool.length === 0) return { fallbacks: [] };
  const order = rankPool(dir, pool);
  let applied: AppliedRouting = { fallbacks: [] };
  await mutateConfigFile({
    mutate: (draft) => {
      const models = (draft.models ?? {}) as {
        providers?: Record<string, { models?: { id: string }[] }>;
      };
      const providers = models.providers ?? {};
      const refs = order
        .map((id) => {
          const m = providers[id]?.models?.[0]?.id;
          return m ? `${id}/${m}` : undefined;
        })
        .filter((x): x is string => Boolean(x));
      if (refs.length === 0) return;
      const agents = (draft.agents ??= {}) as { defaults?: { model?: unknown } };
      const defaults = (agents.defaults ??= {});
      defaults.model = { primary: refs[0], fallbacks: refs.slice(1) };
      applied = { primary: refs[0], fallbacks: refs.slice(1) };
    },
  });
  return applied;
}
