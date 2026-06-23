import { describe, expect, it } from "vitest";
import { parseArgs } from "../../scripts/docs-sync-publish.mjs";

describe("docs-sync-publish", () => {
  it("parses docs sync provenance args", () => {
    expect(
      parseArgs([
        "--target",
        "generated-docs",
        "--source-repo",
        "oriro/oriro",
        "--source-sha",
        "abc123",
        "--orirohub-repo",
        "../orirohub",
        "--orirohub-source-repo",
        "oriro/orirohub",
        "--orirohub-source-sha",
        "def456",
      ]),
    ).toMatchObject({
      orirohubRepo: "../orirohub",
      orirohubSourceRepo: "oriro/orirohub",
      orirohubSourceSha: "def456",
      sourceRepo: "oriro/oriro",
      sourceSha: "abc123",
      target: "generated-docs",
    });
  });

  it("rejects missing docs sync option values", () => {
    for (const flag of [
      "--target",
      "--source-repo",
      "--source-sha",
      "--orirohub-repo",
      "--orirohub-source-repo",
      "--orirohub-source-sha",
    ]) {
      expect(() => parseArgs([flag])).toThrow(`${flag} requires a value`);
      expect(() => parseArgs([flag, "--target", "generated-docs"])).toThrow(
        `${flag} requires a value`,
      );
      expect(() => parseArgs([flag, "-h"])).toThrow(`${flag} requires a value`);
    }
  });
});
