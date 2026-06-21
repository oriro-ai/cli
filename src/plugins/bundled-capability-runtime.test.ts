// Verifies bundled capability runtime registration from plugin metadata.
import { describe, expect, it } from "vitest";
import { buildVitestCapabilityShimAliasMap } from "./bundled-capability-runtime.js";

describe("buildVitestCapabilityShimAliasMap", () => {
  it("keeps scoped and unscoped capability shim aliases aligned", () => {
    const aliasMap = buildVitestCapabilityShimAliasMap();

    expect(aliasMap["oriro/plugin-sdk/config-runtime"]).toBe(
      aliasMap["@oriro/plugin-sdk/config-runtime"],
    );
    expect(aliasMap["oriro/plugin-sdk/media-runtime"]).toBe(
      aliasMap["@oriro/plugin-sdk/media-runtime"],
    );
    expect(aliasMap["oriro/plugin-sdk/provider-onboard"]).toBe(
      aliasMap["@oriro/plugin-sdk/provider-onboard"],
    );
    expect(aliasMap["oriro/plugin-sdk/speech-core"]).toBe(
      aliasMap["@oriro/plugin-sdk/speech-core"],
    );
  });
});
