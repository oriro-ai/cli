# @oriro/tokenjuice

Official Tokenjuice output compaction plugin for Oriro.

Tokenjuice compacts noisy `exec` and `bash` tool results after commands run, before the result is fed back into the active agent session. It does not rewrite commands, rerun commands, or change exit codes.

## Install

```bash
oriro plugins install @oriro/tokenjuice
```

Restart the Gateway after installing or updating the plugin.

## Enable

```bash
oriro config set plugins.entries.tokenjuice.enabled true
```

Equivalent:

```bash
oriro plugins enable tokenjuice
```

## Docs

- https://docs.oriro.ai/tools/tokenjuice

## Package

- Plugin id: `tokenjuice`
- Package: `@oriro/tokenjuice`
- Minimum Oriro host: `2026.5.28`
