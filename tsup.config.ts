import { defineConfig } from "tsup";

// ORIRO CLI bundle. Pi packages are kept external (resolved from node_modules at runtime)
// so we ship a thin, fast CLI rather than re-bundling the whole agent harness.
export default defineConfig({
  entry: { cli: "src/cli.ts" },
  format: ["esm"],
  target: "node20",
  platform: "node",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  dts: false,
  banner: { js: "#!/usr/bin/env node" },
  // Thin CLI: every dependency resolves from node_modules at runtime (not bundled). This also
  // keeps the deferred optional peers external — @huggingface/transformers (NLLB) and playwright
  // (Head screenshots) are dynamic-imported and only present when the user enables them.
  skipNodeModulesBundle: true,
  external: [
    "@earendil-works/pi-agent-core",
    "@earendil-works/pi-ai",
    "@earendil-works/pi-coding-agent",
    "@earendil-works/pi-tui",
    "@modelcontextprotocol/sdk",
    "@huggingface/transformers",
    "playwright",
    "typebox",
    "discord.js",
    "@whiskeysockets/baileys",
    "qrcode-terminal",
  ],
});
