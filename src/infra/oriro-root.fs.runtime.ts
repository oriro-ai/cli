// Oriro root resolution imports fs through this facade so tests can replace
// filesystem behavior without mocking node:fs globally.
export { default as oriroRootFsSync } from "node:fs";
export { default as oriroRootFs } from "node:fs/promises";
