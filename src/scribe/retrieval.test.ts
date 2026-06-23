import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { captureTurn } from "./capture.js";
import { listDays, readDay, searchScribe } from "./retrieval.js";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "scribe-ret-"));
  process.env.ORIRO_SCRIBE_DIR = dir;
});
afterEach(() => {
  delete process.env.ORIRO_SCRIBE_DIR;
  rmSync(dir, { recursive: true, force: true });
});

describe("scribe retrieval (5A.4)", () => {
  it("lists days, reads a day, and full-text searches across journals", () => {
    captureTurn({
      ts: "2026-03-14T10:00:00.000Z",
      date: "2026-03-14",
      user: "built the auth flow",
      router: "done",
    });
    captureTurn({
      ts: "2026-06-22T10:00:00.000Z",
      date: "2026-06-22",
      user: "fixed the CORS bug",
      router: "done",
    });

    expect(listDays()).toEqual(["2026-03-14", "2026-06-22"]);
    expect(readDay("2026-03-14")).toContain("auth flow");

    const hits = searchScribe("CORS");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].date).toBe("2026-06-22");
    expect(hits[0].text.toLowerCase()).toContain("cors");

    // 3-months-back retrieval still works
    const old = searchScribe("auth flow");
    expect(old.some((h) => h.date === "2026-03-14")).toBe(true);
  });
});
