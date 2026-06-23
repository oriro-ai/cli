import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hasScribeChoice, isScribeEnabled, setScribeConsent } from "./consent.js";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "scribe-consent-"));
  process.env.ORIRO_SCRIBE_DIR = dir;
});
afterEach(() => {
  delete process.env.ORIRO_SCRIBE_DIR;
  rmSync(dir, { recursive: true, force: true });
});

describe("scribe consent gate", () => {
  it("defaults OFF and unasked (nothing recorded without consent)", () => {
    expect(isScribeEnabled()).toBe(false);
    expect(hasScribeChoice()).toBe(false);
  });

  it("enables only after explicit Yes, and is reversible", () => {
    setScribeConsent(true);
    expect(isScribeEnabled()).toBe(true);
    expect(hasScribeChoice()).toBe(true);
    setScribeConsent(false);
    expect(isScribeEnabled()).toBe(false);
    expect(hasScribeChoice()).toBe(true); // asked, but declined
  });
});
