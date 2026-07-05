# ORIRO app — native installer build (Phase 6)

The "no Ollama" experience for non-technical users = the ORIRO CLI + the embedded llama.cpp runtime,
packaged as **one signed, double-click installer per OS**. Everything the installer runs is already
built and tested in `src/` (streaming `.orx`, ChatML, `<think>` strip, `pull`/`import`/`serve`,
`login`). This doc is the packaging + signing procedure. The only inputs not in the repo are the
**signing certificates** (yours) and the **prebuilt llama.cpp binaries** (fetched at build time).

## What the installed app does (already implemented — just orchestrate these)
1. First launch → open oriro.ai sign-in, receive the setup code via the handoff → `oriro login <code>`.
2. `oriro models pull` → downloads Gauss + Avila V2.4 (resumable, one at a time) + their vision
   projectors (when published) → device-locked `.orx`. (Or `oriro models import` for files the user
   already downloaded in the browser.)
3. `oriro models serve` → local OpenAI endpoint on `127.0.0.1:11435`; the workspace talks to it.
   No Ollama, no Modelfile, no terminal for the user.

## Build steps
1. **Compile the CLI:** `npm run build` → `dist/cli.js`.
2. **Bundle a Node runtime + the CLI** into a single binary. Use `@yao-pkg/pkg` (maintained pkg fork,
   Node 22 targets) or Node SEA:
   `npx @yao-pkg/pkg dist/cli.js --targets node22-win-x64,node22-macos-arm64,node22-macos-x64,node22-linux-x64 --output build/oriro`
3. **Ship the native engine prebuilt** — do NOT compile llama.cpp on the user's machine. `node-llama-cpp`
   downloads prebuilt binaries per OS/arch; include its `bins/` next to the binary (CPU + Metal/CUDA/
   Vulkan variants) and set `NODE_LLAMA_CPP_SKIP_DOWNLOAD=1` at runtime so it uses the bundled ones.
4. **Wrap in a platform installer:**
   - Windows: WiX/Inno Setup → `.msi`/`.exe`.
   - macOS: `.app` bundle → `.dmg`.
   - Linux: `.AppImage` / `.deb`.

## Signing (YOUR certs — the only external gate)
- **Windows:** `signtool sign /fd SHA256 /a /tr http://timestamp.digicert.com /td SHA256 oriro-setup.exe`
  (needs an EV or OV code-signing cert; EV clears SmartScreen instantly).
- **macOS:** `codesign --deep --options runtime --sign "Developer ID Application: <you>" ORIRO.app`
  then `xcrun notarytool submit ORIRO.dmg --apple-id … --team-id … --wait` then `xcrun stapler staple`.
- Unsigned still runs (with a SmartScreen/Gatekeeper warning) — signing removes the warning for
  non-technical users. **This is the only step that needs you.**

## Distribution
- Host the signed installers; oriro.app "Download" links to the per-OS installer (replacing the Ollama
  Modelfile steps once the installer is live).
- Alternatively (technical users, today): `npm i -g @oriro/orirocli` then `oriro login` → `oriro models
  pull` → `oriro models serve`. (Publishing @oriro/orirocli is Vinay-gated.)

## Status
- App logic: **DONE + unit-tested** (see `scripts/test-runtime.ts`, `npm run smoke`).
- Prebuilt-engine bundling + installer wrap: mechanical, per the steps above.
- Code-signing: **needs your certs.**
- Real 9B inference speed: validate on target hardware (no native runtime in CI).
