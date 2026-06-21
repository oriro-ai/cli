---
summary: "CLI reference for `oriro plugins` (init, build, validate, list, install, marketplace, uninstall, enable/disable, doctor)"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to scaffold or validate a simple tool plugin
  - You want to debug plugin load failures
title: "Plugins"
sidebarTitle: "Plugins"
---

Manage Gateway plugins, hook packs, and compatible bundles.

<CardGroup cols={2}>
  <Card title="Plugin system" href="/tools/plugin">
    End-user guide for installing, enabling, and troubleshooting plugins.
  </Card>
  <Card title="Manage plugins" href="/plugins/manage-plugins">
    Quick examples for install, list, update, uninstall, and publishing.
  </Card>
  <Card title="Plugin bundles" href="/plugins/bundles">
    Bundle compatibility model.
  </Card>
  <Card title="Plugin manifest" href="/plugins/manifest">
    Manifest fields and config schema.
  </Card>
  <Card title="Security" href="/gateway/security">
    Security hardening for plugin installs.
  </Card>
</CardGroup>

## Commands

```bash
oriro plugins list
oriro plugins list --enabled
oriro plugins list --verbose
oriro plugins list --json
oriro plugins search <query>
oriro plugins search <query> --limit 20
oriro plugins search <query> --json
oriro plugins install <path-or-spec>
oriro plugins inspect <id>
oriro plugins inspect <id> --runtime
oriro plugins inspect <id> --json
oriro plugins inspect --all
oriro plugins info <id>
oriro plugins enable <id>
oriro plugins disable <id>
oriro plugins registry
oriro plugins registry --refresh
oriro plugins uninstall <id>
oriro plugins doctor
oriro plugins update <id-or-npm-spec>
oriro plugins update --all
oriro plugins marketplace list <marketplace>
oriro plugins marketplace list <marketplace> --json
oriro plugins init <id>
oriro plugins init <id> --directory ./my-plugin --name "My Plugin"
oriro plugins build --entry ./dist/index.js
oriro plugins build --entry ./dist/index.js --check
oriro plugins validate --entry ./dist/index.js
```

