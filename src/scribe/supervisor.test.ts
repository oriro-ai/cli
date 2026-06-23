import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TurnRecord } from "./capture.js";
import { isScribeEnabled, setScribeConsent } from "./consent.js";
import { readHealth } from "./health.js";
import { supervisedCapture } from "./supervisor.js";
import { walAppend, walCommit, walPending } from "./wal.js";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "scribe-sup-"));
  process.env.ORIRO_SCRIBE_DIR = dir;
});
afterEach(() => {
  delete process.env.ORIRO_SCRIBE_DIR;
  rmSync(dir, { recursive: true, force: true });
});

const rec = (n: string): TurnRecord => ({
  ts: `2026-06-22T10:00:0${n}.000Z`,
  date: "2026-06-22",
  user: `turn ${n}`,
  router: "ok",
});

describe("scribe WAL", () => {
  it("tracks pending until committed", () => {
    walAppend("a", rec("1"));
    walAppend("b", rec("2"));
    expect(
      walPending()
        .map((p) => p.id)
        .sort(),
    ).toEqual(["a", "b"]);
    walCommit("a");
    expect(walPending().map((p) => p.id)).toEqual(["b"]);
  });
});

describe("scribe supervisedCapture (3-role)", () => {
  it("Primary success: journals, commits WAL, records health", () => {
    const res = supervisedCapture(rec("1"));
    expect(res).not.toBeNull();
    expect(existsSync(join(dir, "2026-06-22.md"))).toBe(true);
    expect(walPending()).toHaveLength(0); // committed
    expect(readHealth().lastWriteAt).toBeTruthy();
  });

  it("Medic/Standby: replays a pre-existing pending WAL entry on the next capture", () => {
    walAppend("orphan", rec("9")); // simulate a prior crash before commit
    expect(walPending().map((p) => p.id)).toContain("orphan");
    supervisedCapture(rec("1")); // drains backlog first, then captures
    expect(walPending()).toHaveLength(0); // orphan replayed + committed
    const journal = readFileSync(join(dir, "2026-06-22.md"), "utf8");
    expect(journal).toContain("turn 9"); // the orphan was recovered
    expect(journal).toContain("turn 1");
  });
});

// Faithful integration test of agent-command's capture gating (model-agnostic).
describe("agent-command capture gating", () => {
  function gatedCapture(body: string, isRaw: boolean, suppress: boolean) {
    if (!isRaw && !suppress && body?.trim()) {
      if (isScribeEnabled()) {
        return supervisedCapture({
          ts: "2026-06-22T12:00:00.000Z",
          date: "2026-06-22",
          user: body,
          router: "r",
        });
      }
    }
    return null;
  }
  it("captures only on a real turn with consent ON", () => {
    setScribeConsent(false);
    expect(gatedCapture("hello", false, false)).toBeNull(); // consent off
    setScribeConsent(true);
    expect(gatedCapture("", false, false)).toBeNull(); // empty body
    expect(gatedCapture("hello", true, false)).toBeNull(); // raw model run
    expect(gatedCapture("hello", false, true)).toBeNull(); // internal/subagent
    expect(gatedCapture("hello", false, false)).not.toBeNull(); // real turn → captured
    expect(existsSync(join(dir, "2026-06-22.md"))).toBe(true);
  });
});
