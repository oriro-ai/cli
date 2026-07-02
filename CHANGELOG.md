# Changelog

All notable changes to `@oriro/orirocli` are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.8] — 2026-07-01
### Added
- `routers add --url` — register ANY custom free or BYOK endpoint into the keyless router pool.

## [0.1.7] — 2026-06
### Fixed
- `npx @oriro/orirocli` now resolves everywhere — added the `npx` bin alias.

## [0.1.6] — 2026-06
### Added
- `scribe` CLI verbs (on/off/status/digest/timeline/recall/capture/health) — the consent-gated local work journal.
- Claude Code transcript adapter for Scribe capture.

## [0.1.5] — 2026-06
### Fixed
- Security hardening: Guardian V3 Lite (closed 39 bypasses + 4 over-blocks) and Scriber (5 redaction leaks).
- Multi-round adversarial re-QA (rounds 2–5): secret-directory boundary parity, IOC `.ssh` boundary, and residual regressions all closed.
- Functional bugs across onboarding, commands, routers, and the Mux.

## [0.1.4] — 2026-06
### Fixed
- 6 QA bugs: language-by-name, `/help`, false-removes, category handling, env-exfil detection.

## [0.1.3] — 2026-06
### Fixed
- Sanitize keyless-floor tool names to prevent token leakage.

## [0.1.2] — 2026-06
### Added
- Wired `oriro language` and `oriro avatar`.
### Fixed
- Corrected documented skill/connector counts.

## [0.1.1] — 2026-06
### Added
- First publishable, reproducible build. `dist/cli.js` committed; clean `npx` / `npm i -g` install path.
- Prepublish gate (`scripts/prepublish-check.mjs`) and built-binary smoke tests.

[0.1.8]: https://github.com/oriro-ai/cli/releases/tag/v0.1.8
[0.1.7]: https://github.com/oriro-ai/cli/releases/tag/v0.1.7
[0.1.6]: https://github.com/oriro-ai/cli/releases/tag/v0.1.6
[0.1.5]: https://github.com/oriro-ai/cli/releases/tag/v0.1.5
[0.1.4]: https://github.com/oriro-ai/cli/releases/tag/v0.1.4
[0.1.3]: https://github.com/oriro-ai/cli/releases/tag/v0.1.3
[0.1.2]: https://github.com/oriro-ai/cli/releases/tag/v0.1.2
[0.1.1]: https://github.com/oriro-ai/cli/releases/tag/v0.1.1
