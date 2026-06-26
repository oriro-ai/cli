// ORIRO CLI — Guardian V3 default rule set (the always-on first layer).
//
// These are deterministic, $0, sub-millisecond checks that fire on EVERY tool call
// before it runs — exec, file, and MCP. They are the FastBlock half of Guardian
// (the Guardian V3 Lite model is the agentic deep-analysis half). The rules target
// the threat surface of an agentic terminal: a tool call (often driven by untrusted
// web/MCP content) trying to destroy data, gain persistence, exfiltrate secrets,
// pull-and-run remote code, open a reverse shell, or smuggle a hostile MCP payload.
//
// Each rule is a pure predicate over a normalized GuardianCall. First/most-severe
// decision wins (see policy.ts). Rules never throw — a bad match returns null.

import type { GuardianRule, GuardianVerdict } from "./types.js";
import { scanToolCall } from "./v3lite.js";

const block = (rule: string, reason: string, severity: GuardianVerdict["severity"] = "critical"): GuardianVerdict => ({
  decision: "block",
  severity,
  rule,
  reason,
});
const ask = (rule: string, reason: string, severity: GuardianVerdict["severity"] = "warning"): GuardianVerdict => ({
  decision: "ask",
  severity,
  rule,
  reason,
});

const cmdOf = (c: { command?: string }): string => (c.command ?? "").toLowerCase();
const norm = (s: string): string => s.replace(/\s+/g, " ").trim();

// Robust `rm` danger check — resilient to flag order, split flags (-r -f),
// long flags (--recursive --force --no-preserve-root), and system-dir targets.
// The old single-regex form was evadable (e.g. `rm -rf --no-preserve-root /`,
// `rm  -r  -f  /`) — a real Guardian bypass found in QA.
function isDangerousRm(cmd: string): boolean {
  if (!/\brm\b/i.test(cmd)) return false;
  const hasRecursive = /(?:^|\s)-[a-z]*r/i.test(cmd) || /--recursive\b/i.test(cmd);
  const hasForce = /(?:^|\s)-[a-z]*f/i.test(cmd) || /--force\b/i.test(cmd);
  if (!hasRecursive || !hasForce) return false;
  if (/--no-preserve-root\b/i.test(cmd)) return true; // explicit root-wipe intent
  // bare dangerous targets: / ~ . * $HOME
  if (/(?:\s|^)(\/|~|\.|\*|\$home)(?:\s|$)/i.test(cmd)) return true;
  // recursive force-delete of a system directory
  return /(?:\s|^)\/(etc|usr|bin|sbin|var|boot|lib|lib64|sys|proc|dev|root|home|opt|windows|system32)(?:[\\/]|\s|$)/i.test(
    cmd,
  );
}

// ── Destructive filesystem / system wipes ────────────────────────────────────
const FS_DESTRUCTION: RegExp[] = [
  /\bmkfs\.?\w*\s+\/dev\//i, // reformat a disk
  /\bdd\s+.*\bof=\/dev\/(sd|nvme|disk|hd)/i, // overwrite raw disk
  /\b(shutdown|reboot|halt|poweroff)\b/i, // host disruption
  /:\s*\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, // fork bomb :(){ :|:& };:
  /\bremove-item\b.*-recurse.*-force.*[\\\/](windows|system32|users)\b/i, // PS recursive wipe
  /\b(format|cipher\s+\/w)\b.*[a-z]:\\?/i, // windows format / wipe-free-space
  />\s*\/dev\/(sd|nvme|disk|hd)\w/i, // redirect over raw disk
];

