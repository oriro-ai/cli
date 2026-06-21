// Exposes root-scoped path resolution helpers with fs-safe defaults.
import "./fs-safe-defaults.js";

// Root path helpers resolve writable and existing paths without allowing
// traversal outside the configured root.
export {
  ensureDirectoryWithinRoot,
  resolveExistingPathsWithinRoot,
  resolvePathsWithinRoot,
  resolvePathWithinRoot,
  resolveStrictExistingPathsWithinRoot,
  resolveWritablePathWithinRoot,
} from "@oriro/fs-safe/advanced";
export { pathScope } from "@oriro/fs-safe/advanced";
