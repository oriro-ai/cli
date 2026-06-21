// Tests wide-area DNS discovery parsing and timeout behavior.
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as utils from "../utils.js";
import {
  getWideAreaZonePath,
  normalizeWideAreaDomain,
  renderWideAreaGatewayZoneText,
  resolveWideAreaDiscoveryDomain,
  type WideAreaGatewayZoneOpts,
  writeWideAreaGatewayZone,
} from "./widearea-dns.js";

const baseZoneOpts: WideAreaGatewayZoneOpts = {
  domain: "oriro.internal.",
  gatewayPort: 18789,
  displayName: "Mac Studio (Oriro)",
  tailnetIPv4: "100.123.224.76",
  hostLabel: "studio-london",
  instanceLabel: "studio-london",
};

function makeZoneOpts(overrides: Partial<WideAreaGatewayZoneOpts> = {}): WideAreaGatewayZoneOpts {
  return { ...baseZoneOpts, ...overrides };
}

function renderZoneText(overrides: Partial<WideAreaGatewayZoneOpts> = {}): string {
  return renderWideAreaGatewayZoneText({
    ...makeZoneOpts(overrides),
    serial: 2025121701,
  });
}

function expectZoneRecords(text: string, records: string[]): void {
  for (const record of records) {
    expect(text).toContain(record);
  }
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("wide-area DNS discovery domain helpers", () => {
  it.each([
    { value: "oriro.internal", expected: "oriro.internal." },
    { value: "oriro.internal.", expected: "oriro.internal." },
    { value: "  oriro.internal  ", expected: "oriro.internal." },
    { value: "", expected: null },
    { value: "   ", expected: null },
    { value: null, expected: null },
    { value: undefined, expected: null },
  ])("normalizes domains for %j", ({ value, expected }) => {
    expect(normalizeWideAreaDomain(value)).toBe(expected);
  });

  it.each(["../../x", "foo/bar", "foo\\bar", "evil\nrecords", "oriro..internal"])(
    "rejects invalid domains for %j",
    (value) => {
      expect(() => normalizeWideAreaDomain(value)).toThrow(
        "wide-area discovery domain must be a valid DNS name",
      );
    },
  );

  it.each([
    {
      name: "prefers config domain over env",
      params: {
        env: { ORIRO_WIDE_AREA_DOMAIN: "env.internal" } as NodeJS.ProcessEnv,
        configDomain: "config.internal",
      },
      expected: "config.internal.",
    },
    {
      name: "falls back to env domain",
      params: {
        env: { ORIRO_WIDE_AREA_DOMAIN: "env.internal" } as NodeJS.ProcessEnv,
      },
      expected: "env.internal.",
    },
    {
      name: "returns null when both sources are blank",
      params: {
        env: { ORIRO_WIDE_AREA_DOMAIN: "   " } as NodeJS.ProcessEnv,
        configDomain: " ",
      },
      expected: null,
    },
    {
      name: "returns null for invalid config domains",
      params: {
        env: { ORIRO_WIDE_AREA_DOMAIN: "env.internal" } as NodeJS.ProcessEnv,
        configDomain: "foo/bar",
      },
      expected: null,
    },
    {
      name: "returns null for invalid env domains",
      params: {
        env: { ORIRO_WIDE_AREA_DOMAIN: "foo/bar" } as NodeJS.ProcessEnv,
      },
      expected: null,
    },
  ])("$name", ({ params, expected }) => {
    expect(resolveWideAreaDiscoveryDomain(params)).toBe(expected);
  });

  it("builds valid zone paths under the DNS config directory", () => {
    const dnsDir = path.resolve(utils.CONFIG_DIR, "dns");
    const zonePath = getWideAreaZonePath("oriro.internal.");

    expect(zonePath).toBe(path.join(dnsDir, "oriro.internal.db"));
    expect(path.relative(dnsDir, zonePath)).toBe("oriro.internal.db");
  });
});

describe("wide-area DNS-SD zone rendering", () => {
  it("renders a zone with gateway PTR/SRV/TXT records", () => {
    const txt = renderZoneText({
      tailnetIPv6: "fd7a:115c:a1e0::8801:e04c",
      sshPort: 22,
      cliPath: "/opt/homebrew/bin/oriro",
    });

    expectZoneRecords(txt, [
      `$ORIGIN oriro.internal.`,
      `studio-london IN A 100.123.224.76`,
      `studio-london IN AAAA fd7a:115c:a1e0::8801:e04c`,
      `_oriro-gw._tcp IN PTR studio-london._oriro-gw._tcp`,
      `studio-london._oriro-gw._tcp IN SRV 0 0 18789 studio-london`,
      `displayName=Mac Studio (Oriro)`,
      `gatewayPort=18789`,
      `sshPort=22`,
      `cliPath=/opt/homebrew/bin/oriro`,
    ]);
  });

  it.each([
    {
      name: "includes tailnetDns when provided",
      overrides: { tailnetDns: "peters-mac-studio-1.sheep-coho.ts.net" },
      records: [`tailnetDns=peters-mac-studio-1.sheep-coho.ts.net`],
    },
    {
      name: "includes gateway TLS TXT fields and trims display metadata",
      overrides: {
        domain: "oriro.internal",
        displayName: "  Mac Studio (Oriro)  ",
        hostLabel: " Studio London ",
        instanceLabel: " Studio London ",
        gatewayTlsEnabled: true,
        gatewayTlsFingerprintSha256: "abc123",
        gatewayDirectReachable: true,
        tailnetDns: " tailnet.ts.net ",
        cliPath: " /opt/homebrew/bin/oriro ",
      },
      records: [
        `$ORIGIN oriro.internal.`,
        `studio-london IN A 100.123.224.76`,
        `studio-london._oriro-gw._tcp IN TXT`,
        `displayName=Mac Studio (Oriro)`,
        `gatewayTls=1`,
        `gatewayTlsSha256=abc123`,
        `gatewayDirectReachable=1`,
        `tailnetDns=tailnet.ts.net`,
        `cliPath=/opt/homebrew/bin/oriro`,
      ],
    },
  ])("$name", ({ overrides, records }) => {
    expectZoneRecords(renderZoneText(overrides), records);
  });
});

describe("wide-area DNS zone writes", () => {
  it("rejects blank domains", async () => {
    await expect(writeWideAreaGatewayZone(makeZoneOpts({ domain: "   " }))).rejects.toThrow(
      "wide-area discovery domain is required",
    );
  });

  it.each(["../../x", "foo/bar", "foo\\bar", "evil\nrecords", "oriro..internal"])(
    "rejects invalid domain %j before writing",
    async (domain) => {
      const ensureDirSpy = vi.spyOn(utils, "ensureDir").mockResolvedValue(undefined);
      const writeSpy = vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);

      await expect(writeWideAreaGatewayZone(makeZoneOpts({ domain }))).rejects.toThrow(
        "wide-area discovery domain must be a valid DNS name",
      );

      expect(ensureDirSpy).not.toHaveBeenCalled();
      expect(writeSpy).not.toHaveBeenCalled();
    },
  );

  it("skips rewriting unchanged content", async () => {
    vi.spyOn(utils, "ensureDir").mockResolvedValue(undefined);
    const existing = renderWideAreaGatewayZoneText({ ...makeZoneOpts(), serial: 2026031301 });
    vi.spyOn(fs, "readFileSync").mockReturnValue(existing);
    const writeSpy = vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);

    const result = await writeWideAreaGatewayZone(makeZoneOpts());

    expect(result).toEqual({
      zonePath: getWideAreaZonePath("oriro.internal."),
      changed: false,
    });
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it("increments same-day serials when content changes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-13T12:00:00.000Z"));
    vi.spyOn(utils, "ensureDir").mockResolvedValue(undefined);
    vi.spyOn(fs, "readFileSync").mockReturnValue(
      renderWideAreaGatewayZoneText({ ...makeZoneOpts(), serial: 2026031304 }),
    );
    const writeSpy = vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);

    const result = await writeWideAreaGatewayZone(
      makeZoneOpts({ gatewayTlsEnabled: true, gatewayTlsFingerprintSha256: "abc123" }),
    );

    expect(result).toEqual({
      zonePath: getWideAreaZonePath("oriro.internal."),
      changed: true,
    });
    const expectedZoneText = renderWideAreaGatewayZoneText({
      ...makeZoneOpts({ gatewayTlsEnabled: true, gatewayTlsFingerprintSha256: "abc123" }),
      serial: 2026031305,
    });
    expect(writeSpy).toHaveBeenCalledWith(
      getWideAreaZonePath("oriro.internal."),
      expectedZoneText,
      "utf-8",
    );
  });
});
