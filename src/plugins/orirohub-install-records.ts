// Converts OriroHub plugin entries into install records.
import type { PluginInstallRecord } from "../config/types.plugins.js";
import type { OriroHubPackageChannel, OriroHubPackageFamily } from "../infra/orirohub.js";

/** Install record fields captured for OriroHub plugin installs. */
export type OriroHubPluginInstallRecordFields = {
  source: "orirohub";
  orirohubUrl: string;
  orirohubPackage: string;
  orirohubFamily: Exclude<OriroHubPackageFamily, "skill">;
  orirohubChannel?: OriroHubPackageChannel;
  version?: string;
  integrity?: string;
  resolvedAt?: string;
  installedAt?: string;
  artifactKind?: "legacy-zip" | "npm-pack";
  artifactFormat?: "zip" | "tgz";
  npmIntegrity?: string;
  npmShasum?: string;
  npmTarballName?: string;
  oriropackSha256?: string;
  oriropackSpecVersion?: number;
  oriropackManifestSha256?: string;
  oriropackSize?: number;
};

/** Builds plugin install record fields from resolved OriroHub package metadata. */
export function buildOriroHubPluginInstallRecordFields(
  fields: OriroHubPluginInstallRecordFields,
): Pick<
  PluginInstallRecord,
  | "source"
  | "orirohubUrl"
  | "orirohubPackage"
  | "orirohubFamily"
  | "orirohubChannel"
  | "version"
  | "integrity"
  | "resolvedAt"
  | "installedAt"
  | "artifactKind"
  | "artifactFormat"
  | "npmIntegrity"
  | "npmShasum"
  | "npmTarballName"
  | "oriropackSha256"
  | "oriropackSpecVersion"
  | "oriropackManifestSha256"
  | "oriropackSize"
> {
  return {
    source: "orirohub",
    orirohubUrl: fields.orirohubUrl,
    orirohubPackage: fields.orirohubPackage,
    orirohubFamily: fields.orirohubFamily,
    ...(fields.orirohubChannel ? { orirohubChannel: fields.orirohubChannel } : {}),
    ...(fields.version ? { version: fields.version } : {}),
    ...(fields.integrity ? { integrity: fields.integrity } : {}),
    ...(fields.resolvedAt ? { resolvedAt: fields.resolvedAt } : {}),
    ...(fields.installedAt ? { installedAt: fields.installedAt } : {}),
    ...(fields.artifactKind ? { artifactKind: fields.artifactKind } : {}),
    ...(fields.artifactFormat ? { artifactFormat: fields.artifactFormat } : {}),
    ...(fields.npmIntegrity ? { npmIntegrity: fields.npmIntegrity } : {}),
    ...(fields.npmShasum ? { npmShasum: fields.npmShasum } : {}),
    ...(fields.npmTarballName ? { npmTarballName: fields.npmTarballName } : {}),
    ...(fields.oriropackSha256 ? { oriropackSha256: fields.oriropackSha256 } : {}),
    ...(fields.oriropackSpecVersion !== undefined
      ? { oriropackSpecVersion: fields.oriropackSpecVersion }
      : {}),
    ...(fields.oriropackManifestSha256
      ? { oriropackManifestSha256: fields.oriropackManifestSha256 }
      : {}),
    ...(fields.oriropackSize !== undefined ? { oriropackSize: fields.oriropackSize } : {}),
  };
}
