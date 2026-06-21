// Defines install-related Zod schema fragments for config parsing.
import { z } from "zod";

const InstallSourceSchema = z.union([
  z.literal("npm"),
  z.literal("archive"),
  z.literal("path"),
  z.literal("orirohub"),
  z.literal("git"),
]);

const PluginInstallSourceSchema = z.union([InstallSourceSchema, z.literal("marketplace")]);

/** Zod object shape for persisted generic install records. */
export const InstallRecordShape = {
  source: InstallSourceSchema,
  spec: z.string().optional(),
  sourcePath: z.string().optional(),
  installPath: z.string().optional(),
  version: z.string().optional(),
  resolvedName: z.string().optional(),
  resolvedVersion: z.string().optional(),
  resolvedSpec: z.string().optional(),
  integrity: z.string().optional(),
  shasum: z.string().optional(),
  resolvedAt: z.string().optional(),
  installedAt: z.string().optional(),
  orirohubUrl: z.string().optional(),
  orirohubPackage: z.string().optional(),
  orirohubFamily: z.union([z.literal("code-plugin"), z.literal("bundle-plugin")]).optional(),
  orirohubChannel: z
    .union([z.literal("official"), z.literal("community"), z.literal("private")])
    .optional(),
  artifactKind: z.union([z.literal("legacy-zip"), z.literal("npm-pack")]).optional(),
  artifactFormat: z.union([z.literal("zip"), z.literal("tgz")]).optional(),
  npmIntegrity: z.string().optional(),
  npmShasum: z.string().optional(),
  npmTarballName: z.string().optional(),
  oriropackSha256: z.string().optional(),
  oriropackSpecVersion: z.number().int().nonnegative().optional(),
  oriropackManifestSha256: z.string().optional(),
  oriropackSize: z.number().int().nonnegative().optional(),
  gitUrl: z.string().optional(),
  gitRef: z.string().optional(),
  gitCommit: z.string().optional(),
} as const;

export const PluginInstallRecordShape = {
  ...InstallRecordShape,
  source: PluginInstallSourceSchema,
  marketplaceName: z.string().optional(),
  marketplaceSource: z.string().optional(),
  marketplacePlugin: z.string().optional(),
} as const;
