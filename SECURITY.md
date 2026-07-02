# Security Policy

ORIRO ships a deterministic security gate (**Guardian V3 Lite**) that vets every tool
call, and a consent-gated, locally-redacted work journal (**Scriber**). We take the
security of the CLI and of our users' machines seriously.

## Supported versions

The latest published `@oriro/orirocli` release on npm receives security fixes.
Older versions are not patched — please upgrade with `npm i -g @oriro/orirocli@latest`.

## Reporting a vulnerability

**Please do not open a public issue for security vulnerabilities.**

Report privately via one of:

- GitHub's **[Private vulnerability reporting](https://github.com/oriro-ai/cli/security/advisories/new)**
  (Security → Advisories → *Report a vulnerability*), or
- Email **security@oriro.ai**

Include: affected version, a description, reproduction steps, and impact. We aim to
acknowledge within **72 hours** and to provide a remediation timeline after triage.
Please give us a reasonable window to release a fix before any public disclosure.

## Scope

In scope: the CLI itself (`dist/cli.js`), the Guardian gate, the Scriber redaction path,
the router/Mux, MCP connector handling, and the channels (Telegram/Discord/WhatsApp) host.

Out of scope: vulnerabilities in third-party dependencies (report those upstream),
your own BYOK provider endpoints, and issues that require a pre-compromised machine.

## Design notes

- **Keyless by default; never a paid key.** BYOK keys you add are validated live and stored locally.
- **Guardian is fail-closed** and default-on: it blocks remote-exec (`curl | sh`), destructive
  wipes, reverse shells, and env/secret exfil — even in the most permissive run mode.
- **Scriber is off by default**, consent-gated, and redacts secrets/PII before writing;
  nothing it records ever leaves your machine.
