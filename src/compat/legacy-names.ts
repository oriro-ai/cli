// Product/package naming constants that bridge current Oriro manifests with
// legacy Oriro keys still seen in older configs and packages.
export const PROJECT_NAME = "oriro" as const;

const LEGACY_PROJECT_NAMES = ["oriro"] as const;

export const MANIFEST_KEY = PROJECT_NAME;

/** Manifest keys accepted only for legacy compatibility. */
export const LEGACY_MANIFEST_KEYS = LEGACY_PROJECT_NAMES;

export const MACOS_APP_SOURCES_DIR = "apps/macos/Sources/Oriro" as const;
