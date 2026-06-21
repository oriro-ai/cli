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

const ORIRO_DEVICE_NAME_PREFIX = "Oriro ";

export function isOriroManagedMatrixDevice(displayName: string | null | undefined): boolean {
  return displayName?.startsWith(ORIRO_DEVICE_NAME_PREFIX) === true;
}

export function summarizeMatrixDeviceHealth(
  devices: MatrixManagedDeviceInfo[],
): MatrixDeviceHealthSummary {
  const currentDeviceId = devices.find((device) => device.current)?.deviceId ?? null;
  const oriroDevices = devices.filter((device) =>
    isOriroManagedMatrixDevice(device.displayName),
  );
  return {
    currentDeviceId,
    staleOriroDevices: oriroDevices.filter((device) => !device.current),
    currentOriroDevices: oriroDevices.filter((device) => device.current),
  };
}
