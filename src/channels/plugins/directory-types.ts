/**
 * Channel directory input types.
 *
 * Defines config/account/query parameters shared by directory-capable plugins.
 */
import type { OriroConfig } from "../../config/types.js";

/**
 * Shared input for channel directory lookups.
 *
 * Directory-capable plugins receive the active config plus optional account
 * scope, search text, and result limit from setup or command surfaces.
 */
export type DirectoryConfigParams = {
  cfg: OriroConfig;
  accountId?: string | null;
  query?: string | null;
  limit?: number | null;
};
