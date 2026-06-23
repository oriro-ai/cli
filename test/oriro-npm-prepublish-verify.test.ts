import { describe, expect, it } from "vitest";
import {
  openOriroNpmPrepublishVerifyUsage,
  parseOriroNpmPrepublishVerifyArgs,
} from "../scripts/oriro-npm-prepublish-verify.ts";

describe("parseOriroNpmPrepublishVerifyArgs", () => {
  it("supports help, optional versions, and package-manager separators", () => {
    expect(parseOriroNpmPrepublishVerifyArgs(["--help"])).toEqual({
      help: true,
      tarballPath: "",
    });
    expect(parseOriroNpmPrepublishVerifyArgs(["oriro.tgz"])).toEqual({
      help: false,
      tarballPath: "oriro.tgz",
    });
    expect(parseOriroNpmPrepublishVerifyArgs(["--", "oriro.tgz", "2026.3.23"])).toEqual({
      expectedVersion: "2026.3.23",
      help: false,
      tarballPath: "oriro.tgz",
    });
  });

  it("rejects missing, option-like, and extra arguments before installing", () => {
    expect(() => parseOriroNpmPrepublishVerifyArgs([])).toThrow(
      openOriroNpmPrepublishVerifyUsage(),
    );
    expect(() => parseOriroNpmPrepublishVerifyArgs(["--tag"])).toThrow(
      "Unknown oriro npm prepublish verifier option: --tag",
    );
    expect(() => parseOriroNpmPrepublishVerifyArgs(["oriro.tgz", "--tag"])).toThrow(
      "Unknown oriro npm prepublish verifier option: --tag",
    );
    expect(() =>
      parseOriroNpmPrepublishVerifyArgs(["oriro.tgz", "2026.3.23", "extra"]),
    ).toThrow("Unexpected oriro npm prepublish verifier argument: extra");
  });
});
