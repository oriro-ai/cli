// Failure output tests cover CLI error formatting and failure summaries.
import { describe, expect, it } from "vitest";
import { formatCliFailureLines } from "./failure-output.js";

describe("formatCliFailureLines", () => {
  it("shows a concise reason and recovery commands by default", () => {
    const lines = formatCliFailureLines({
      title: "Could not start the CLI.",
      error: new Error("config file is invalid"),
      argv: ["node", "oriro", "status"],
      env: {},
    });

    expect(lines).toEqual([
      "[oriro] Could not start the CLI.",
      "[oriro] Reason: config file is invalid",
      "[oriro] Debug: set ORIRO_DEBUG=1 to include the stack trace.",
      "[oriro] Try: oriro doctor",
      "[oriro] Help: oriro --help",
    ]);
  });

  it("prints stack details when debug output is requested", () => {
    const lines = formatCliFailureLines({
      title: "The CLI command failed.",
      error: new Error("boom"),
      env: { ORIRO_DEBUG: "1" },
    });

    expect(lines.slice(0, 4)).toEqual([
      "[oriro] The CLI command failed.",
      "[oriro] Reason: boom",
      "[oriro] Stack:",
      "[oriro] Error: boom",
    ]);
    expect(lines.join("\n")).toContain("Error: boom");
  });
});
