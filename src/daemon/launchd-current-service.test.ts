// Launchd current service tests cover resolving active macOS service labels.
import { describe, expect, it } from "vitest";
import { isCurrentProcessLaunchdServiceLabel } from "./launchd-current-service.js";

describe("isCurrentProcessLaunchdServiceLabel", () => {
  it("matches launchd-provided service labels", () => {
    expect(
      isCurrentProcessLaunchdServiceLabel("ai.oriro.gateway", {
        LAUNCH_JOB_LABEL: "ai.oriro.gateway",
      }),
    ).toBe(true);
  });

  it("falls back to Oriro service markers when XPC_SERVICE_NAME is inherited", () => {
    expect(
      isCurrentProcessLaunchdServiceLabel("ai.oriro.gateway", {
        XPC_SERVICE_NAME: "0",
        ORIRO_SERVICE_MARKER: "oriro",
        ORIRO_SERVICE_KIND: "gateway",
        ORIRO_LAUNCHD_LABEL: "ai.oriro.gateway",
      }),
    ).toBe(true);
  });

  it("preserves label-only fallback when launchd exposes no label variables", () => {
    expect(
      isCurrentProcessLaunchdServiceLabel("ai.oriro.gateway", {
        ORIRO_LAUNCHD_LABEL: "ai.oriro.gateway",
      }),
    ).toBe(true);
  });

  it("can require service markers for label-only fallback", () => {
    expect(
      isCurrentProcessLaunchdServiceLabel(
        "ai.oriro.gateway",
        {
          ORIRO_LAUNCHD_LABEL: "ai.oriro.gateway",
        },
        { allowConfiguredLabelFallback: false },
      ),
    ).toBe(false);
  });

  it("does not treat unrelated inherited launchd labels as current services", () => {
    expect(
      isCurrentProcessLaunchdServiceLabel("ai.oriro.gateway", {
        XPC_SERVICE_NAME: "0",
        ORIRO_LAUNCHD_LABEL: "ai.oriro.gateway",
      }),
    ).toBe(false);
  });
});
