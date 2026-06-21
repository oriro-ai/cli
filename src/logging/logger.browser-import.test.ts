// Logger browser import tests cover safe import behavior in browser-like runtimes.
import { importFreshModule } from "oriro/plugin-sdk/test-fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

type LoggerModule = typeof import("./logger.js");

const originalGetBuiltinModule = (
  process as NodeJS.Process & { getBuiltinModule?: (id: string) => unknown }
).getBuiltinModule;

async function importBrowserSafeLogger(params?: {
  resolvePreferredOriroTmpDir?: ReturnType<typeof vi.fn>;
}): Promise<{
  module: LoggerModule;
  resolvePreferredOriroTmpDir: ReturnType<typeof vi.fn>;
}> {
  const resolvePreferredOriroTmpDir =
    params?.resolvePreferredOriroTmpDir ??
    vi.fn(() => {
      throw new Error("resolvePreferredOriroTmpDir should not run during browser-safe import");
    });

  vi.doMock("../infra/tmp-oriro-dir.js", async () => {
    const actual = await vi.importActual<typeof import("../infra/tmp-oriro-dir.js")>(
      "../infra/tmp-oriro-dir.js",
    );
    return {
      ...actual,
      resolvePreferredOriroTmpDir,
    };
  });

  Object.defineProperty(process, "getBuiltinModule", {
    configurable: true,
    value: undefined,
  });

  const module = await importFreshModule<LoggerModule>(
    import.meta.url,
    "./logger.js?scope=browser-safe",
  );
  return { module, resolvePreferredOriroTmpDir };
}

describe("logging/logger browser-safe import", () => {
  afterEach(() => {
    vi.doUnmock("../infra/tmp-oriro-dir.js");
    Object.defineProperty(process, "getBuiltinModule", {
      configurable: true,
      value: originalGetBuiltinModule,
    });
  });

  it("does not resolve the preferred temp dir at import time when node fs is unavailable", async () => {
    const { module, resolvePreferredOriroTmpDir } = await importBrowserSafeLogger();

    expect(resolvePreferredOriroTmpDir).not.toHaveBeenCalled();
    expect(module.DEFAULT_LOG_DIR).toBe("/tmp/oriro");
    expect(module.DEFAULT_LOG_FILE).toBe("/tmp/oriro-ai/cli.log");
  });

  it("disables file logging when imported in a browser-like environment", async () => {
    const { module, resolvePreferredOriroTmpDir } = await importBrowserSafeLogger();

    expect(module.getResolvedLoggerSettings()).toStrictEqual({
      level: "silent",
      file: "/tmp/oriro-ai/cli.log",
      maxFileBytes: 100 * 1024 * 1024,
    });
    expect(module.isFileLogLevelEnabled("info")).toBe(false);
    expect(module.getLogger().info("browser-safe")).toBeUndefined();
    expect(resolvePreferredOriroTmpDir).not.toHaveBeenCalled();
  });
});
