// Plugin update selection tests cover CLI plugin update target selection.
import { describe, expect, it } from "vitest";
import type { PluginInstallRecord } from "../config/types.plugins.js";
import { resolvePluginUpdateSelection } from "./plugins-update-selection.js";

function createNpmInstall(params: {
  spec: string;
  installPath?: string;
  resolvedName?: string;
}): PluginInstallRecord {
  return {
    source: "npm",
    spec: params.spec,
    installPath: params.installPath ?? "/tmp/plugin",
    ...(params.resolvedName ? { resolvedName: params.resolvedName } : {}),
  };
}

describe("resolvePluginUpdateSelection", () => {
  it("maps an explicit unscoped npm dist-tag update to the tracked plugin id", () => {
    expect(
      resolvePluginUpdateSelection({
        installs: {
          "oriro-codex-app-server": createNpmInstall({
            spec: "oriro-codex-app-server",
            installPath: "/tmp/oriro-codex-app-server",
            resolvedName: "oriro-codex-app-server",
          }),
        },
        rawId: "oriro-codex-app-server@beta",
      }),
    ).toEqual({
      pluginIds: ["oriro-codex-app-server"],
      specOverrides: {
        "oriro-codex-app-server": "oriro-codex-app-server@beta",
      },
    });
  });

  it("maps an explicit scoped npm dist-tag update to the tracked plugin id", () => {
    expect(
      resolvePluginUpdateSelection({
        installs: {
          "voice-call": createNpmInstall({
            spec: "@oriro/voice-call",
            installPath: "/tmp/voice-call",
            resolvedName: "@oriro/voice-call",
          }),
        },
        rawId: "@oriro/voice-call@beta",
      }),
    ).toEqual({
      pluginIds: ["voice-call"],
      specOverrides: {
        "voice-call": "@oriro/voice-call@beta",
      },
    });
  });

  it("maps an explicit npm version update to the tracked plugin id", () => {
    expect(
      resolvePluginUpdateSelection({
        installs: {
          "oriro-codex-app-server": createNpmInstall({
            spec: "oriro-codex-app-server",
            installPath: "/tmp/oriro-codex-app-server",
            resolvedName: "oriro-codex-app-server",
          }),
        },
        rawId: "oriro-codex-app-server@0.2.0-beta.4",
      }),
    ).toEqual({
      pluginIds: ["oriro-codex-app-server"],
      specOverrides: {
        "oriro-codex-app-server": "oriro-codex-app-server@0.2.0-beta.4",
      },
    });
  });

  it("keeps recorded npm tags when update is invoked by plugin id", () => {
    expect(
      resolvePluginUpdateSelection({
        installs: {
          "oriro-codex-app-server": createNpmInstall({
            spec: "oriro-codex-app-server@beta",
            installPath: "/tmp/oriro-codex-app-server",
            resolvedName: "oriro-codex-app-server",
          }),
        },
        rawId: "oriro-codex-app-server",
      }),
    ).toEqual({
      pluginIds: ["oriro-codex-app-server"],
    });
  });

  it("maps a bare scoped npm package update to the tracked plugin id", () => {
    expect(
      resolvePluginUpdateSelection({
        installs: {
          "lossless-oriro": createNpmInstall({
            spec: "@martian-engineering/lossless-oriro@0.9.0",
            installPath: "/tmp/lossless-oriro",
            resolvedName: "@martian-engineering/lossless-oriro",
          }),
        },
        rawId: "@martian-engineering/lossless-oriro",
      }),
    ).toEqual({
      pluginIds: ["lossless-oriro"],
      specOverrides: {
        "lossless-oriro": "@martian-engineering/lossless-oriro",
      },
    });
  });
});
