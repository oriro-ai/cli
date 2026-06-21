---
summary: "OriroHub CLI entry points for discovering, installing, publishing, and verifying Oriro skills and plugins."
read_when:
  - You want to use OriroHub from the command line
  - You want to install OriroHub skills or plugins through Oriro
  - You want to publish OriroHub packages
title: "OriroHub CLI"
---

# OriroHub CLI

Oriro has two command-line entry points for OriroHub:

- `oriro skills` and `oriro plugins` install and manage OriroHub packages
  inside Oriro.
- The standalone `orirohub` CLI handles publisher workflows such as login,
  publish, transfer, and sync.

## Discover and install

Use Oriro commands when you want to install or update packages for a local
Oriro agent or Gateway.

```bash
oriro skills search "calendar"
oriro skills install <slug>
oriro skills update <slug>
oriro skills verify <slug>

oriro plugins search "calendar"
oriro plugins install orirohub:<package>
oriro plugins update <id-or-npm-spec>
```

Skill installs target the active workspace `skills/` directory by default. Add
`--global` to install into the shared managed skills directory.

Plugin installs use the `orirohub:` prefix when you want OriroHub resolution
instead of npm or another install source.

## Publish and maintain

Install the standalone OriroHub CLI for publisher workflows:

```bash
npm i -g orirohub
orirohub login
```

Publish plugin packages with `orirohub package publish`:

```bash
orirohub package publish your-org/your-plugin --dry-run
orirohub package publish your-org/your-plugin
orirohub package publish your-org/your-plugin@v1.0.0
```

Publish skill folders with `orirohub skill publish`:

```bash
orirohub skill publish ./skills/review-helper
orirohub skill publish ./skills/review-helper --version 1.0.0
```

When local skill scan state or package ownership needs maintenance, use the
relevant standalone command:

```bash
orirohub sync --all
orirohub package transfer @old-owner/package --to new-owner
```

## Related

- [`oriro skills`](/cli/skills) - local skill search, install, update, and
  verification
- [`oriro plugins`](/cli/plugins) - plugin search, install, update, and
  inspection
- [OriroHub publishing](/orirohub/publishing) - owner scope, release validation,
  and review flow
- [Creating skills](/tools/creating-skills) - skill authoring and publish flow
- [Building plugins](/plugins/building-plugins) - plugin package authoring
