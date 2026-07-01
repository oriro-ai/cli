# Publishing `@oriro/orirocli`

This package ships **only** today's clean greenfield CLI — `dist/cli.js` + `skills/` + `README.md` + `ATTRIBUTION.md` (the `files[]` whitelist). No `src/`, no spikes, no old OpenClaw-fork code ever reaches users. A `prepublishOnly` gate (`scripts/prepublish-check.mjs`) re-builds from source, runs the built-binary smoke, and verifies the artifact before any publish can proceed — a stale or junked package cannot be published.

`private: true` is the safety gate: it blocks accidental `npm publish`. Flip it only for the publish, then re-arm it.

## Publish (run by Vinay)

```bash
cd C:/Users/vinay/orirocli

npm whoami                    # confirm logged in with @oriro publish rights

npm pkg delete private        # open the gate for one publish
npm publish --access public   # auto-runs: build → smoke (11/11) → prepublish-check
npm pkg set private=true      # re-arm the gate immediately

# Redirect the OLD bugged OpenClaw-fork name so no user lands on it:
npm deprecate "@oriro/cli@<=2026.6.10" "Moved to @oriro/orirocli — install that for the clean rebuild."

# Verify from a clean shell (new user path):
npx -y @oriro/orirocli@latest --version    # → 0.1.8
```

## What a user gets after this

- `npm i -g @oriro/orirocli` (or `npx @oriro/orirocli`) → today's clean CLI, nothing else.
- Anyone hitting the old `@oriro/cli` sees a deprecation notice pointing here.

## If the gate ever blocks publish

`scripts/prepublish-check.mjs` failed — read its output. It refuses to publish if: the shebang is duplicated, the bundle contains spike/test/old-fork strings, the package name/bin/publishConfig is wrong, skills count ≠ 323, or the packed file list contains anything outside the whitelist. Fix the cause; never bypass the gate.
