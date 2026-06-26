// ORIRO Step 6 — the Best-Router Mux. Deterministic load-balancer over the user's
// selected free routers (NOT an LLM agent — that would burn tokens/be circular).
// Per request: route to the best-scoring healthy router (lowest latency, has quota,
// not cooling down); on error/429/timeout, invisible failover to the next-best.
// More routers = more rate-limit headroom + lower latency. Self-healing, key-free logic.
//
// FOLDED CLEAN from oriro-ai/cli src/routers/mux.ts — pure logic, zero OpenClaw footprint
// (only node:fs/node:path). Unchanged on fold; this is the proven engine.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface RouterStat {
  id: string;
  latencyMs: number; // EWMA; Infinity = untried
  healthy: boolean;
  cooldownUntil: number; // epoch ms; > now means rate-limited/parked
  consecutiveErrors: number;
}

export interface CallError {
  status?: number;
  retryAfterMs?: number;
}

const COOLDOWN_DEFAULT_MS = 60_000;
const UNHEALTHY_AFTER = 3;

export class RouterMux {
  private stats = new Map<string, RouterStat>();
  private now: () => number;

  constructor(routerIds: string[], now: () => number = () => Date.now()) {
    this.now = now;
    for (const id of routerIds) {
      this.stats.set(id, {
        id,
        latencyMs: Number.POSITIVE_INFINITY,
        healthy: true,
        cooldownUntil: 0,
        consecutiveErrors: 0,
      });
    }
  }

  /** Available routers, best-first (healthy, not cooling down, lowest latency). */
  ranked(): string[] {
    const t = this.now();
    return [...this.stats.values()]
      .filter((s) => s.healthy && s.cooldownUntil <= t)
      .sort((a, b) => a.latencyMs - b.latencyMs)
      .map((s) => s.id);
  }

  recordSuccess(id: string, latencyMs: number): void {
    const s = this.stats.get(id);
    if (!s) return;
    s.latencyMs =
      s.latencyMs === Number.POSITIVE_INFINITY ? latencyMs : 0.7 * s.latencyMs + 0.3 * latencyMs;
    s.consecutiveErrors = 0;
    s.healthy = true;
  }

  recordFailure(id: string, err?: CallError): void {
    const s = this.stats.get(id);
    if (!s) return;
    s.consecutiveErrors += 1;
    if (err?.status === 429) {
      s.cooldownUntil = this.now() + (err.retryAfterMs ?? COOLDOWN_DEFAULT_MS);
    }
    if (s.consecutiveErrors >= UNHEALTHY_AFTER) s.healthy = false;
  }

  /** Run a call through the best router, failing over on error. Throws only if all exhausted. */
  async run<T>(call: (routerId: string) => Promise<T>): Promise<{ result: T; routerId: string }> {
    const order = this.ranked();
    if (order.length === 0) {
      throw new Error(
        "All selected routers are rate-limited or unavailable. Add a BYOK key, select more free routers, or retry shortly.",
      );
    }
    let lastErr: unknown;
    for (const id of order) {
      const t0 = this.now();
      try {
        const result = await call(id);
        this.recordSuccess(id, this.now() - t0);
        return { result, routerId: id };
      } catch (e) {
        const err = e as CallError;
        this.recordFailure(id, { status: err?.status, retryAfterMs: err?.retryAfterMs });
        lastErr = e;
      }
    }
    throw lastErr instanceof Error
      ? lastErr
      : new Error("All selected routers failed this request.");
  }

  snapshot(): RouterStat[] {
    return [...this.stats.values()].map((s) => ({ ...s }));
  }

  load(stats: RouterStat[]): void {
    for (const s of stats) if (this.stats.has(s.id)) this.stats.set(s.id, { ...s });
  }
}

// ── Cross-process persistence: health survives between CLI invocations ──
export function healthStatePath(dir: string): string {
  return join(dir, "routers", "health.json");
}

export function saveMuxState(dir: string, stats: RouterStat[]): void {
  const p = healthStatePath(dir);
  mkdirSync(join(dir, "routers"), { recursive: true });
  writeFileSync(p, JSON.stringify(stats, null, 2), "utf8");
}

export function loadMuxState(dir: string): RouterStat[] {
  const p = healthStatePath(dir);
  if (!existsSync(p)) return [];
  try {
    const stats = JSON.parse(readFileSync(p, "utf8")) as RouterStat[];
    // JSON has no Infinity — `latencyMs: Infinity` (an untried router) serializes to `null`. Coerce
    // it back, or a reloaded untried router would rank as latency-0 (ahead of the proven-fastest)
    // and poison the EWMA on its next success.
    return stats.map((s) => ({ ...s, latencyMs: Number.isFinite(s.latencyMs) ? s.latencyMs : Number.POSITIVE_INFINITY }));
  } catch {
    return [];
  }
}
