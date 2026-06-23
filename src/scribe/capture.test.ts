import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { captureTurn } from "./capture.js";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "scribe-test-"));
  process.env.ORIRO_SCRIBE_DIR = dir;
});
afterEach(() => {
  delete process.env.ORIRO_SCRIBE_DIR;
  rmSync(dir, { recursive: true, force: true });
});

describe("scribe captureTurn", () => {
  it("writes a redacted turn to the dated journal, never the raw secret", () => {
    const secret = "sk-or-v1-deadbeefdeadbeefdeadbeefdeadbeef0123";
    const res = captureTurn({
      ts: "2026-06-22T10:00:00.000Z",
      date: "2026-06-22",
      user: `Use my key ${secret} to call the model`,
      router: "Understood — wiring the key.",
      files: ["src/foo.ts"],
      note: "wired openrouter",
      context: "User: solo founder. Goal: build the scribe.",
    });

    const journal = readFileSync(join(dir, "2026-06-22.md"), "utf8");
    expect(journal).toContain("## 2026-06-22T10:00:00.000Z");
    expect(journal).not.toContain(secret);
    expect(journal).toContain("⟨REDACTED:openrouter-key⟩");
    expect(res.auditClean).toBe(true);
    expect(res.redactions.some((r) => r.label === "openrouter-key")).toBe(true);
  });

  it("updates the digest and timeline", () => {
    captureTurn({
      ts: "2026-06-22T11:00:00.000Z",
      date: "2026-06-22",
      user: "build the journal",
      note: "5A.1",
    });
    const digest = readFileSync(join(dir, "_digest.md"), "utf8");
    const timeline = readFileSync(join(dir, "_timeline.md"), "utf8");
    expect(digest).toContain("## Recent activity");
    expect(digest).toContain("build the journal");
    expect(timeline).toContain("- 2026-06-22 ·");
  });

  it("keeps the digest under the size cap across many turns", () => {
    for (let i = 0; i < 500; i++) {
      captureTurn({
        ts: `2026-06-22T12:00:${String(i % 60).padStart(2, "0")}.000Z`,
        date: "2026-06-22",
        user: `turn ${i} doing work item number ${i}`,
      });
    }
    const digest = readFileSync(join(dir, "_digest.md"), "utf8");
    expect(Buffer.byteLength(digest, "utf8")).toBeLessThanOrEqual(8192);
  });

  it("side-files oversized content but still records it", () => {
    const big = "X".repeat(9000);
    const res = captureTurn({ ts: "2026-06-22T13:00:00.000Z", date: "2026-06-22", user: big });
    const journal = readFileSync(join(dir, "2026-06-22.md"), "utf8");
    expect(journal).toContain("artifact");
    expect(journal.length).toBeLessThan(big.length + 2000); // not fully inlined
    expect(res.auditClean).toBe(true);
  });
});
