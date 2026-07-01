---
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
watermark: ORIRO
disable-model-invocation: true
name: 21stdev
description: 21st.dev "Magic" MCP — generate, refine, and find UI components (and brand logos) from natural language, pulling from the 21st.dev component library. Activate when the user invokes `/21stdev`, says "21st", "magic component", "build me a UI component", "get a component", "component inspiration", or wants a ready-made React/Tailwind component or a brand logo as JSX/SVG. ALWAYS pair with `oriro-ui-2026` (the version-locked 2026 stack + rich-dark rules) for ORIRO work — Magic generates the raw component, oriro-ui-2026 governs how it must look and which libraries are allowed.
---

# /21stdev — 21st.dev Magic MCP

The Magic MCP server (`@21st-dev/magic`, repo `github.com/21st-dev/magic-mcp`) turns a
natural-language description into a real, copy-ready UI component sourced from the
21st.dev library, and can refine an existing component or fetch brand logos as
JSX/TSX/SVG. It is a **dev-time tool** — it writes component *code* into the editor;
nothing it produces calls an external service at runtime.

## When to use
- "Build me a `<pricing table / hero / bento grid / testimonial / navbar>`"
- "Give me inspiration / variants for a component"
- "Refine / polish this component" (improve an existing one)
- "Get the `<company>` logo as a React component / SVG"

## Wiring (already done in `oriro/.mcp.json`)
Server is registered as **`magic`** (Windows-safe `cmd /c npx -y @21st-dev/magic@latest`),
with the API key passed via env (`API_KEY=${TWENTY_FIRST_API_KEY}`) — never committed.
To activate: set `TWENTY_FIRST_API_KEY` (key from https://21st.dev/magic/console) and
restart Claude Code so the MCP server loads. It is wired in `oriro/` only; to use it in
another project, add the same block to that project's `.mcp.json` or register at user
scope with `claude mcp add -s user`.

## How to call it
Once the server is running its tools are **deferred** — discover them first with
`ToolSearch` (query `"magic"` or `"21st"`), then call. Expected tools (prefix
`mcp__magic__`):
- `21st_magic_component_builder` — generate a new component from a description (the `/ui` action).
- `21st_magic_component_inspiration` — fetch component ideas/variants/preview from 21st.dev.
- `21st_magic_component_refiner` — improve/redesign an existing component you point it at.
- `logo_search` — return a brand logo as JSX/TSX/SVG (SVGL).

If a name differs once loaded, trust the ToolSearch result over this list.

## ORIRO rules when using the output (non-negotiable)
1. **Pair with `oriro-ui-2026`.** Magic's output is a starting point, not the final
   look. Conform it to the 2026 stack: Motion/`motion`, Tailwind, shadcn-owned
   primitives, rich-dark surfaces (never `#000`), distinctive self-hosted display
   font (never Inter/Roboto). Strip anything that adds a paid dependency or a runtime
   external call.
2. **OR-FREE-FOREVER holds.** This tool is fine because it is build-time: the generated
   component is plain React/Tailwind that ships **key-free**, with no runtime call to
   21st.dev or any paid API. Never wire a generated component to a paid runtime service
   or store a key client-side. The 21st.dev key is a *developer* credential only.
3. **Respect frozen UI files.** Do not paste generated components into a
   frozen UI file and push straight to prod. Build → deploy with no traffic → the owner
   flips prod traffic. Generated components live in new/non-frozen files until approved.
4. **Own the code.** Copy the generated source into the repo (like shadcn/MagicUI) —
   do not add a runtime dependency on the Magic service.
5. **Verify by real run.** A component is "done" only after a real staging run + eyeball,
   not when it type-checks (per oriro-ui-2026 quality gates).

## Quick flow
1. `ToolSearch "magic"` → load the builder/refiner/inspiration/logo tools.
2. Describe the component precisely (purpose, content, states, dark-mode, responsive).
3. Take the output → conform to `oriro-ui-2026` → place in a new file → stage-deploy.
