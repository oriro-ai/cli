/**
 * Trash helpers for Browser-owned files constrained to user and Oriro temp
 * roots.
 */
import os from "node:os";
import { movePathToTrash as movePathToTrashWithAllowedRoots } from "oriro/plugin-sdk/browser-config";
import { resolvePreferredOriroTmpDir } from "oriro/plugin-sdk/temp-path";

/** Moves a path to trash only when it lives under allowed Browser roots. */
export async function movePathToTrash(targetPath: string): Promise<string> {
  return await movePathToTrashWithAllowedRoots(targetPath, {
    allowedRoots: [os.homedir(), resolvePreferredOriroTmpDir()],
  });
}
