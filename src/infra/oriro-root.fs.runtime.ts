// Oriro root resolution imports fs through this facade so tests can replace
// filesystem behavior without mocking node:fs globally.
export { default as openOriroRootFsSync } from "node:fs";
export { default as openOriroRootFs } from "node:fs/promises";
