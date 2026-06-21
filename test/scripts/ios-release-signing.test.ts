// iOS release signing tests cover checked-in Fastlane-managed profile pinning.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SCRIPT = path.join(process.cwd(), "scripts", "ios-release-signing.mjs");

function runSigning(mode: string): string {
  return execFileSync(process.execPath, [SCRIPT, "--mode", mode], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

describe("scripts/ios-release-signing.mjs", () => {
  it("emits manual App Store profile settings for every signed target", () => {
    const output = runSigning("xcconfig");

    expect(output).toContain("ORIRO_CODE_SIGN_STYLE = Manual");
    expect(output).toContain("ORIRO_CODE_SIGN_IDENTITY = Apple Distribution");
    expect(output).toContain("ORIRO_APP_GROUP_ID = group.ai.orirofoundation.app.shared");
    expect(output).toContain("ORIRO_APP_PROFILE = Oriro App Store ai.orirofoundation.app");
    expect(output).toContain(
      "ORIRO_SHARE_PROFILE = Oriro App Store ai.orirofoundation.app.share",
    );
    expect(output).toContain(
      "ORIRO_ACTIVITY_WIDGET_PROFILE = Oriro App Store ai.orirofoundation.app.activitywidget",
    );
    expect(output).toContain(
      "ORIRO_WATCH_APP_PROFILE = Oriro App Store ai.orirofoundation.app.watchkitapp",
    );
    expect(output).not.toContain("ORIRO_WATCH_EXTENSION_PROFILE");
  });

  it("documents the canonical release signing plan", () => {
    const output = runSigning("plan");

    expect(output).toContain("Team ID: FWJYW4S8P8");
    expect(output).toContain("Signing repo: git@github.com:oriro/apps-signing.git");
    expect(output).toContain("Signing branch: main");
    expect(output).toContain("Signing setup and sync: Fastlane match");
    expect(output).not.toContain("OriroWatchExtension");
    expect(output).toContain("capabilities: PUSH_NOTIFICATIONS, APP_GROUPS");
    expect(output).toContain("app groups: group.ai.orirofoundation.app.shared");
  });
});
