// On-device inference preflight — RAM + context sizing. A 9B model at Q6/Q8 needs ~8-10 GB resident, and
// a full 256K KV cache would demand tens of GB: loading blind would OOM / hard-crash a normal machine
// (the "user will still have an issue" gap). This computes a SAFE plan up front — it caps context to what
// free RAM allows and REFUSES with a clear reason rather than crashing. Pure + deterministic → unit-tested
// without a model or the native runtime.

import { freemem } from "node:os";

export interface ModelFootprint {
  paramsB: number; // billions of parameters (e.g. 9)
  fileBytes: number; // the GGUF size on disk (resident weights ≈ this)
}
export interface ContextPlan {
  decision: "ok" | "reduced" | "refuse";
  nCtx: number; // the context length we will actually load with (0 on refuse)
  reason: string; // human-readable, surfaced to the user
}

const MiB = 1024 * 1024;
const GiB = 1024 * MiB;
export const DEFAULT_CTX = 8192; // sane default; the models support far more, but the KV cache is the cost
const CTX_FLOOR = 2048; // below this, refuse — not worth loading
const HEADROOM = 1.25; // keep ~25% of free RAM for the OS + app so we never drive the machine to swap

// KV-cache cost ≈ nCtx × (per-token bytes). Without parsing GGUF metadata we approximate per-token KV
// from the parameter count (a 9B model ≈ ~0.13 MiB/token at fp16 KV). Deliberately conservative so we
// UNDER-promise context and never OOM.
function kvBytesPerToken(paramsB: number): number {
  return Math.max(0.05, paramsB * 0.014) * MiB;
}

/**
 * Decide the context length to load with, given the model footprint, what the caller asked for, and the
 * free RAM. Never returns a plan that would exceed memory — worst case it refuses.
 */
export function planContext(
  fp: ModelFootprint,
  requestedCtx: number,
  freeBytes: number = freemem(),
): ContextPlan {
  const weights = fp.fileBytes;
  const budget = freeBytes / HEADROOM - weights; // RAM left for the KV cache after weights + headroom
  if (budget <= 0) {
    return {
      decision: "refuse",
      nCtx: 0,
      reason: `Not enough free memory: this model needs about ${(weights / GiB).toFixed(1)} GB resident and only ${(freeBytes / GiB).toFixed(1)} GB is free. Close some apps and try again.`,
    };
  }
  const maxCtxByRam = Math.floor(budget / kvBytesPerToken(fp.paramsB));
  const want = requestedCtx > 0 ? requestedCtx : DEFAULT_CTX;
  const nCtx = Math.max(0, Math.min(want, maxCtxByRam));
  if (nCtx < CTX_FLOOR) {
    return {
      decision: "refuse",
      nCtx: 0,
      reason: `Not enough free memory for a usable context window (only ${nCtx.toLocaleString()} tokens fit). Close some apps and try again.`,
    };
  }
  if (nCtx < want) {
    return {
      decision: "reduced",
      nCtx,
      reason: `Context set to ${nCtx.toLocaleString()} tokens to fit your free memory (${(freeBytes / GiB).toFixed(1)} GB). The model still works — just a shorter memory per chat.`,
    };
  }
  return { decision: "ok", nCtx, reason: `Ready — ${nCtx.toLocaleString()} tokens of context.` };
}
