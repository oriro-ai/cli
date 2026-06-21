// Memory Core plugin module implements public artifacts behavior.
import {
  listMemoryHostPublicArtifacts,
  type MemoryPluginPublicArtifact,
} from "oriro/plugin-sdk/memory-host-core";
import type { OriroConfig } from "../api.js";

export async function listMemoryCorePublicArtifacts(params: {
  cfg: OriroConfig;
}): Promise<MemoryPluginPublicArtifact[]> {
  return await listMemoryHostPublicArtifacts(params);
}
