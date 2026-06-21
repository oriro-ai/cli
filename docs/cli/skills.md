---
summary: "CLI reference for `oriro skills` (search/install/update/verify/list/info/check/workshop)"
read_when:
  - You want to see which skills are available and ready to run
  - You want to search OriroHub or install skills from OriroHub, Git, or local directories
  - You want to verify a OriroHub skill with OriroHub
  - You want to debug missing binaries/env/config for skills
title: "Skills"
---

# `oriro skills`

Inspect local skills, search OriroHub, install skills from OriroHub/Git/local
directories, verify OriroHub skills, and update OriroHub-tracked installs.

Related:

- Skills system: [Skills](/tools/skills)
- Skill Workshop: [Skill Workshop](/tools/skill-workshop)
- Skills config: [Skills config](/tools/skills-config)
- OriroHub installs: [OriroHub](/orirohub/cli)

## Commands

```bash
oriro skills search "calendar"
oriro skills search --limit 20 --json
oriro skills install <slug>
oriro skills install <slug> --version <version>
oriro skills install git:owner/repo
oriro skills install git:owner/repo@main
oriro skills install ./path/to/skill --as custom-name
oriro skills install <slug> --force
oriro skills install <slug> --agent <id>
oriro skills install <slug> --global
oriro skills update <slug>
oriro skills update <slug> --global
oriro skills update --all
oriro skills update --all --agent <id>
oriro skills update --all --global
oriro skills verify <slug>
oriro skills verify <slug> --version <version>
oriro skills verify <slug> --tag <tag>
oriro skills verify <slug> --card
oriro skills verify <slug> --global
oriro skills list
oriro skills list --eligible
oriro skills list --json
oriro skills list --verbose
oriro skills list --agent <id>
oriro skills info <name>
oriro skills info <name> --json
oriro skills info <name> --agent <id>
oriro skills check
oriro skills check --agent <id>
oriro skills check --json
oriro skills workshop propose-create --name "qa-check" --description "QA checklist" --proposal ./PROPOSAL.md
oriro skills workshop propose-update qa-check --proposal ./PROPOSAL.md
oriro skills workshop list
oriro skills workshop inspect <proposal-id>
oriro skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
oriro skills workshop apply <proposal-id>
oriro skills workshop reject <proposal-id> --reason "Not reusable"
oriro skills workshop quarantine <proposal-id> --reason "Needs security review"
```

`search`, `update`, and `verify` use OriroHub directly. `install <slug>` installs
a OriroHub skill, `install git:owner/repo[@ref]` clones a Git skill, and
`install ./path` copies a local skill directory. By default, `install`, `update`,
and `verify` target the active workspace `skills/` directory; with `--global`,
they target the shared managed skills directory. `list`/`info`/`check` still
inspect the local skills visible to the current workspace and config.
Workspace-backed commands resolve the target workspace from `--agent <id>`, then
the current working directory when it is inside a configured agent workspace,
then the default agent.

Git and local directory installs expect `SKILL.md` at the source root. The
install slug comes from `SKILL.md` frontmatter `name` when it is valid, then the
source directory or repository name; use `--as <slug>` to override it. `--version`
is OriroHub-only. Skill installs do not support npm package specs or zip/archive
paths, and `oriro skills update` updates OriroHub-tracked installs only.

Gateway-backed skill dependency installs triggered from onboarding or Skills
settings use the separate `skills.install` request path instead.

Notes:

- `search [query...]` accepts an optional query; omit it to browse the default
  OriroHub search feed.
- `search --limit <n>` caps returned results.
- `install git:owner/repo[@ref]` installs a Git skill. Branch refs may contain
  slashes, such as `git:owner/repo@feature/foo`.
- `install ./path/to/skill` installs a local directory whose root contains
  `SKILL.md`.
- `install --as <slug>` overrides the inferred slug for Git and local directory
  installs.
- `install --version <version>` applies only to OriroHub skill slugs.
- `install --force` overwrites an existing workspace skill folder for the same
  slug.
- `--global` targets the shared managed skills directory and cannot be combined
  with `--agent <id>`.
- `--agent <id>` targets one configured agent workspace and overrides current
  working directory inference.
- `update <slug>` updates a single tracked skill. Add `--global` to target the
  shared managed skills directory instead of the workspace.
- `update --all` updates tracked OriroHub installs in the selected workspace, or
  in the shared managed skills directory when combined with `--global`.
- `verify <slug>` prints OriroHub's `orirohub.skill.verify.v1` JSON envelope by
  default. There is no `--json` flag because JSON is already the default.
- When OriroHub returns server-resolved source provenance, verify JSON also
  includes a commit-pinned `oriro.verifiedSourceUrl`. Unavailable or
  self-declared source URLs stay only in the raw provenance envelope and are not
  promoted.
- `verify` uses `.orirohub/origin.json` for installed OriroHub skills, so it
  verifies the installed version against the registry it came from. `--version`
  and `--tag` override the version selector but keep that installed registry
  when origin metadata exists.
- `verify --card` prints the generated Skill Card Markdown instead of JSON. The
  command exits non-zero when OriroHub returns `ok: false` or `decision: "fail"`;
  unsigned signatures are informational unless OriroHub policy changes.
- Installed OriroHub bundles can include a generated `skill-card.md`. Oriro
  treats verification as a OriroHub server decision and does not reject an
  installed skill just because that generated card changes the bundle
  fingerprint.
- `check --agent <id>` checks the selected agent's workspace and reports which
  ready skills are actually visible to that agent's prompt or command surface.
- `list` is the default action when no subcommand is provided.
- `list`, `info`, and `check` write their rendered output to stdout. With
  `--json`, that means the machine-readable payload stays on stdout for pipes
  and scripts.

## Skill Workshop

`oriro skills workshop` manages pending skill proposals in the selected
workspace. Proposals are not active skills until applied. For proposal storage,
support-file safeguards, Gateway methods, and approval policy, see
[Skill Workshop](/tools/skill-workshop).

```bash
oriro skills workshop propose-create \
  --name "qa-check" \
  --description "Repeatable QA checklist" \
  --proposal ./PROPOSAL.md
oriro skills workshop propose-create \
  --name "qa-check" \
  --description "Repeatable QA checklist" \
  --proposal-dir ./qa-check-proposal
oriro skills workshop propose-update qa-check --proposal ./PROPOSAL.md
oriro skills workshop list
oriro skills workshop inspect <proposal-id>
oriro skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
oriro skills workshop apply <proposal-id>
oriro skills workshop reject <proposal-id> --reason "Duplicate"
oriro skills workshop quarantine <proposal-id> --reason "Needs security review"
```

## Related

- [CLI reference](/cli)
- [Skills](/tools/skills)
