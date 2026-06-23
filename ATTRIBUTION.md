# ORIRO CLI — Attribution & Provenance

Private provenance record. It honors upstream authors and satisfies MIT/Apache-2.0
notice obligations. Per ORIRO Cardinal Rule 1, **this is never surfaced in the product UI** —
it is the internal record of what we built on, folded from, or learned from.

Living document: a source is only listed under "Code folded" once its component actually
lands in the tree (validated, zero-OpenClaw). Until then it sits under "To fold" or "Reference".

---

## Foundation (used as a library)
- **Pi agent harness** — `@earendil-works/pi-*` / `@mariozechner/pi-*` (pi-agent-core, pi-ai, pi-tui, pi-coding-agent). **MIT** © 2025 Mario Zechner. The base our CLI is built on.

## Code folded — our OWN modules (from ORIRO `oriro-ai/cli`)
- **ORIRO** © ORIRO.ai / Greenri Solutions LLC — MIT. Routers/Mux, Guardian core, Language (NLLB), Scribe, Head, Avatar, identity. (Our code; folded clean, zero OpenClaw footprint.)

## To fold — external, validated SAFE (MIT + TypeScript + zero OpenClaw)
- **gitagent** — https://github.com/open-gitagent/gitagent — **MIT** — open-gitagent (shreyaskapale / shreyas-lyzr, parshvadaftari, kagura-agent, Nivesh353, carvalab).
  Built on the same Pi harness. Candidate components: tool/skill/plugin/hook loaders, `node-cron` scheduler, git-committed memory layer, OTel setup. → Step 5 / 5A / 7.
- **nanoclaw** — https://github.com/nanocoai/nanoclaw — **MIT** — nanocoai (gavrielc, Koshkoshinsk, gabi-simons, glifocat).
  Independent (verified no openclaw deps). Candidate components: `better-sqlite3` session/memory store, cron scheduler, `@clack/prompts` onboarding. → 5A Scriber index / 7.

## Reference only — concepts/patterns ported (credit; no code copied)
- **agent-of-empires** — https://github.com/agent-of-empires/agent-of-empires — **MIT** — njbrake, Seluj78, jerome-benoit, BTForIT. tmux+worktree+state-machine agent supervision → Step 7.
- **vibe-kanban** — https://github.com/BloopAI/vibe-kanban — **Apache-2.0** — BloopAI (stunningpixels, abcpro1, LSRCT, ggordonhall, anastasiya1155). kanban→worktree task model → Step 7. (Project sunsetting.)
- **hermes-agent** — https://github.com/NousResearch/hermes-agent — **MIT** — NousResearch (teknium1, OutThisLife, kshitijk4poor, benbarclay). (Python — ideas only.) OpenClaw link = one-way `hermes claw migrate` data-import tooling only (no code dep/fork — safe). Transferable ideas: **SQLite FTS5 + LLM-summarization cross-session memory → 5A Scriber retrieval index** (highest value; pairs with nanoclaw better-sqlite3); RPC subagent isolation ("zero-context-cost turns") → Step 7; natural-language cron → Step 7 automations; multi-platform unified-context gateway → channels. CAUTION: its autonomous self-rewriting skill loop must be Guardian-gated/deferred, never ported unsandboxed.
- **nanobot** — https://github.com/HKUDS/nanobot — **MIT** — HKUDS (Re-bin, chengyongru, Athemis). Channel/model-router design. (Python.)
- **zeroclaw** — https://github.com/zeroclaw-labs/zeroclaw — **Apache-2.0** — zeroclaw-labs. Security policy / SOP engine design. (Rust.)
- **nullclaw** — https://github.com/nullclaw/nullclaw — **MIT** — nullclaw (DonPrus, manelsen). vtable provider/channel/memory abstraction. (Zig.)
- **moltis** — https://github.com/moltis-org/moltis — **MIT** — moltis-org (penso). Sandbox boundary + skill-import schema. (Rust.)
- **picoclaw** — https://github.com/sipeed/picoclaw — **MIT** — Sipeed. Low-footprint single-binary design. (Go.)
- **lionclaw** — https://github.com/moshthepitt/lionclaw — **MIT** — moshthepitt. Worker/permissions/audit control-plane model. (Rust.)

## MCP — Step 7 connectors
- **`@modelcontextprotocol/sdk`** — **MIT** © Anthropic — the official MCP SDK; a runtime dependency. The connectors MCP client (`src/connectors/mcp-client.ts`) is built on its `Client` + stdio/streamable-HTTP transports (no hand-rolled protocol).
- **openharness** (`github.com/zhijiewong/openharness`) — **MIT** — *pattern reference only* (no code copied): the official-SDK migration, `server__tool` namespacing, deferred-loading, OAuth+keychain, retryable reconnect. Independent, zero OpenClaw footprint.
- **goose** (`github.com/aaif-goose/goose`, Block) — **Apache-2.0** — *pattern reference only* (Rust): the battle-scars hardening — per-server isolation, stderr-on-init-failure, env denylist, 3-state OAuth, OSV check, Windows Job Objects, `_meta` owner stamping.
- Connector catalog (59 entries) generated from ORIRO's own `connectors_pass.jsonl` (validated set), scrubbed.

## Evaluated — NOT used (recorded for honesty)
- **github/copilot-cli** — proprietary / no-derivatives, no source in repo. Blocked.
- **manaflow-ai/cmux** — GPL-3.0 (copyleft) + Swift/macOS. Blocked.
- **superset-sh/superset** — Elastic License 2.0 (license-key + anti-competing-service clauses). Blocked for fold; pattern reference only.
- **dataelement/Clawith** — Apache-2.0 but "OpenClaw for Teams" branded Python/React web platform. Skipped (footprint + wrong shape).
