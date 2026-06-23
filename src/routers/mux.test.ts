import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadMuxState, RouterMux, saveMuxState } from "./mux.js";

describe("RouterMux — multi-router best-selection + failover (key-free)", () => {
  it("ranks healthy routers fastest-first", () => {
    const m = new RouterMux(["a", "b", "c"]);
    m.recordSuccess("a", 800);
    m.recordSuccess("b", 120);
    m.recordSuccess("c", 400);
    expect(m.ranked()).toEqual(["b", "c", "a"]);
  });

  it("fails over past a failing router to a working one", async () => {
    const m = new RouterMux(["a", "b"]);
    m.recordSuccess("a", 100); // a is fastest, but will fail this call
    m.recordSuccess("b", 500);
    const out = await m.run(async (id) => {
      if (id === "a") throw Object.assign(new Error("boom"), { status: 500 });
      return `ok from ${id}`;
    });
    expect(out.routerId).toBe("b");
    expect(out.result).toBe("ok from b");
  });

  it("cools down a 429'd router and routes around it; recovers after cooldown", async () => {
    let t = 1_000_000;
    const m = new RouterMux(["a", "b"], () => t);
    m.recordSuccess("a", 100);
    m.recordSuccess("b", 200);
    // a returns 429 with 60s retry-after
    await m.run(async (id) => {
      if (id === "a") throw Object.assign(new Error("rate"), { status: 429, retryAfterMs: 60_000 });
      return id;
    });
    expect(m.ranked()).toEqual(["b"]); // a is cooling down
    t += 61_000; // past cooldown
    expect(m.ranked()).toContain("a"); // a back in rotation
  });

  it("throws a clear, actionable error when ALL routers are exhausted", async () => {
    const m = new RouterMux(["a"]);
    await expect(
      m.run(async () => {
        throw Object.assign(new Error("429"), { status: 429, retryAfterMs: 60_000 });
      }),
    ).rejects.toThrow(); // a now cooling down
    await expect(m.run(async () => "x")).rejects.toThrow(/rate-limited or unavailable|BYOK|retry/i);
  });

  it("persists + restores health across processes (gap B)", () => {
    const dir = mkdtempSync(join(tmpdir(), "mux-"));
    try {
      const m = new RouterMux(["a", "b"]);
      m.recordSuccess("a", 123);
      saveMuxState(dir, m.snapshot());
      const m2 = new RouterMux(["a", "b"]);
      m2.load(loadMuxState(dir));
      expect(m2.snapshot().find((s) => s.id === "a")?.latencyMs).toBe(123);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
