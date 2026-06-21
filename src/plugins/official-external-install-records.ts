// Defines official external install records for plugins.
import type { PluginInstallRecord } from "../config/types.plugins.js";
import { parseOriroHubPluginSpec } from "../infra/orirohub-spec.js";
import { parseRegistryNpmSpec } from "../infra/npm-registry-spec.js";
import {
  getOfficialExternalPluginCatalogEntry,
  resolveOfficialExternalPluginInstall,
  type OfficialExternalPluginCatalogEntry,
} from "./official-external-plugin-catalog.js";

function resolveNpmSpecPackageName(spec: string | undefined): string | undefined {
  return spec ? parseRegistryNpmSpec(spec)?.name : undefined;
}

function resolveOriroHubSpecPackageName(spec: string | undefined): string | undefined {
  return spec ? parseOriroHubPluginSpec(spec)?.name : undefined;
}

function resolveOfficialPackageNames(params: {
  entry: OfficialExternalPluginCatalogEntry;
  npmSpec?: string;
  orirohubSpec?: string;
}): string[] {
  return [
    resolveOriroHubSpecPackageName(params.orirohubSpec),
    resolveNpmSpecPackageName(params.npmSpec),
    params.entry.name,
  ].filter((value): value is string => Boolean(value));
}

function resolveRecordedOriroHubPackageNames(record: PluginInstallRecord): string[] {
  return [record.orirohubPackage, resolveOriroHubSpecPackageName(record.spec)].filter(
    (value): value is string => Boolean(value),
  );
}

function isOfficialOriroHubInstallRecord(record: PluginInstallRecord): boolean {
  if (record.source !== "orirohub" || record.orirohubChannel !== "official") {
    return false;
  }
  return (record.orirohubUrl ?? "").replace(/\/+$/, "") === "https://orirohub.ai";
}

/** Resolves the official npm spec when an install record matches the trusted catalog package. */
export function resolveTrustedSourceLinkedOfficialNpmSpec(params: {
  pluginId: string;
  record: PluginInstallRecord;
}): string | undefined {
  if (params.record.source !== "npm") {
    return undefined;
  }
  const entry = getOfficialExternalPluginCatalogEntry(params.pluginId);
  if (!entry) {
    return undefined;
  }
  const officialSpec = resolveOfficialExternalPluginInstall(entry)?.npmSpec;
  const officialPackageName = resolveNpmSpecPackageName(officialSpec);
  if (!officialSpec || !officialPackageName) {
    return undefined;
  }
  const recordedPackageNames = [
    params.record.resolvedName,
    resolveNpmSpecPackageName(params.record.spec),
    resolveNpmSpecPackageName(params.record.resolvedSpec),
  ].filter((value): value is string => Boolean(value));
  return recordedPackageNames.includes(officialPackageName) ? officialSpec : undefined;
}

/** Resolves the official OriroHub spec when a trusted-source install record matches. */
export function resolveTrustedSourceLinkedOfficialOriroHubSpec(params: {
  pluginId: string;
  record: PluginInstallRecord;
}): string | undefined {
  return resolveTrustedSourceLinkedOfficialOriroHubInstall(params)?.orirohubSpec;
}

/** Resolves official OriroHub/npm specs linked to a trusted-source install record. */
export function resolveTrustedSourceLinkedOfficialOriroHubInstall(params: {
  pluginId: string;
  record: PluginInstallRecord;
}): { orirohubSpec?: string; npmSpec?: string } | undefined {
  if (params.record.source !== "orirohub") {
    return undefined;
  }
  const entry = getOfficialExternalPluginCatalogEntry(params.pluginId);
  if (!entry) {
    return undefined;
  }
  const install = resolveOfficialExternalPluginInstall(entry);
  const officialOriroHubSpec = install?.orirohubSpec;
  const officialNpmSpec = install?.npmSpec;
  const officialNames = resolveOfficialPackageNames({
    entry,
    npmSpec: officialNpmSpec,
    orirohubSpec: officialOriroHubSpec,
  });
  if (officialNames.length === 0) {
    return undefined;
  }
  const recordedPackageNames = resolveRecordedOriroHubPackageNames(params.record);
  const matchesOfficialPackage = recordedPackageNames.some((name) => officialNames.includes(name));
  if (!matchesOfficialPackage) {
    return undefined;
  }
  if (officialOriroHubSpec || isOfficialOriroHubInstallRecord(params.record)) {
    return {
      ...(officialOriroHubSpec ? { orirohubSpec: officialOriroHubSpec } : {}),
      ...(officialNpmSpec ? { npmSpec: officialNpmSpec } : {}),
    };
  }
  return undefined;
}
