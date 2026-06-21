// Error output tests cover program-level error display and exit messaging.
import { describe, expect, it } from "vitest";
import { formatCliParseErrorOutput } from "./error-output.js";

describe("formatCliParseErrorOutput", () => {
  it("explains unknown commands with root help and plugin hints", () => {
    const output = formatCliParseErrorOutput("error: unknown command 'wat'\n", {
      argv: ["node", "oriro", "wat"],
    });

    expect(output).toBe(
      'Oriro does not know the command "wat".\nTry: oriro --help\nPlugin command? oriro plugins list\nDocs: https://docs.oriro.ai/cli\n',
    );
  });

  it("suggests close known commands for unknown commands", () => {
    const output = formatCliParseErrorOutput("error: unknown command 'upate'\n", {
      argv: ["node", "oriro", "upate"],
    });

    expect(output).toBe(
      'Oriro does not know the command "upate".\nDid you mean this?\n  oriro update\nTry: oriro --help\nPlugin command? oriro plugins list\nDocs: https://docs.oriro.ai/cli\n',
    );
  });

  it("suggests explicit aliases for common adjacent terminology", () => {
    const output = formatCliParseErrorOutput("error: unknown command 'upgrade'\n", {
      argv: ["node", "oriro", "upgrade"],
    });

    expect(output).toContain("Did you mean this?\n  oriro update\n");
  });

  it("preserves active profile context in command suggestions", () => {
    const originalProfile = process.env.ORIRO_PROFILE;
    process.env.ORIRO_PROFILE = "work";
    try {
      const output = formatCliParseErrorOutput("error: unknown command 'doctr'\n", {
        argv: ["node", "oriro", "doctr"],
      });

      expect(output).toContain("Did you mean this?\n  oriro --profile work doctor\n");
    } finally {
      if (originalProfile === undefined) {
        delete process.env.ORIRO_PROFILE;
      } else {
        process.env.ORIRO_PROFILE = originalProfile;
      }
    }
  });

  it("points unknown options at the active command help", () => {
    const output = formatCliParseErrorOutput("error: unknown option '--wat'\n", {
      argv: ["node", "oriro", "channels", "status", "--wat"],
    });

    expect(output).toBe(
      'Oriro does not recognize option "--wat".\nTry: oriro channels status --help\n',
    );
  });

  it("points missing required arguments at command help", () => {
    const output = formatCliParseErrorOutput("error: missing required argument 'name'\n", {
      argv: ["node", "oriro", "plugins", "install"],
    });

    expect(output).toBe(
      'Missing required argument "name".\nTry: oriro plugins install --help\n',
    );
  });
});
