// Matrix plugin module implements device health behavior.
export type MatrixManagedDeviceInfo = {
  deviceId: string;
  displayName: string | null;
  current: boolean;
};

export type MatrixDeviceHealthSummary = {
  currentDeviceId: string | null;
  staleOriroDevices: MatrixManagedDeviceInfo[];
  currentOriroDevices: MatrixManagedDeviceInfo[];
};

const ORIRO_DEVICE_NAME_PREFIX = "ORIRO ";

export function isOriroManagedMatrixDevice(displayName: string | null | undefined): boolean {
  return displayName?.startsWith(ORIRO_DEVICE_NAME_PREFIX) === true;
}

export function summarizeMatrixDeviceHealth(
  devices: MatrixManagedDeviceInfo[],
): MatrixDeviceHealthSummary {
  const currentDeviceId = devices.find((device) => device.current)?.deviceId ?? null;
  const openOriroDevices = devices.filter((device) =>
    isOriroManagedMatrixDevice(device.displayName),
  );
  return {
    currentDeviceId,
    staleOriroDevices: openOriroDevices.filter((device) => !device.current),
    currentOriroDevices: openOriroDevices.filter((device) => device.current),
  };
}
