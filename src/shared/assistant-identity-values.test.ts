// Assistant identity tests cover normalized assistant names and metadata values.
import { describe, expect, it } from "vitest";
import { coerceIdentityValue } from "./assistant-identity-values.js";

describe("shared/assistant-identity-values", () => {
  it("returns undefined for missing or blank values", () => {
    expect(coerceIdentityValue(undefined, 10)).toBeUndefined();
    expect(coerceIdentityValue("   ", 10)).toBeUndefined();
    expect(coerceIdentityValue(42 as unknown as string, 10)).toBeUndefined();
  });

  it("trims values and preserves strings within the limit", () => {
    expect(coerceIdentityValue("  Oriro  ", 20)).toBe("Oriro");
    expect(coerceIdentityValue("  Oriro  ", 8)).toBe("Oriro");
  });

  it("truncates overlong trimmed values at the exact limit", () => {
    expect(coerceIdentityValue("  Oriro Assistant  ", 8)).toBe("Oriro");
  });

  it("returns an empty string when truncating to a zero-length limit", () => {
    expect(coerceIdentityValue("  Oriro  ", 0)).toBe("");
    expect(coerceIdentityValue("  Oriro  ", -1)).toBe("OpenCla");
  });
});
