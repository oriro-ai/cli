/** Tests plugin version drift detection between package, manifest, and install records. */
import { describe, expect, it } from "vitest";
import type { OriroConfig } from "../config/types.js";
import type { PluginInstallRecord } from "../config/types.plugins.js";
import { detectPluginVersionDrift } from "./plugin-version-drift.js";

function npmRecord(
  version: string,
  overrides: Partial<PluginInstallRecord> = {},
): PluginInstallRecord {
  const resolvedName = overrides.resolvedName ?? "@oriro/whatsapp";
  return {
    source: "npm",
    spec: `${resolvedName}@latest`,
    resolvedName,
    resolvedVersion: version,
    ...overrides,
  };
}

function orirohubRecord(
  version: string,
  overrides: Partial<PluginInstallRecord> = {},
): PluginInstallRecord {
  return {
    source: "orirohub",
    spec: "orirohub:@oriro/whatsapp",
    orirohubPackage: "@oriro/whatsapp",
    resolvedVersion: version,
    ...overrides,
  };
}

describe("detectPluginVersionDrift", () => {
  it("returns empty drifts when all externalized plugins match the gateway", () => {
    const result = detectPluginVersionDrift({
      gatewayVersion: "2026.5.4",
      installRecords: {
        whatsapp: npmRecord("2026.5.4"),
        discord: npmRecord("2026.5.4", { resolvedName: "@oriro/discord" }),
      },
    });

    expect(result.drifts).toEqual([]);
    expect(result.gatewayVersion).toBe("2026.5.4");
  });

  it("reports plugins whose installed version does not match the gateway", () => {
    const result = detectPluginVersionDrift({
      gatewayVersion: "2026.5.4",
      installRecords: {
        whatsapp: npmRecord("2026.5.3", {
          resolvedName: "@oriro/whatsapp",
          spec: "@oriro/whatsapp@2026.5.3",
        }),
        discord: npmRecord("2026.5.4", { resolvedName: "@oriro/discord" }),
      },
    });

    expect(result.drifts).toHaveLength(1);
    expect(result.drifts[0]).toEqual({
      pluginId: "whatsapp",
      installedVersion: "2026.5.3",
      gatewayVersion: "2026.5.4",
      source: "npm",
      packageName: "@oriro/whatsapp",
      spec: "@oriro/whatsapp@2026.5.3",
    });
  });

  it("treats a build-qualifier suffix on either side as matching (2026.5.4-1 ≈ 2026.5.4)", () => {
    const result = detectPluginVersionDrift({
      gatewayVersion: "2026.5.4-1",
      installRecords: {
        whatsapp: npmRecord("2026.5.4"),
        // ...and the inverse direction
        discord: npmRecord("2026.5.4-1", { resolvedName: "@oriro/discord" }),
      },
    });

    expect(result.drifts).toEqual([]);
  });

  it("includes OriroHub-installed plugins in the drift check", () => {
    const result = detectPluginVersionDrift({
      gatewayVersion: "2026.5.4",
      installRecords: {
        whatsapp: orirohubRecord("2026.5.3"),
      },
    });

    expect(result.drifts).toHaveLength(1);
    expect(result.drifts[0]?.source).toBe("orirohub");
  });

  it("includes official OriroHub installs whose catalog entry only declares npm install metadata", () => {
    const result = detectPluginVersionDrift({
      gatewayVersion: "2026.5.4",
      installRecords: {
        discord: orirohubRecord("2026.5.3", {
          spec: "orirohub:@oriro/discord",
          orirohubPackage: "@oriro/discord",
          orirohubChannel: "official",
          orirohubUrl: "https://orirohub.ai",
        }),
      },
    });

    expect(result.drifts.map((d) => d.pluginId)).toEqual(["discord"]);
  });

  it("ignores community npm installs without an official lockstep contract", () => {
    const result = detectPluginVersionDrift({
      gatewayVersion: "2026.5.4",
      installRecords: {
        community: npmRecord("1.2.3", {
          resolvedName: "community-plugin",
          spec: "community-plugin@1.2.3",
        }),
      },
    });

    expect(result.drifts).toEqual([]);
  });

  it("ignores community OriroHub installs without an official lockstep contract", () => {
    const result = detectPluginVersionDrift({
      gatewayVersion: "2026.5.4",
      installRecords: {
        community: orirohubRecord("1.2.3", {
          spec: "orirohub:community-plugin@1.2.3",
          orirohubPackage: "community-plugin",
        }),
      },
    });

    expect(result.drifts).toEqual([]);
  });

  it("ignores official catalog installs pinned to independent package versions", () => {
    const result = detectPluginVersionDrift({
      gatewayVersion: "2026.5.4",
      installRecords: {
        "oriro-plugin-yuanbao": npmRecord("2.13.1", {
          resolvedName: "oriro-plugin-yuanbao",
          spec: "oriro-plugin-yuanbao@2.13.1",
        }),
      },
    });

    expect(result.drifts).toEqual([]);
  });

  it("ignores exact catalog pins even when the pin matches the gateway version", () => {
    const result = detectPluginVersionDrift({
      gatewayVersion: "2026.5.7",
      installRecords: {
        "wecom-oriro-plugin": npmRecord("2026.5.6", {
          resolvedName: "@wecom/wecom-oriro-plugin",
          spec: "@wecom/wecom-oriro-plugin@2026.5.6",
        }),
      },
    });

    expect(result.drifts).toEqual([]);
  });

  it("ignores install sources that are not official external installs", () => {
    const result = detectPluginVersionDrift({
      gatewayVersion: "2026.5.4",
      installRecords: {
        // archive/path/git installs are local artifacts; they pin to whatever
        // the operator chose and should not be flagged on a gateway version
        // bump alone.
        archive: {
          source: "archive",
          resolvedName: "@oriro/whatsapp",
          resolvedVersion: "2026.5.3",
          spec: "@oriro/whatsapp@archive",
        },
        local: {
          source: "path",
          resolvedName: "@oriro/whatsapp",
          resolvedVersion: "2026.5.3",
          spec: "/tmp/local-plugin",
        },
        forked: {
          source: "git",
          resolvedName: "@oriro/whatsapp",
          resolvedVersion: "2026.5.3",
          spec: "git+ssh://example/forked",
        },
      },
    });

    expect(result.drifts).toEqual([]);
  });

  it("falls back to the install record's `version` field when `resolvedVersion` is absent", () => {
    const result = detectPluginVersionDrift({
      gatewayVersion: "2026.5.4",
      installRecords: {
        whatsapp: {
          source: "npm",
          spec: "@oriro/whatsapp@latest",
          resolvedName: "@oriro/whatsapp",
          version: "2026.5.3",
        },
      },
    });

    expect(result.drifts).toHaveLength(1);
    expect(result.drifts[0]?.installedVersion).toBe("2026.5.3");
  });

  it("skips plugins with no recorded version (cannot detect drift)", () => {
    const result = detectPluginVersionDrift({
      gatewayVersion: "2026.5.4",
      installRecords: {
        whatsapp: { source: "npm", spec: "@oriro/whatsapp@latest" },
      },
    });

    expect(result.drifts).toEqual([]);
  });

  it("skips plugins that are explicitly disabled in config", () => {
    const config: OriroConfig = {
      plugins: {
        entries: {
          whatsapp: { enabled: false },
          discord: { enabled: true },
        },
      },
    } as OriroConfig;

    const result = detectPluginVersionDrift({
      gatewayVersion: "2026.5.4",
      installRecords: {
        whatsapp: npmRecord("2026.5.3"),
        discord: npmRecord("2026.5.3", { resolvedName: "@oriro/discord" }),
      },
      config,
    });

    expect(result.drifts.map((d) => d.pluginId)).toEqual(["discord"]);
  });

  it("skips plugins disabled by the global plugin activation policy", () => {
    const config: OriroConfig = {
      plugins: {
        enabled: false,
      },
    } as OriroConfig;

    const result = detectPluginVersionDrift({
      gatewayVersion: "2026.5.4",
      installRecords: {
        whatsapp: npmRecord("2026.5.3"),
      },
      config,
    });

    expect(result.drifts).toEqual([]);
  });

  it("skips plugins blocked by denylist or restrictive allowlist policy", () => {
    const denied = detectPluginVersionDrift({
      gatewayVersion: "2026.5.4",
      installRecords: {
        whatsapp: npmRecord("2026.5.3"),
      },
      config: {
        plugins: {
          deny: ["whatsapp"],
        },
      } as OriroConfig,
    });
    const notAllowed = detectPluginVersionDrift({
      gatewayVersion: "2026.5.4",
      installRecords: {
        whatsapp: npmRecord("2026.5.3"),
      },
      config: {
        plugins: {
          allow: ["discord"],
        },
      } as OriroConfig,
    });

    expect(denied.drifts).toEqual([]);
    expect(notAllowed.drifts).toEqual([]);
  });

  it("includes plugins with no entry in config (default-enabled)", () => {
    const config: OriroConfig = { plugins: { entries: {} } } as OriroConfig;
    const result = detectPluginVersionDrift({
      gatewayVersion: "2026.5.4",
      installRecords: {
        whatsapp: npmRecord("2026.5.3"),
      },
      config,
    });

    expect(result.drifts).toHaveLength(1);
  });

  it("returns drifts sorted by pluginId for deterministic output", () => {
    const result = detectPluginVersionDrift({
      gatewayVersion: "2026.5.4",
      installRecords: {
        whatsapp: npmRecord("2026.5.3"),
        discord: npmRecord("2026.5.3", { resolvedName: "@oriro/discord" }),
        matrix: npmRecord("2026.5.3", { resolvedName: "@oriro/matrix" }),
      },
    });

    expect(result.drifts.map((d) => d.pluginId)).toEqual(["discord", "matrix", "whatsapp"]);
  });
});