For slow install, inspect, uninstall, or registry-refresh investigation, run the
command with `ORIRO_PLUGIN_LIFECYCLE_TRACE=1`. The trace writes phase timings
to stderr and keeps JSON output parseable. See [Debugging](/help/debugging#plugin-lifecycle-trace).

<Note>
In Nix mode (`ORIRO_NIX_MODE=1`), plugin lifecycle mutators are disabled. Use the Nix source for this install instead of `plugins install`, `plugins update`, `plugins uninstall`, `plugins enable`, or `plugins disable`; for nix-oriro, use the agent-first [Quick Start](https://github.com/oriro/nix-oriro#quick-start).
</Note>

<Note>
Bundled plugins ship with Oriro. Some are enabled by default (for example bundled model providers, bundled speech providers, and the bundled browser plugin); others require `plugins enable`.

Native Oriro plugins must ship `oriro.plugin.json` with an inline JSON Schema (`configSchema`, even if empty). Compatible bundles use their own bundle manifests instead.

`plugins list` shows `Format: oriro` or `Format: bundle`. Verbose list/info output also shows the bundle subtype (`codex`, `claude`, or `cursor`) plus detected bundle capabilities.
</Note>

### Author

```bash
oriro plugins init stock-quotes --name "Stock Quotes"
cd stock-quotes
npm run plugin:build
npm run plugin:validate
```

`plugins init` creates a minimal TypeScript tool plugin that uses
`defineToolPlugin`. `plugins build` imports that entry, reads its static tool
metadata, writes `oriro.plugin.json`, and keeps `package.json`
`oriro.extensions` aligned. `plugins validate` checks that the generated
manifest, package metadata, and current entry export still agree. See
[Tool Plugins](/plugins/tool-plugins) for the full authoring workflow.

The scaffold writes TypeScript source but generates metadata from the built
`./dist/index.js` entry so the workflow also works with the published CLI. Use
`--entry <path>` when the entry is not the default package entry. Use
`plugins build --check` in CI to fail when generated metadata is stale without
rewriting files.

### Install

```bash
oriro plugins search "calendar"                   # search OriroHub plugins
oriro plugins install <package>                      # source auto-detection
oriro plugins install orirohub:<package>              # OriroHub only
oriro plugins install npm:<package>                  # npm only
oriro plugins install npm-pack:<path.tgz>            # local npm pack through npm install semantics
oriro plugins install git:github.com/<owner>/<repo>  # git repo
oriro plugins install git:github.com/<owner>/<repo>@<ref>
oriro plugins install <package> --force              # overwrite existing install
oriro plugins install <package> --pin                # pin version
oriro plugins install <package> --dangerously-force-unsafe-install
oriro plugins install <path>                         # local path
oriro plugins install <plugin>@<marketplace>         # marketplace
oriro plugins install <plugin> --marketplace <name>  # marketplace (explicit)
oriro plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
```

Maintainers testing setup-time installs can override automatic plugin install
sources with guarded environment variables. See
[Plugin install overrides](/plugins/install-overrides).

<Warning>
Bare package names install from npm by default during the launch cutover, unless they match an official plugin id. Raw `@oriro/*` package specs that match bundled plugins use the bundled copy that shipped with the current Oriro build. Use `npm:<package>` when you deliberately want an external npm package instead. Use `orirohub:<package>` for OriroHub. Treat plugin installs like running code. Prefer pinned versions.
</Warning>

`plugins search` queries OriroHub for installable plugin packages and prints
install-ready package names. It searches code-plugin and bundle-plugin packages,
not skills. Use `oriro skills search` for OriroHub skills.

<Note>
OriroHub is the primary distribution and discovery surface for most plugins. Npm
remains a supported fallback and direct-install path. Oriro-owned
`@oriro/*` plugin packages are published on npm again; see the current list
on [npmjs.com/org/oriro](https://www.npmjs.com/org/oriro) or the
[plugin inventory](/plugins/plugin-inventory). Stable installs use `latest`.
Beta-channel installs and updates prefer the npm `beta` dist-tag when that tag
is available, then fall back to `latest`.
</Note>

<AccordionGroup>
  <Accordion title="Config includes and invalid-config repair">
    If your `plugins` section is backed by a single-file `$include`, `plugins install/update/enable/disable/uninstall` write through to that included file and leave `oriro.json` untouched. Root includes, include arrays, and includes with sibling overrides fail closed instead of flattening. See [Config includes](/gateway/configuration) for the supported shapes.

    If config is invalid during install, `plugins install` normally fails closed and tells you to run `oriro doctor --fix` first. During Gateway startup and hot reload, invalid plugin config fails closed like any other invalid config; `oriro doctor --fix` can quarantine the invalid plugin entry. The only documented install-time exception is a narrow bundled-plugin recovery path for plugins that explicitly opt into `oriro.install.allowInvalidConfigRecovery`.

  </Accordion>
  <Accordion title="--force and reinstall vs update">
    `--force` reuses the existing install target and overwrites an already-installed plugin or hook pack in place. Use it when you are intentionally reinstalling the same id from a new local path, archive, OriroHub package, or npm artifact. For routine upgrades of an already tracked npm plugin, prefer `oriro plugins update <id-or-npm-spec>`.

    If you run `plugins install` for a plugin id that is already installed, Oriro stops and points you at `plugins update <id-or-npm-spec>` for a normal upgrade, or at `plugins install <package> --force` when you genuinely want to overwrite the current install from a different source.

  </Accordion>
  <Accordion title="--pin scope">
    `--pin` applies to npm installs only. It is not supported with `git:` installs; use an explicit git ref such as `git:github.com/acme/plugin@v1.2.3` when you want a pinned source. It is not supported with `--marketplace`, because marketplace installs persist marketplace source metadata instead of an npm spec.
  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` is deprecated and is now a no-op. Oriro no longer runs built-in install-time dangerous-code blocking for plugin installs.

    Use the shared operator-owned `security.installPolicy` surface when host-specific install policy is required. Plugin `before_install` hooks are plugin-runtime lifecycle hooks and are not the primary policy boundary for CLI installs.

    If a plugin you published on OriroHub is hidden or blocked by a registry scan, use the publisher steps in [OriroHub publishing](/orirohub/publishing). `--dangerously-force-unsafe-install` does not ask OriroHub to rescan the plugin or make a blocked release public.

  </Accordion>
  <Accordion title="Hook packs and npm specs">
    `plugins install` is also the install surface for hook packs that expose `oriro.hooks` in `package.json`. Use `oriro hooks` for filtered hook visibility and per-hook enablement, not package installation.

    Npm specs are **registry-only** (package name + optional **exact version** or **dist-tag**). Git/URL/file specs and semver ranges are rejected. Dependency installs run in one managed npm project per plugin with `--ignore-scripts` for safety, even when your shell has global npm install settings. Managed plugin npm projects inherit Oriro's package-level npm `overrides`, so host security pins apply to hoisted plugin dependencies too.

    Use `npm:<package>` when you want to make npm resolution explicit. Bare package specs also install directly from npm during the launch cutover unless they match an official plugin id.

    Raw `@oriro/*` package specs that match bundled plugins resolve to the image-owned bundled copy before npm fallback. For example, `oriro plugins install @oriro/discord@2026.5.20 --pin` uses the bundled Discord plugin from the current Oriro build instead of creating a managed npm override. To force the external npm package, use `oriro plugins install npm:@oriro/discord@2026.5.20 --pin`.

    Bare specs and `@latest` stay on the stable track. Oriro date-stamped correction versions such as `2026.5.3-1` are stable releases for this check. If npm resolves either of those to a prerelease, Oriro stops and asks you to opt in explicitly with a prerelease tag such as `@beta`/`@rc` or an exact prerelease version such as `@1.2.3-beta.4`.

    For npm installs without an exact version (`npm:<package>` or `npm:<package>@latest`), Oriro checks the resolved package metadata before install. If the latest stable package requires a newer Oriro plugin API or minimum host version, Oriro inspects older stable versions and installs the newest compatible release instead. Exact versions and explicit dist-tags such as `@beta` remain strict: if the selected package is incompatible, the command fails and asks you to upgrade Oriro or choose a compatible version.

    If a bare install spec matches an official plugin id (for example `diffs`), Oriro installs the catalog entry directly. To install an npm package with the same name, use an explicit scoped spec (for example `@scope/diffs`).

  </Accordion>
  <Accordion title="Git repositories">
    Use `git:<repo>` to install directly from a git repository. Supported forms include `git:github.com/owner/repo`, `git:owner/repo`, full `https://`, `ssh://`, `git://`, `file://`, and `git@host:owner/repo.git` clone URLs. Add `@<ref>` or `#<ref>` to check out a branch, tag, or commit before install.

    Git installs clone into a temporary directory, check out the requested ref when present, then use the normal plugin directory installer. That means manifest validation, operator install policy, package-manager install work, and install records behave like npm installs. Recorded git installs include the source URL/ref plus the resolved commit so `oriro plugins update` can re-resolve the source later.

    After installing from git, use `oriro plugins inspect <id> --runtime --json` to verify runtime registrations such as gateway methods and CLI commands. If the plugin registered a CLI root with `api.registerCli`, execute that command directly through the Oriro root CLI, for example `oriro demo-plugin ping`.

  </Accordion>
  <Accordion title="Archives">
    Supported archives: `.zip`, `.tgz`, `.tar.gz`, `.tar`. Native Oriro plugin archives must contain a valid `oriro.plugin.json` at the extracted plugin root; archives that only contain `package.json` are rejected before Oriro writes install records.

    Use `npm-pack:<path.tgz>` when the file is an npm-pack tarball and you want
    to test the same per-plugin managed npm project path used by registry
    installs, including `package-lock.json` verification, hoisted dependency
    scanning, and npm install records. Plain archive paths still install as local
    archives under the plugin extensions root.

    Claude marketplace installs are also supported.

  </Accordion>
</AccordionGroup>

OriroHub installs use an explicit `orirohub:<package>` locator:

```bash
oriro plugins install orirohub:oriro-codex-app-server
oriro plugins install orirohub:oriro-codex-app-server@1.2.3
```

Bare npm-safe plugin specs install from npm by default during the launch cutover unless they match an official plugin id:

```bash
oriro plugins install oriro-codex-app-server
```

Use `npm:` to make npm-only resolution explicit:

```bash
oriro plugins install npm:oriro-codex-app-server
oriro plugins install npm:@oriro/discord@2026.5.20
oriro plugins install npm:@scope/plugin-name@1.0.1
```

Oriro checks the advertised plugin API / minimum gateway compatibility before install. When the selected OriroHub version publishes a OriroPack artifact, Oriro downloads the versioned npm-pack `.tgz`, verifies the OriroHub digest header and the artifact digest, then installs it through the normal archive path. Older OriroHub versions without OriroPack metadata still install through the legacy package archive verification path. Recorded installs keep their OriroHub source metadata, artifact kind, npm integrity, npm shasum, tarball name, and OriroPack digest facts for later updates.
Unversioned OriroHub installs keep an unversioned recorded spec so `oriro plugins update` can follow newer OriroHub releases; explicit version or tag selectors such as `orirohub:pkg@1.2.3` and `orirohub:pkg@beta` remain pinned to that selector.

#### Marketplace shorthand

Use `plugin@marketplace` shorthand when the marketplace name exists in Claude's local registry cache at `~/.claude/plugins/known_marketplaces.json`:

```bash
oriro plugins marketplace list <marketplace-name>
oriro plugins install <plugin-name>@<marketplace-name>
```

Use `--marketplace` when you want to pass the marketplace source explicitly:

```bash
oriro plugins install <plugin-name> --marketplace <marketplace-name>
oriro plugins install <plugin-name> --marketplace <owner/repo>
oriro plugins install <plugin-name> --marketplace https://github.com/<owner>/<repo>
oriro plugins install <plugin-name> --marketplace ./my-marketplace
```

<Tabs>
  <Tab title="Marketplace sources">
    - a Claude known-marketplace name from `~/.claude/plugins/known_marketplaces.json`
    - a local marketplace root or `marketplace.json` path
    - a GitHub repo shorthand such as `owner/repo`
    - a GitHub repo URL such as `https://github.com/owner/repo`
    - a git URL

  </Tab>
  <Tab title="Remote marketplace rules">
    For remote marketplaces loaded from GitHub or git, plugin entries must stay inside the cloned marketplace repo. Oriro accepts relative path sources from that repo and rejects HTTP(S), absolute-path, git, GitHub, and other non-path plugin sources from remote manifests.
  </Tab>
</Tabs>

For local paths and archives, Oriro auto-detects:

- native Oriro plugins (`oriro.plugin.json`)
- Codex-compatible bundles (`.codex-plugin/plugin.json`)
- Claude-compatible bundles (`.claude-plugin/plugin.json` or the default Claude component layout)
- Cursor-compatible bundles (`.cursor-plugin/plugin.json`)

Managed local installs must be plugin directories or archives. Standalone `.js`,
`.mjs`, `.cjs`, and `.ts` plugin files are not copied into the managed plugin
root by `plugins install`; list them explicitly in `plugins.load.paths` instead.

<Note>
Compatible bundles install into the normal plugin root and participate in the same list/info/enable/disable flow. Today, bundle skills, Claude command-skills, Claude `settings.json` defaults, Claude `.lsp.json` / manifest-declared `lspServers` defaults, Cursor command-skills, and compatible Codex hook directories are supported; other detected bundle capabilities are shown in diagnostics/info but are not yet wired into runtime execution.
</Note>

### List

```bash
oriro plugins list
oriro plugins list --enabled
oriro plugins list --verbose
oriro plugins list --json
oriro plugins search <query>
oriro plugins search <query> --limit 20
oriro plugins search <query> --json
```

<ParamField path="--enabled" type="boolean">
  Show only enabled plugins.
</ParamField>
<ParamField path="--verbose" type="boolean">
  Switch from the table view to per-plugin detail lines with source/origin/version/activation metadata.
</ParamField>
<ParamField path="--json" type="boolean">
  Machine-readable inventory plus registry diagnostics and package dependency install state.
</ParamField>

<Note>
`plugins list` reads the persisted local plugin registry first, with a manifest-only derived fallback when the registry is missing or invalid. It is useful for checking whether a plugin is installed, enabled, and visible to cold startup planning, but it is not a live runtime probe of an already-running Gateway process. After changing plugin code, enablement, hook policy, or `plugins.load.paths`, restart the Gateway that serves the channel before expecting new `register(api)` code or hooks to run. For remote/container deployments, verify you are restarting the actual `oriro gateway run` child, not only a wrapper process.

`plugins list --json` includes each plugin's `dependencyStatus` from `package.json`
`dependencies` and `optionalDependencies`. Oriro checks whether those package
names are present along the plugin's normal Node `node_modules` lookup path; it
does not import plugin runtime code, run a package manager, or repair missing
dependencies.
</Note>

`plugins search` is a remote OriroHub catalog lookup. It does not inspect local
state, mutate config, install packages, or load plugin runtime code. Search
results include the OriroHub package name, family, channel, version, summary, and
an install hint such as `oriro plugins install orirohub:<package>`.

For bundled plugin work inside a packaged Docker image, bind-mount the plugin
source directory over the matching packaged source path, such as
`/app/extensions/synology-chat`. Oriro will discover that mounted source
overlay before `/app/dist/extensions/synology-chat`; a plain copied source
directory remains inert so normal packaged installs still use compiled dist.

For runtime hook debugging:

- `oriro plugins inspect <id> --runtime --json` shows registered hooks and diagnostics from a module-loaded inspection pass. Runtime inspection never installs dependencies; use `oriro doctor --fix` to clean legacy dependency state or recover missing downloadable plugins that are referenced by config.
- `oriro gateway status --deep --require-rpc` confirms the reachable Gateway URL/profile, service/process hints, config path, and RPC health.
- Non-bundled conversation hooks (`llm_input`, `llm_output`, `before_model_resolve`, `before_agent_reply`, `before_agent_run`, `before_agent_finalize`, `agent_end`) require `plugins.entries.<id>.hooks.allowConversationAccess=true`.

Use `--link` to avoid copying a local plugin directory (adds to `plugins.load.paths`):

```bash
oriro plugins install -l ./my-plugin
```

Standalone plugin files must be listed in `plugins.load.paths` rather than
installed with `plugins install` or placed directly in `~/.oriro/extensions`
or `<workspace>/.oriro/extensions`. Those auto-discovered roots load plugin
package or bundle directories, while top-level script files are treated as local
helpers and skipped.

<Note>
Workspace-origin plugins discovered from a workspace extensions root are not
imported or executed until they are explicitly enabled. For local development,
run `oriro plugins enable <plugin-id>` or set
`plugins.entries.<plugin-id>.enabled: true`; if your config uses
`plugins.allow`, include the same plugin id there too. This fail-closed rule
also applies when channel setup explicitly targets a workspace-origin plugin for
setup-only loading, so local channel plugin setup code will not run while that
workspace plugin remains disabled or excluded from the allowlist. Linked installs
and explicit `plugins.load.paths` entries follow the normal policy for their
resolved plugin origin. See
[Configure plugin policy](/tools/plugin#configure-plugin-policy)
and [Configuration reference](/gateway/configuration-reference#plugins).

`--force` is not supported with `--link` because linked installs reuse the source path instead of copying over a managed install target.

Use `--pin` on npm installs to save the resolved exact spec (`name@version`) in the managed plugin index while keeping the default behavior unpinned.
</Note>

### Plugin index

Plugin install metadata is machine-managed state, not user config. Installs and updates write it to the shared SQLite state database under the active Oriro state directory. The `installed_plugin_index` row stores durable `installRecords` metadata, including records for broken or missing plugin manifests, plus a manifest-derived cold registry cache used by `oriro plugins update`, uninstall, diagnostics, and the cold plugin registry.

When Oriro sees shipped legacy `plugins.installs` records in config, runtime reads treat them as compatibility input without rewriting `oriro.json`. Explicit plugin writes and `oriro doctor --fix` move those records into the plugin index and remove the config key when config writes are allowed; if either write fails, the config records are kept so the install metadata is not lost.

### Uninstall

```bash
oriro plugins uninstall <id>
oriro plugins uninstall <id> --dry-run
oriro plugins uninstall <id> --keep-files
```

`uninstall` removes plugin records from `plugins.entries`, the persisted plugin index, plugin allow/deny list entries, and linked `plugins.load.paths` entries when applicable. Unless `--keep-files` is set, uninstall also removes the tracked managed install directory when it is inside Oriro's plugin extensions root. For active memory plugins, the memory slot resets to `memory-core`.

<Note>
`--keep-config` is supported as a deprecated alias for `--keep-files`.
</Note>

### Update

```bash
oriro plugins update <id-or-npm-spec>
oriro plugins update --all
oriro plugins update <id-or-npm-spec> --dry-run
oriro plugins update @oriro/voice-call
oriro plugins update oriro-codex-app-server --dangerously-force-unsafe-install
```

Updates apply to tracked plugin installs in the managed plugin index and tracked hook-pack installs in `hooks.internal.installs`.

<AccordionGroup>
  <Accordion title="Resolving plugin id vs npm spec">
    When you pass a plugin id, Oriro reuses the recorded install spec for that plugin. That means previously stored dist-tags such as `@beta` and exact pinned versions continue to be used on later `update <id>` runs.

    For npm installs, you can also pass an explicit npm package spec with a dist-tag or exact version. Oriro resolves that package name back to the tracked plugin record, updates that installed plugin, and records the new npm spec for future id-based updates.

    Passing the npm package name without a version or tag also resolves back to the tracked plugin record. Use this when a plugin was pinned to an exact version and you want to move it back to the registry's default release line.

  </Accordion>
  <Accordion title="Beta channel updates">
    `oriro plugins update` reuses the tracked plugin spec unless you pass a new spec. `oriro update` additionally knows the active Oriro update channel: on the beta channel, default-line npm and OriroHub plugin records try `@beta` first. They fall back to the recorded default/latest spec if no plugin beta release exists; npm plugins also fall back when the beta package exists but fails install validation. That fallback is reported as a warning and does not fail the core update. Exact versions and explicit tags stay pinned to that selector.

  </Accordion>
  <Accordion title="Version checks and integrity drift">
    Before a live npm update, Oriro checks the installed package version against the npm registry metadata. If the installed version and recorded artifact identity already match the resolved target, the update is skipped without downloading, reinstalling, or rewriting `oriro.json`.

    When a stored integrity hash exists and the fetched artifact hash changes, Oriro treats that as npm artifact drift. The interactive `oriro plugins update` command prints the expected and actual hashes and asks for confirmation before proceeding. Non-interactive update helpers fail closed unless the caller supplies an explicit continuation policy.

  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install on update">
    `--dangerously-force-unsafe-install` is also accepted on `plugins update` for compatibility, but it is deprecated and no longer changes plugin update behavior. Operator `security.installPolicy` can still block updates; plugin `before_install` hooks only apply in processes where plugin hooks are loaded.
  </Accordion>
</AccordionGroup>

### Inspect

```bash
oriro plugins inspect <id>
oriro plugins inspect <id> --runtime
oriro plugins inspect <id> --json
```

Inspect shows identity, load status, source, manifest capabilities, policy flags, diagnostics, install metadata, bundle capabilities, and any detected MCP or LSP server support without importing plugin runtime by default. JSON output includes the plugin manifest contracts, such as `contracts.agentToolResultMiddleware` and `contracts.trustedToolPolicies`, so operators can audit trusted-surface declarations before enabling or restarting a plugin. Add `--runtime` to load the plugin module and include registered hooks, tools, commands, services, gateway methods, and HTTP routes. Runtime inspection reports missing plugin dependencies directly; installs and repairs stay in `oriro plugins install`, `oriro plugins update`, and `oriro doctor --fix`.

Plugin-owned CLI commands are usually installed as root `oriro` command groups, but plugins may also register nested commands under a core parent such as `oriro nodes`. After `inspect --runtime` shows a command under `cliCommands`, run it at the listed path; for example a plugin that registers `demo-git` can be verified with `oriro demo-git ping`.

Each plugin is classified by what it actually registers at runtime:

- **plain-capability** — one capability type (e.g. a provider-only plugin)
- **hybrid-capability** — multiple capability types (e.g. text + speech + images)
- **hook-only** — only hooks, no capabilities or surfaces
- **non-capability** — tools/commands/services but no capabilities

See [Plugin shapes](/plugins/architecture#plugin-shapes) for more on the capability model.

<Note>
The `--json` flag outputs a machine-readable report suitable for scripting and auditing. `inspect --all` renders a fleet-wide table with shape, capability kinds, compatibility notices, bundle capabilities, and hook summary columns. `info` is an alias for `inspect`.
</Note>

### Doctor

```bash
oriro plugins doctor
```

`doctor` reports plugin load errors, manifest/discovery diagnostics, compatibility notices, and stale plugin config references such as missing plugin slots. When the install tree and plugin config are clean it prints `No plugin issues detected.` If stale config remains but the install tree is otherwise healthy, the summary says so instead of implying full plugin health.

If a configured plugin is present on disk but blocked by the loader's path-safety checks, config validation keeps the plugin entry and reports it as `present but blocked`. Fix the preceding blocked-plugin diagnostic, such as path ownership or world-writable permissions, instead of removing the `plugins.entries.<id>` or `plugins.allow` config.

For module-shape failures such as missing `register`/`activate` exports, rerun with `ORIRO_PLUGIN_LOAD_DEBUG=1` to include a compact export-shape summary in the diagnostic output.

### Registry

```bash
oriro plugins registry
oriro plugins registry --refresh
oriro plugins registry --json
```

The local plugin registry is Oriro's persisted cold read model for installed plugin identity, enablement, source metadata, and contribution ownership. Normal startup, provider owner lookup, channel setup classification, and plugin inventory can read it without importing plugin runtime modules.

Use `plugins registry` to inspect whether the persisted registry is present, current, or stale. Use `--refresh` to rebuild it from the persisted plugin index, config policy, and manifest/package metadata. This is a repair path, not a runtime activation path.

`oriro doctor --fix` also repairs registry-adjacent managed npm drift: if an orphaned or recovered `@oriro/*` package under a managed plugin npm project or the legacy flat managed npm root shadows a bundled plugin, doctor removes that stale package and rebuilds the registry so startup validates against the bundled manifest. Doctor also relinks the host `oriro` package into managed npm plugins that declare `peerDependencies.oriro`, so package-local runtime imports such as `oriro/plugin-sdk/*` resolve after updates or npm repairs.

<Warning>
`ORIRO_DISABLE_PERSISTED_PLUGIN_REGISTRY=1` is a deprecated break-glass compatibility switch for registry read failures. Prefer `plugins registry --refresh` or `oriro doctor --fix`; the env fallback is only for emergency startup recovery while the migration rolls out.
</Warning>

### Marketplace

```bash
oriro plugins marketplace list <source>
oriro plugins marketplace list <source> --json
```

Marketplace list accepts a local marketplace path, a `marketplace.json` path, a GitHub shorthand like `owner/repo`, a GitHub repo URL, or a git URL. `--json` prints the resolved source label plus the parsed marketplace manifest and plugin entries.

## Related

- [Building plugins](/plugins/building-plugins)
- [CLI reference](/cli)
- [OriroHub](/orirohub)
