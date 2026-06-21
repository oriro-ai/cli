// Plugin uninstall selection tests cover CLI uninstall target matching.
import { describe, expect, it } from "vitest";
import type { OriroConfig } from "../config/config.js";
import { resolvePluginUninstallId } from "./plugins-uninstall-selection.js";

describe("resolvePluginUninstallId", () => {
  it("accepts the recorded OriroHub spec as an uninstall target", () => {
    const result = resolvePluginUninstallId({
      rawId: "orirohub:linkmind-context",
      config: {
        plugins: {
          entries: {
            "linkmind-context": { enabled: true },
          },
          installs: {
            "linkmind-context": {
              source: "npm",
              spec: "orirohub:linkmind-context",
              orirohubPackage: "linkmind-context",
            },
          },
        },
      } as OriroConfig,
      plugins: [{ id: "linkmind-context", name: "linkmind-context" }],
    });

    expect(result.pluginId).toBe("linkmind-context");
  });

  it("accepts a versionless OriroHub spec when the install was pinned", () => {
    const result = resolvePluginUninstallId({
      rawId: "orirohub:linkmind-context",
      config: {
        plugins: {
          entries: {
            "linkmind-context": { enabled: true },
          },
          installs: {
            "linkmind-context": {
              source: "npm",
              spec: "orirohub:linkmind-context@1.2.3",
            },
          },
        },
      } as OriroConfig,
      plugins: [{ id: "linkmind-context", name: "linkmind-context" }],
    });

    expect(result.pluginId).toBe("linkmind-context");
  });
});
