# Contributing to ORIRO CLI

Thanks for your interest in ORIRO — a free, keyless, on-device-friendly terminal AI coder.
Contributions of all kinds are welcome: bug reports, docs, skills, connectors, and code.

## Ground rules

- **Be respectful.** See [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).
- **Security issues are private.** Do not file them as public issues — see [`SECURITY.md`](./SECURITY.md).
- **Provenance matters.** Any external code or pattern you fold in must be MIT/Apache-2.0
  (or compatible), TypeScript-friendly, and recorded in [`ATTRIBUTION.md`](./ATTRIBUTION.md)
  with its upstream URL, license, and authors. We honor upstream authors; we never ship
  copyleft or license-key-gated code.

## Local setup

Requires **Node ≥ 20**.

```bash
git clone https://github.com/oriro-ai/cli && cd cli
npm install
npm run build        # tsup → dist/cli.js
node dist/cli.js     # run the built CLI
```

Useful scripts:

| Script | What it does |
|--------|--------------|
| `npm run dev` | run from TypeScript source (`tsx src/cli.ts`) |
| `npm run build` | bundle to `dist/cli.js` (tsup) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:unit` | tool-sanitize + Guardian + Scribe unit tests |
| `npm run smoke` | build, then run the built-binary smoke suite |

## Before you open a PR

1. `npm run typecheck` is clean.
2. `npm run test:unit` passes.
3. `npm run smoke` passes (this builds and exercises the real `dist/cli.js`).
4. If you touched Guardian, add/extend a case in `scripts/test-guardian.ts` — security
   changes must be covered by a deterministic test.
5. If you changed the command surface, docs (README), skill count, or bin, run
   `node scripts/prepublish-check.mjs` so the publish gate still passes.
6. Keep commits focused; use clear, conventional-style messages (e.g. `fix:`, `feat:`, `docs:`).

## What we especially welcome

- New **skills** (`skills/<category>/<name>/SKILL.md`) and **MCP connectors**.
- Additional **languages** and translation quality fixes.
- Guardian detections for new abuse patterns (with tests).
- Bug reports with a reproduction and your OS + Node version.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](./LICENSE).
