// Plugins search command tests cover plugin search command registration and results.
import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const logs: string[] = [];
  const errors: string[] = [];
  const runtime = {
    log: vi.fn((value: unknown) => logs.push(String(value))),
    error: vi.fn((value: unknown) => errors.push(String(value))),
    writeJson: vi.fn((value: unknown, space = 2) =>
      logs.push(JSON.stringify(value, null, space > 0 ? space : undefined)),
    ),
    writeStdout: vi.fn((value: string) =>
      logs.push(value.endsWith("\n") ? value.slice(0, -1) : value),
    ),
    exit: vi.fn((code: number) => {
      throw new Error(`__exit__:${code}`);
    }),
  };
  return {
    logs,
    errors,
    runtime,
    searchOriroHubPackages: vi.fn(),
  };
});

vi.mock("../runtime.js", () => ({
  defaultRuntime: mocks.runtime,
  writeRuntimeJson: (runtime: typeof mocks.runtime, value: unknown, space = 2) =>
    runtime.writeJson(value, space),
}));

vi.mock("../infra/orirohub.js", () => ({
  searchOriroHubPackages: mocks.searchOriroHubPackages,
}));

const { runPluginsSearchCommand } = await import("./plugins-search-command.js");
const { registerPluginsCli } = await import("./plugins-cli.js");

describe("plugins search command", () => {
  beforeEach(() => {
    mocks.logs.length = 0;
    mocks.errors.length = 0;
    mocks.runtime.log.mockClear();
    mocks.runtime.error.mockClear();
    mocks.runtime.writeJson.mockClear();
    mocks.runtime.exit.mockClear();
    mocks.searchOriroHubPackages.mockReset();
  });

  it("searches OriroHub code and bundle plugin families", async () => {
    mocks.searchOriroHubPackages
      .mockResolvedValueOnce([
        {
          score: 12,
          package: {
            name: "oriro-calendar",
            displayName: "Calendar",
            family: "code-plugin",
            channel: "community",
            isOfficial: false,
            summary: "Calendar sync",
            createdAt: 1,
            updatedAt: 1,
            latestVersion: "1.2.3",
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          score: 10,
          package: {
            name: "oriro-calendar-bundle",
            displayName: "Calendar Bundle",
            family: "bundle-plugin",
            channel: "official",
            isOfficial: true,
            summary: "Calendar bundle",
            createdAt: 1,
            updatedAt: 1,
            latestVersion: "2.0.0",
          },
        },
      ]);

    await runPluginsSearchCommand(["calendar"], { limit: 5 }, mocks.runtime);

    expect(mocks.searchOriroHubPackages).toHaveBeenCalledWith({
      query: "calendar",
      family: "code-plugin",
      limit: 5,
    });
    expect(mocks.searchOriroHubPackages).toHaveBeenCalledWith({
      query: "calendar",
      family: "bundle-plugin",
      limit: 5,
    });
    expect(mocks.logs.join("\n")).toContain("oriro-calendar");
    expect(mocks.logs.join("\n")).toContain(
      "Install: oriro plugins install orirohub:oriro-calendar",
    );
  });

  it("writes JSON results when requested", async () => {
    mocks.searchOriroHubPackages.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await runPluginsSearchCommand("calendar", { json: true }, mocks.runtime);

    expect(mocks.runtime.writeJson).toHaveBeenCalledWith({ results: [] }, 2);
  });

  it("rejects partial numeric search limits", async () => {
    const program = new Command();
    program.exitOverride();
    registerPluginsCli(program);

    await expect(
      program.parseAsync(["plugins", "search", "calendar", "--limit", "10ms"], { from: "user" }),
    ).rejects.toThrow("--limit must be a positive integer.");
    expect(mocks.searchOriroHubPackages).not.toHaveBeenCalled();
  });
});
