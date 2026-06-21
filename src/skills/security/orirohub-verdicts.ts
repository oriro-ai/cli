// OriroHub verdict helpers normalize skill security verdicts from registry metadata.
import {
  fetchOriroHubSkillSecurityVerdicts,
  resolveOriroHubBaseUrl,
  type OriroHubSkillSecurityVerdictItem,
} from "../../infra/orirohub.js";
import type { buildWorkspaceSkillStatus } from "../discovery/status.js";

/** OriroHub verdict item shape projected into local security scan verdicts. */
type OriroSkillSecurityVerdictItem = Omit<
  OriroHubSkillSecurityVerdictItem,
  "decision" | "error" | "security"
> & {
  registry: string;
  decision: string;
  securityStatus?: string | null;
  securityPassed?: boolean | null;
  error?: {
    code?: string;
    message?: string;
  };
};

function readSecurityStatus(security: unknown): string | null | undefined {
  if (!security || typeof security !== "object" || !("status" in security)) {
    return undefined;
  }
  const status = (security as { status?: unknown }).status;
  return typeof status === "string" ? status : undefined;
}

function readSecurityPassed(security: unknown): boolean | null | undefined {
  if (!security || typeof security !== "object" || !("passed" in security)) {
    return undefined;
  }
  const passed = (security as { passed?: unknown }).passed;
  return typeof passed === "boolean" ? passed : undefined;
}

function projectOriroHubVerdictItem(
  item: OriroHubSkillSecurityVerdictItem,
  registry: string,
): OriroSkillSecurityVerdictItem {
  const projected: OriroSkillSecurityVerdictItem = {
    registry,
    ok: item.ok,
    decision: item.decision,
    reasons: item.reasons,
    requestedSlug: item.requestedSlug,
    requestedVersion: item.requestedVersion,
  };
  if (item.slug !== undefined) {
    projected.slug = item.slug;
  }
  if (item.version !== undefined) {
    projected.version = item.version;
  }
  if (item.displayName !== undefined) {
    projected.displayName = item.displayName;
  }
  if (item.publisherHandle !== undefined) {
    projected.publisherHandle = item.publisherHandle;
  }
  if (item.publisherDisplayName !== undefined) {
    projected.publisherDisplayName = item.publisherDisplayName;
  }
  if (item.createdAt !== undefined) {
    projected.createdAt = item.createdAt;
  }
  if (item.checkedAt !== undefined) {
    projected.checkedAt = item.checkedAt;
  }
  if (item.skillUrl !== undefined) {
    projected.skillUrl = item.skillUrl;
  }
  if (item.securityAuditUrl !== undefined) {
    projected.securityAuditUrl = item.securityAuditUrl;
  }
  const securityStatus = readSecurityStatus(item.security);
  if (securityStatus !== undefined) {
    projected.securityStatus = securityStatus;
  }
  const securityPassed = readSecurityPassed(item.security);
  if (securityPassed !== undefined) {
    projected.securityPassed = securityPassed;
  }
  if (item.error) {
    const error: OriroSkillSecurityVerdictItem["error"] = {};
    if (typeof item.error.code === "string") {
      error.code = item.error.code;
    }
    if (typeof item.error.message === "string") {
      error.message = item.error.message;
    }
    if (Object.keys(error).length > 0) {
      projected.error = error;
    }
  }
  return projected;
}

function normalizeAutoVerdictRegistryBase(registry: string): string | null {
  try {
    const url = new URL(registry);
    const normalizedPath = url.pathname.replace(/\/+$/, "");
    return `${url.origin}${normalizedPath}`;
  } catch {
    return null;
  }
}

function canAutoFetchVerdictRegistry(registry: string): boolean {
  const configured = normalizeAutoVerdictRegistryBase(resolveOriroHubBaseUrl());
  const target = normalizeAutoVerdictRegistryBase(registry);
  return configured !== null && target === configured;
}

export function collectOriroHubVerdictTargets(
  report: ReturnType<typeof buildWorkspaceSkillStatus>,
): Array<{ registry: string; slug: string; version: string }> {
  const targets = new Map<string, { registry: string; slug: string; version: string }>();
  for (const skill of report.skills) {
    const link = skill.orirohub;
    if (!link || link.status !== "linked" || !link.valid) {
      continue;
    }
    if (!canAutoFetchVerdictRegistry(link.registry)) {
      continue;
    }
    const key = `${link.registry}\0${link.slug}\0${link.installedVersion}`;
    targets.set(key, {
      registry: link.registry,
      slug: link.slug,
      version: link.installedVersion,
    });
  }
  return [...targets.values()];
}

export async function fetchOriroSkillSecurityVerdicts(
  targets: Array<{ registry: string; slug: string; version: string }>,
): Promise<OriroSkillSecurityVerdictItem[]> {
  const byRegistry = new Map<string, Array<{ slug: string; version: string }>>();
  for (const target of targets) {
    const registryTargets = byRegistry.get(target.registry) ?? [];
    registryTargets.push({ slug: target.slug, version: target.version });
    byRegistry.set(target.registry, registryTargets);
  }

  const items: OriroSkillSecurityVerdictItem[] = [];
  for (const [registry, registryTargets] of byRegistry) {
    const response = await fetchOriroHubSkillSecurityVerdicts({
      baseUrl: registry,
      items: registryTargets,
      skipAuth: true,
    });
    for (const item of response.items) {
      items.push(projectOriroHubVerdictItem(item, registry));
    }
  }
  return items;
}
