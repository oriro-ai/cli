---
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
watermark: ORIRO
disable-model-invocation: true
name: orirohub
description: "Search, install, update, sync, or publish agent skills with the OriroHub CLI and registry."
metadata:
  {
    "oriro":
      {
        "requires": { "bins": ["orirohub"] },
        "install":
          [
            {
              "id": "node",
              "kind": "node",
              "package": "orirohub",
              "bins": ["orirohub"],
              "label": "Install OriroHub CLI (npm)",
            },
          ],
      },
  }
---

# OriroHub CLI

Install

```bash
npm i -g orirohub
```

Auth (publish)

```bash
orirohub login
orirohub whoami
```

Search

```bash
orirohub search "postgres backups"
```

Install

```bash
orirohub install my-skill
orirohub install my-skill --version 1.2.3
```

Update (hash-based match + upgrade)

```bash
orirohub update my-skill
orirohub update my-skill --version 1.2.3
orirohub update --all
orirohub update my-skill --force
orirohub update --all --no-input --force
```

List

```bash
orirohub list
```

Publish

```bash
orirohub publish ./my-skill --slug my-skill --name "My Skill" --version 1.2.0 --changelog "Fixes + docs"
```

Notes

- Default registry: https://orirohub.com (override with ORIROHUB_REGISTRY or --registry)
- Default workdir: cwd (falls back to Oriro workspace); install dir: ./skills (override with --workdir / --dir / ORIROHUB_WORKDIR)
- Update command hashes local files, resolves matching version, and upgrades to latest unless --version is set
