// Verifies the first-run avatar onboarding wires up cleanly: the module loads without a
// circular-import crash, imports resolve, and the barrel re-exports the onboarding API.
import { describe, expect, it } from "vitest";
import * as avatarBarrel from "./index.js";
import { previewAvatar, runAvatarOnboarding, selectAvatarInteractive } from "./onboarding.js";

describe("avatar onboarding wiring", () => {
  it("exposes the onboarding functions directly and via the barrel", () => {
    expect(typeof runAvatarOnboarding).toBe("function");
    expect(typeof selectAvatarInteractive).toBe("function");
    expect(typeof previewAvatar).toBe("function");
    expect(typeof avatarBarrel.runAvatarOnboarding).toBe("function");
    expect(typeof avatarBarrel.selectAvatarInteractive).toBe("function");
    expect(typeof avatarBarrel.previewAvatar).toBe("function");
  });

  it("can read the avatar manifest through the onboarding import path", () => {
    // If the manifest failed to load (bad import path / circular), AVATAR_COUNT would be 0.
    expect(avatarBarrel.AVATAR_COUNT).toBeGreaterThan(0);
    expect(avatarBarrel.avatarCategories().length).toBeGreaterThan(0);
  });
});
