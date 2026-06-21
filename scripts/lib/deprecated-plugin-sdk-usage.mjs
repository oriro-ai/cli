// Builds the list of deprecated public plugin SDK specifiers guarded by scripts.
import deprecatedPublicPluginSdkSubpaths from "./plugin-sdk-deprecated-public-subpaths.json" with { type: "json" };

const DEPRECATED_PLUGIN_SDK_EXTRA_SPECIFIERS = [
  "oriro/plugin-sdk",
  "oriro/plugin-sdk/agent-dir-compat",
  "oriro/plugin-sdk/test-utils",
];

/** Build fully qualified deprecated plugin SDK module specifiers from subpath metadata. */
export function buildDeprecatedPluginSdkModuleSpecifiers(
  deprecatedSubpaths = deprecatedPublicPluginSdkSubpaths,
) {
  return [
    ...new Set([
      ...DEPRECATED_PLUGIN_SDK_EXTRA_SPECIFIERS,
      ...deprecatedSubpaths.map((subpath) => `oriro/plugin-sdk/${subpath}`),
    ]),
  ].toSorted();
}