// ── Pull-and-run remote code (the #1 supply-chain / drive-by vector) ──────────
const REMOTE_EXEC: RegExp[] = [
  /\b(curl|wget|fetch)\b[^\n|]*\|\s*(sudo\s+)?(sh|bash|zsh|python\d?|node|perl|ruby)\b/i, // curl … | sh
  /\b(irm|iwr|invoke-webrequest|invoke-restmethod)\b[^\n|]*\|\s*(iex|invoke-expression)/i, // PS download|iex
  /\biex\b\s*\(\s*(new-object\s+net\.webclient|.*downloadstring)/i, // iex(New-Object Net.WebClient…)
  /\bbash\s+<\s*\(\s*(curl|wget)/i, // bash <(curl …)
  /\beval\b[^\n]*\$\(\s*(curl|wget|fetch)\b/i, // eval "$(curl …)"
  /\bpython\d?\s+-c\b[^\n]*urllib|requests\.get[^\n]*exec\(/i, // python one-liner fetch+exec
  /\b(base64\s+(-d|--decode)|xxd\s+-r|openssl\s+enc\s+-d)\b[^\n|]*\|\s*(sudo\s+)?(sh|bash|zsh|python\d?|node|perl|ruby)\b/i, // decode-then-exec (obfuscated loader)
];

// ── Reverse shells / remote backdoors ────────────────────────────────────────
const REVERSE_SHELL: RegExp[] = [
  /\bnc\b\s+(-[a-z]*e|.*-e\s+\/bin\/(sh|bash))/i, // nc -e /bin/sh
  /\b(ncat|socat)\b[^\n]*exec[: ]/i, // socat … exec:
  /\b(bash|sh)\s+-i\b[^\n]*>&?\s*\/dev\/tcp\//i, // bash -i >& /dev/tcp/…
  /\/dev\/(tcp|udp)\/\d{1,3}(\.\d{1,3}){3}\//, // /dev/tcp/<ip>/
  /\bpython\d?\b[^\n]*socket\.socket[^\n]*subprocess|pty\.spawn/i, // python reverse shell
];

// ── Secret / credential exfiltration ─────────────────────────────────────────
const SECRET_PATHS = /(\.ssh\/id_|\.ssh\/.*_rsa|\.aws\/credentials|\.oriro\/credentials|\.config\/gcloud|\.env(\.|\b)|\.netrc|id_ed25519|\.kube\/config|wallet\.dat|\.gnupg\/)/i;
const NET_SINK = /\b(curl|wget|nc|ncat|socat|scp|rsync|ftp|tftp|invoke-webrequest|invoke-restmethod)\b/i;
// Env-var / secret-file exfil dumped into a request — both the COMMAND-SUBSTITUTION form
// (`curl …$(printenv AWS_SECRET…)`) AND the PIPE form (`printenv SECRET | curl`, `env | curl`).
// The rule only fires when a NET_SINK is also present, and these are scoped to `printenv`/`env`/
// `$(cat <secret>)` so they never fire on legit `-H "Authorization: Bearer $TOKEN"` or `env VAR=x cmd`.
const ENV_EXFIL: RegExp[] = [
  /\$\(\s*(printenv|env)\b/i, // $(printenv X) / $(env) substitution
  /\bprintenv\b/i, // printenv … (env dump — paired with a net sink below = exfil)
  /\benv\s*\|/i, // env | … (piping the whole environment)
  /\$\(\s*cat\b[^)]*(\.ssh|\.aws|\.env|\.netrc|credential|secret|token|id_rsa|id_ed25519)/i, // $(cat <secret>)
];

// ── Persistence / Trojan footholds (cron, rc files, startup, services) ───────
const PERSISTENCE: RegExp[] = [
  /\bcrontab\b\s+(-|\S+)/i, // crontab install
  />>?\s*~?\/?\.(bashrc|zshrc|bash_profile|profile|zprofile)\b/i, // append to shell rc
  /\b(launchctl\s+load|systemctl\s+enable|sc\s+create|new-service)\b/i, // service install
  /\bregistry::|reg\s+add\b.*\\run\b/i, // windows Run key persistence
  /[\\\/]start menu[\\\/]programs[\\\/]startup[\\\/]/i, // windows startup folder
  /\bschtasks\b\s+\/create/i, // scheduled task
];

// ── Guardian self-defense (the floor protecting the floor) ───────────────────
// Disabling or rewriting Guardian's own config/state is an absolute BLOCK in
// every mode — you must not be able to turn the always-on guard off via a tool
// call. (Legitimate changes go through `oriro guardian` interactively.)
const GUARDIAN_TAMPER: RegExp[] = [
  /\boriro\b.*\bguardian\b.*\b(disable|off|stop|uninstall)\b/i, // disable Guardian via command
  /[\\\/]\.oriro[\\\/]guardian/i, // direct write to Guardian's own config/state
];

// ── Disabling other security / covering tracks ───────────────────────────────
const TAMPER: RegExp[] = [
  /\bchmod\s+-?\s*0?777\b/i, // world-writable
  /\b(ufw|firewall-cmd|iptables)\b.*\b(disable|stop|flush|-f)\b/i, // firewall down
  /\bset-mppreference\b.*-disable/i, // disable Defender
  /\bhistory\s+-c\b|\bunset\s+histfile\b|>\s*~?\/?\.bash_history/i, // wipe history
];

// ── Crypto-miners / common malware signatures ────────────────────────────────
const MALWARE: RegExp[] = [
  /\b(xmrig|minerd|cgminer|cpuminer|stratum\+tcp)\b/i,
  /\b(nanopool|minexmr|supportxmr|pool\.minexmr)\b/i,
];

function anyMatch(patterns: RegExp[], text: string): boolean {
  return patterns.some((re) => re.test(text));
}

export const DEFAULT_RULES: GuardianRule[] = [
  {
    id: "fs-destruction",
    description: "Block recursive deletes of root/home, disk reformats, fork bombs, host shutdown.",
    match: (c) => {
      const cmd = norm(cmdOf(c));
      return isDangerousRm(cmd) || anyMatch(FS_DESTRUCTION, cmd)
        ? block("fs-destruction", "Destructive filesystem/system operation")
        : null;
    },
  },
  {
    id: "remote-code-exec",
    description: "Block pull-and-run of remote code (curl|sh, iex(downloadString), bash <(curl)).",
    match: (c) => (anyMatch(REMOTE_EXEC, norm(cmdOf(c))) ? block("remote-code-exec", "Downloading and executing remote code") : null),
  },
  {
    id: "reverse-shell",
    description: "Block reverse shells / remote backdoors (nc -e, /dev/tcp, socat exec).",
    match: (c) => (anyMatch(REVERSE_SHELL, norm(cmdOf(c))) ? block("reverse-shell", "Opening a reverse shell / remote backdoor") : null),
  },
  {
    id: "secret-exfiltration",
    description: "Block reading a credential/key file and piping it off the machine.",
    match: (c) => {
      const cmd = norm(cmdOf(c));
      if (cmd && SECRET_PATHS.test(cmd) && NET_SINK.test(cmd)) {
        return block("secret-exfiltration", "Reading secrets and sending them off the machine");
      }
      return null;
    },
  },
  {
    id: "env-exfiltration",
    description: "Block dumping env vars / secret files into a network request (curl …$(printenv SECRET)).",
    match: (c) => {
      const cmd = norm(cmdOf(c));
      return cmd && NET_SINK.test(cmd) && anyMatch(ENV_EXFIL, cmd)
        ? block("env-exfiltration", "Sending environment variables / secret files off the machine")
        : null;
    },
  },
  {
    id: "persistence",
    description: "Flag cron/rc/startup/service edits used for Trojan persistence.",
    match: (c) => (anyMatch(PERSISTENCE, norm(cmdOf(c))) ? ask("persistence", "Installing a persistent foothold (cron/startup/service)") : null),
  },
  {
    id: "guardian-self-defense",
    description: "Block any attempt to disable, uninstall, or rewrite Guardian's own config/state.",
    match: (c) => {
      if (anyMatch(GUARDIAN_TAMPER, norm(cmdOf(c)))) {
        return block("guardian-self-defense", "Attempt to disable or tamper with Guardian itself");
      }
      // Also catch direct file writes to Guardian's own config/state (fs tool calls).
      if (c.paths?.some((p) => /[\\/]\.oriro[\\/]guardian/i.test(p))) {
        return block("guardian-self-defense", "Direct write to Guardian's own config/state");
      }
      return null;
    },
  },
  {
    id: "security-tamper",
    description: "Flag disabling firewall/Defender or wiping history.",
    match: (c) => (anyMatch(TAMPER, norm(cmdOf(c))) ? ask("security-tamper", "Disabling security controls or covering tracks") : null),
  },
  {
    id: "malware-signature",
    description: "Block known crypto-miner / malware command signatures.",
    match: (c) => (anyMatch(MALWARE, norm(cmdOf(c))) ? block("malware-signature", "Known malware / crypto-miner signature") : null),
  },
  {
    id: "v3lite",
    description:
      "Guardian V3 Lite: prompt-injection + IOC catalog (exfil/dropper/obfuscated-loader/RCE-pipe) + hidden-unicode scan on the tool call.",
    match: (c) => {
      const r = scanToolCall(c.toolName, c.command ?? "", c.params);
      return r.safe ? null : block("v3lite", `Guardian V3 Lite flagged ${r.threat}`);
    },
  },
  {
    id: "sensitive-path-write",
    description: "Flag writes into SSH keys, credential stores, or system directories.",
    match: (c) => {
      if (c.kind !== "fs" || !c.paths?.length) return null;
      const hit = c.paths.find(
        (p) =>
          SECRET_PATHS.test(p) ||
          /[\\\/]\.ssh[\\\/]/i.test(p) || // any write into ~/.ssh (e.g. authorized_keys = backdoor)
          /[\\\/](etc|boot|sys|windows[\\\/]system32)[\\\/]/i.test(p),
      );
      return hit ? ask("sensitive-path-write", `Writing to a sensitive location: ${hit}`) : null;
    },
  },
];
