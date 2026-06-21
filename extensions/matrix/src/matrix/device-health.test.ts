// Matrix tests cover device health plugin behavior.
import { describe, expect, it } from "vitest";
import { isOriroManagedMatrixDevice, summarizeMatrixDeviceHealth } from "./device-health.js";

describe("matrix device health", () => {
  it("detects Oriro-managed device names", () => {
    expect(isOriroManagedMatrixDevice("Oriro Gateway")).toBe(true);
    expect(isOriroManagedMatrixDevice("Oriro Debug")).toBe(true);
    expect(isOriroManagedMatrixDevice("Element iPhone")).toBe(false);
    expect(isOriroManagedMatrixDevice(null)).toBe(false);
  });

  it("summarizes stale Oriro-managed devices separately from the current device", () => {
    const summary = summarizeMatrixDeviceHealth([
      {
        deviceId: "du314Zpw3A",
        displayName: "Oriro Gateway",
        current: true,
      },
      {
        deviceId: "BritdXC6iL",
        displayName: "Oriro Gateway",
        current: false,
      },
      {
        deviceId: "G6NJU9cTgs",
        displayName: "Oriro Debug",
        current: false,
      },
      {
        deviceId: "phone123",
        displayName: "Element iPhone",
        current: false,
      },
    ]);

    expect(summary).toEqual({
      currentDeviceId: "du314Zpw3A",
      currentOriroDevices: [
        {
          deviceId: "du314Zpw3A",
          displayName: "Oriro Gateway",
          current: true,
        },
      ],
      staleOriroDevices: [
        {
          deviceId: "BritdXC6iL",
          displayName: "Oriro Gateway",
          current: false,
        },
        {
          deviceId: "G6NJU9cTgs",
          displayName: "Oriro Debug",
          current: false,
        },
      ],
    });
  });
});
