// Parses explicit OriroHub package install specs.
import { normalizeLowercaseStringOrEmpty } from "@oriro/normalization-core/string-coerce";

/** Parses explicit `orirohub:<name>[@version]` package specs for OriroHub installs. */
export function parseOriroHubPluginSpec(raw: string): {
  name: string;
  version?: string;
  baseUrl?: string;
} | null {
  const trimmed = raw.trim();
  if (!normalizeLowercaseStringOrEmpty(trimmed).startsWith("orirohub:")) {
    return null;
  }
  const spec = trimmed.slice("orirohub:".length).trim();
  if (!spec) {
    return null;
  }
  const atIndex = spec.lastIndexOf("@");
  if (atIndex <= 0) {
    return { name: spec };
  }
  if (atIndex >= spec.length - 1) {
    return null;
  }
  const name = spec.slice(0, atIndex).trim();
  const version = spec.slice(atIndex + 1).trim();
  if (!name || !version) {
    return null;
  }
  return {
    name,
    version,
  };
}
