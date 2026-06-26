// ORIRO CLI — Guardian V3 default rule set (the always-on first layer).
//
// Deterministic, $0, sub-millisecond checks that fire on EVERY tool call before it runs
// (exec, file, MCP). FastBlock half of Guardian; the V3-Lite scanner is the deep half.
// Threat surface of an agentic terminal: a tool call (often driven by untrusted web/MCP
// content) trying to destroy data, gain persistence, exfiltrate secrets, pull-and-run remote
// code, open a reverse shell, or smuggle a hostile payload.
//
// DESIGN (post-audit hardening): matching is TOKEN-AWARE, not single-regex. A command is split
// into statements (on ; | & && || newline); destructive COMMAND words are anchored to the command
// position of a statement (so "git commit -m '...shutdown...'" is NOT a host-disruption); rm
// targets are CLASSIFIED (root/home/cwd/glob/system-dir = block; system sub-path = ask; ordinary
// relative/temp/home-subdir paths = allow, so real work like `rm -rf node_modules` flows).
// Each rule is a pure predicate; first/most-severe decision wins (policy.ts); rules never throw.

import type { GuardianRule, GuardianVerdict } from "./types.js";
import { scanExecCommand, scanToolCall } from "./v3lite.js";

const block = (rule: string, reason: string, severity: GuardianVerdict["severity"] = "critical"): GuardianVerdict => ({
  decision: "block", severity, rule, reason,
});
const ask = (rule: string, reason: string, severity: GuardianVerdict["severity"] = "warning"): GuardianVerdict => ({
  decision: "ask", severity, rule, reason,
});

const cmdOf = (c: { command?: string }): string => (c.command ?? "").toLowerCase();
const norm = (s: string): string => s.replace(/\s+/g, " ").trim();
const anyMatch = (patterns: RegExp[], text: string): boolean => patterns.some((re) => re.test(text));

// ── Tokenizer (best-effort shell-ish; deterministic, no eval) ─────────────────
const stripQuotes = (t: string): string => t.replace(/^['"]+/, "").replace(/['"]+$/, "");
/** Split a command line into statements on ; | & && || and newlines. */
function statements(cmd: string): string[] {
  return cmd.split(/(?:&&|\|\||[;|&\n])+/g).map((s) => s.trim()).filter(Boolean);
}
function words(stmt: string): string[] {
  return stmt.split(/\s+/).map(stripQuotes).filter(Boolean);
}
/** The command word of a statement (basename), skipping prefixes like sudo / env VAR=x / nohup. */
function commandWord(stmt: string): string {
  const w = words(stmt);
  let i = 0;
  while (i < w.length && /^(sudo|nohup|nice|time|exec|command|builtin|then|do|else)$/i.test(w[i] ?? "")) i++;
  if (i < w.length && /^env$/i.test(w[i] ?? "")) { i++; while (i < w.length && /^[\w.]+=/.test(w[i] ?? "")) i++; }
  while (i < w.length && /^[\w.]+=/.test(w[i] ?? "")) i++; // leading VAR=val assignments
  return (w[i] ?? "").replace(/^.*[\\/]/, "").toLowerCase();
}

// ── rm target classification ──────────────────────────────────────────────────
const SYS_DIR = "(etc|usr|bin|sbin|var|boot|lib|lib64|sys|proc|dev|root|opt|windows|system32|programdata|library|applications|system|private|cores|volumes|network)";
type RmTarget = "danger" | "system-sub" | "safe";
function classifyRmTarget(raw: string): RmTarget {
  let t = stripQuotes(raw).trim();
  if (!t || t.startsWith("-")) return "safe"; // a flag, not a target
  t = t.replace(/\$\{?home\}?/gi, "~"); // $HOME / ${HOME} → ~
  // Bare root / home / cwd / wildcard anchors → catastrophic.
  if (/^(\/|\/\*|~|~\/|~\/\*|\.|\.\/|\.\/\*|\*|\.\*)$/.test(t)) return "danger";
  // A top-level system directory (optionally trailing / or /*) → catastrophic.
  if (new RegExp(`^/${SYS_DIR}(/\\*?)?$`, "i").test(t)) return "danger";
  // /home itself or /home/<user> root (no deeper path) → catastrophic.
  if (/^\/home(\/[^/]+)?\/?\*?$/i.test(t)) return "danger";
  // A deeper path INSIDE system space → suspicious (ask), but a user's own home/tmp/relative
  // sub-path is ordinary work and allowed.
  if (new RegExp(`^/${SYS_DIR}/.+`, "i").test(t)) return "system-sub";
  return "safe";
}
/** rm/rmdir that recursively force-deletes a dangerous target. Returns the verdict, or null. */
function rmVerdict(stmt: string): GuardianVerdict | null {
  const cw = commandWord(stmt);
  if (cw !== "rm") return null;
  const w = words(stmt);
  const flags = w.filter((x) => x.startsWith("-")).join(" ");
  const recursive = /(^|[^-])-[a-z]*r/i.test(" " + flags) || /--recursive\b/i.test(flags);
  const force = /(^|[^-])-[a-z]*f/i.test(" " + flags) || /--force\b/i.test(flags);
  const noPreserve = /--no-preserve-root\b/i.test(flags);
  if (!recursive || !force) return null;
  if (noPreserve) return block("fs-destruction", "Recursive force-delete with --no-preserve-root");
  const targets = w.slice(1).filter((x) => !x.startsWith("-")).map(classifyRmTarget);
  if (targets.includes("danger")) return block("fs-destruction", "Recursive force-delete of root/home/cwd/system path");
  if (targets.includes("system-sub")) return ask("fs-destruction", "Recursive force-delete inside a system directory");
  return null; // ordinary `rm -rf node_modules` / `./build` / `/tmp/x` — allowed
}

// ── Other destructive filesystem / host operations ────────────────────────────
const DISK = "(sd|nvme|disk|hd|vd|xvd|mmcblk|loop)";
const FS_DESTRUCTION: RegExp[] = [
  new RegExp(`\\bmkfs\\.?\\w*\\s+/dev/${DISK}`, "i"), // reformat a disk
  new RegExp(`\\bdd\\b[^\\n]*\\bof=/dev/${DISK}`, "i"), // overwrite raw disk
  new RegExp(`>\\s*/dev/${DISK}\\w`, "i"), // redirect over raw disk
  /:\s*\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, // fork bomb
  /\bremove-item\b.*-recurse.*-force.*[\\/](windows|system32|users)\b/i, // PS recursive wipe
  /\b(format|cipher\s+\/w)\b.*[a-z]:\\?/i, // windows format / wipe-free-space
  /\bfind\b[^\n]*\s(-delete\b|-exec\s+rm\b)/i, // find … -delete / -exec rm
  /\bshred\b\s+(-|\S*\/dev\/)/i, // shred a device/file destructively
  new RegExp(`\\btruncate\\b[^\\n]*\\s/dev/${DISK}`, "i"), // truncate a device
  /\bmv\b[^\n]*\s\/dev\/null\b/i, // mv important → /dev/null
  /\bchmod\b\s+-[a-z]*r[a-z]*\s+0{3,4}\b/i, // chmod -R 000 (strip all perms recursively)
  /\bwipefs\b/i,
];
// Host-disruption commands — only when they are the COMMAND of a statement (anchored).
const HOST_DISRUPT = new Set(["shutdown", "reboot", "halt", "poweroff"]);

// ── Pull-and-run remote code ──────────────────────────────────────────────────
const FETCH = "(curl|wget|fetch|httpie)";
const SHELL = "(sh|bash|zsh|dash|ksh|sudo\\s+sh|sudo\\s+bash|python\\d?|node|perl|ruby|php)";
const REMOTE_EXEC: RegExp[] = [
  new RegExp(`\\b${FETCH}\\b[^\\n|]*\\|\\s*(sudo\\s+)?${SHELL}\\b`, "i"), // curl … | sh
  new RegExp(`(?:^|[\\s;&|(])(bash|sh|zsh|ksh|source|\\.)\\s*<\\s*\\(\\s*${FETCH}`, "i"), // sh <(curl) / bash<(curl) / . <(curl)
  new RegExp(`\\b(bash|sh|zsh|ksh|eval)\\b[^\\n]*\\$\\(\\s*${FETCH}\\b`, "i"), // bash -c "$(curl)"
  new RegExp(`\\$\\(\\s*${FETCH}\\b[^)]*\\)`, "i"), // bare $(curl …) substitution
  /`\s*(curl|wget|fetch)\b/i, // backtick `curl`
  /\b(irm|iwr|invoke-webrequest|invoke-restmethod)\b[^\n|]*\|\s*(iex|invoke-expression)/i, // PS download|iex
  /\biex\b\s*\(\s*(new-object\s+net\.webclient|.*downloadstring)/i, // iex(New-Object Net.WebClient…)
  /\bpython\d?\s+-c\b[^\n]*(urllib|requests|httpx|socket|os\.system|subprocess|exec\(|eval\()/i, // python -c fetch/exec
  /\b(perl|ruby|node|php)\s+-(e|r)\b[^\n]*(http|socket|system|exec|eval|fsockopen|downloadstring)/i, // perl/ruby/node/php -e RCE
  /\b(base64\s+(-d|--decode)|xxd\s+-r|openssl\s+enc\s+-d)\b[^\n|]*\|\s*(sudo\s+)?(sh|bash|zsh|python\d?|node|perl|ruby)\b/i, // decode|sh
  new RegExp(`\\b${FETCH}\\b[^\\n]*\\s-[a-z]*[oO]\\b[^\\n]*&&[^\\n]*(chmod\\s+\\+x|\\./|\\bsh\\b|\\bbash\\b)`, "i"), // download then exec
];

// ── Reverse shells / remote backdoors ─────────────────────────────────────────
const REVERSE_SHELL: RegExp[] = [
  /\b(nc|ncat|netcat)\b[^\n]*\s-[a-z]*e\b/i, // nc/ncat -e
  /\b(ncat|socat)\b[^\n]*exec[: ]/i, // socat … exec:
  /\bsocat\b[^\n]*tcp[:-][^\n]*exec/i, // socat tcp … exec
  /\b(bash|sh|zsh)\s+-i\b[^\n]*>&?\s*\/dev\/tcp\//i, // bash -i >& /dev/tcp/…
  /\/dev\/(tcp|udp)\/[\w.\-]+\/\d+/i, // /dev/tcp/<host-or-ip>/<port>
  /\bpython\d?\b[^\n]*socket\.socket[^\n]*(subprocess|pty\.spawn|exec)/i, // python reverse shell
  /\b(perl|php|ruby)\b[^\n]*(fsockopen|socket)[^\n]*(exec|system|\/bin\/(sh|bash))/i, // perl/php/ruby reverse shell
  /\bmkfifo\b[^\n]*(\bnc\b|\bncat\b)/i, // mkfifo backpipe
];

// ── Secret / credential exfiltration ──────────────────────────────────────────
const SECRET_PATHS =
  /(\.ssh(?:[\\/]|\b)|authorized_keys|id_rsa|id_ed25519|id_ecdsa|\.aws(?:[\\/]|\b)|\.oriro[\\/]credentials|\.config[\\/]gcloud|\.env(\.|\b)|\.netrc|\.npmrc|\.pypirc|\.docker(?:[\\/]|\b)|\.git-credentials|\.kube(?:[\\/]|\b)|wallet\.dat|\.gnupg(?:[\\/]|\b)|cookies(\.sqlite)?|login\s*data)/i;
const NET_SINK = /\b(curl|wget|nc|ncat|netcat|socat|scp|rsync|ftp|tftp|invoke-webrequest|invoke-restmethod)\b/i;
const ENV_EXFIL: RegExp[] = [
  /\$\(\s*(printenv|env)\b/i, // $(printenv X) / $(env)
  /\bprintenv\b/i, // printenv … (paired with a net sink below = exfil)
  /\benv\s*\|/i, // env | …
  /\$\(\s*cat\b[^)]*(\.ssh|\.aws|\.env|\.netrc|credential|secret|token|id_rsa|id_ed25519)/i, // $(cat <secret>)
];
// A secret-named env var dumped via a request BODY flag (not a -H auth header). Scoped so it
// never fires on `-H "Authorization: Bearer $TOKEN"`.
const ENV_VAR_IN_BODY = /\s--?(d|data|data-binary|data-raw|form|post|body|upload-file)\b[^\n]*\$\{?\w*(secret|token|api[_-]?key|password|passwd|credential|aws_)\w*\}?/i;

// ── Persistence / Trojan footholds ────────────────────────────────────────────
const PERSISTENCE: RegExp[] = [
  /\bcrontab\b\s+(-|\S+)/i,
  />>?\s*~?\/?\.(bashrc|zshrc|bash_profile|profile|zprofile)\b/i,
  />>?[^\n]*\.ssh[\\/]authorized_keys/i, // implant an SSH key (backdoor)
  /\b(launchctl\s+load|systemctl\s+enable|sc\s+create|new-service)\b/i,
  /\bregistry::|reg\s+add\b.*\\run\b/i,
  /[\\/]start menu[\\/]programs[\\/]startup[\\/]/i,
  /\bschtasks\b\s+\/create/i,
];

// ── Guardian self-defense ─────────────────────────────────────────────────────
const GUARDIAN_TAMPER: RegExp[] = [
  /\boriro\b.*\bguardian\b.*\b(disable|off|stop|uninstall)\b/i,
  /[\\/]\.oriro[\\/]guardian/i, // direct path to Guardian's config/state
  /\bguardian\.json\b/i, // any write referencing guardian.json (cd … && > guardian.json)
];

// ── Disabling security / covering tracks ──────────────────────────────────────
const TAMPER: RegExp[] = [
  /\bchmod\s+-?\s*0?777\b/i,
  /\b(ufw|firewall-cmd|iptables)\b.*\b(disable|stop|flush|-f)\b/i,
  /\bset-mppreference\b.*-disable/i,
  /\bhistory\s+-c\b|\bunset\s+histfile\b|>\s*~?\/?\.bash_history/i,
];

// ── Crypto-miners / malware signatures ────────────────────────────────────────
const MALWARE: RegExp[] = [
  /\b(xmrig|minerd|cgminer|cpuminer|stratum\+tcp)\b/i,
  /\b(nanopool|minexmr|supportxmr|pool\.minexmr)\b/i,
];

export const DEFAULT_RULES: GuardianRule[] = [
  {
    id: "fs-destruction",
    description: "Block recursive deletes of root/home/system paths, disk reformats, fork bombs, host shutdown.",
    match: (c) => {
      const raw = cmdOf(c);
      const cmd = norm(raw);
      for (const stmt of statements(cmd)) {
        const v = rmVerdict(stmt);
        if (v) return v;
        if (HOST_DISRUPT.has(commandWord(stmt))) return block("fs-destruction", "Host shutdown/reboot");
      }
      return anyMatch(FS_DESTRUCTION, cmd) ? block("fs-destruction", "Destructive filesystem/system operation") : null;
    },
  },
  {
    id: "remote-code-exec",
    description: "Block pull-and-run of remote code (curl|sh, $(curl), sh <(curl), bash -c $(curl), decode|sh).",
    match: (c) => (anyMatch(REMOTE_EXEC, norm(cmdOf(c))) ? block("remote-code-exec", "Downloading and executing remote code") : null),
  },
  {
    id: "reverse-shell",
    description: "Block reverse shells / remote backdoors (nc -e, /dev/tcp/<host>, socat exec, mkfifo backpipe).",
    match: (c) => (anyMatch(REVERSE_SHELL, norm(cmdOf(c))) ? block("reverse-shell", "Opening a reverse shell / remote backdoor") : null),
  },
  {
    id: "secret-exfiltration",
    description: "Block reading a credential/key file or env secret and sending it off the machine.",
    match: (c) => {
      const cmd = norm(cmdOf(c));
      if (!cmd || !NET_SINK.test(cmd)) return null;
      if (SECRET_PATHS.test(cmd)) return block("secret-exfiltration", "Reading secrets and sending them off the machine");
      if (anyMatch(ENV_EXFIL, cmd) || ENV_VAR_IN_BODY.test(cmd)) return block("secret-exfiltration", "Sending environment variables / secrets off the machine");
      return null;
    },
  },
  {
    id: "persistence",
    description: "Block SSH-key implants; flag cron/rc/startup/service edits used for Trojan persistence.",
    match: (c) => {
      const cmd = norm(cmdOf(c));
      if (/>>?[^\n]*\.ssh[\\/]authorized_keys/i.test(cmd)) return block("persistence", "Implanting an SSH key (backdoor)");
      return anyMatch(PERSISTENCE, cmd) ? ask("persistence", "Installing a persistent foothold (cron/startup/service)") : null;
    },
  },
  {
    id: "guardian-self-defense",
    description: "Block any attempt to disable, uninstall, or rewrite Guardian's own config/state.",
    match: (c) => {
      if (anyMatch(GUARDIAN_TAMPER, norm(cmdOf(c)))) return block("guardian-self-defense", "Attempt to disable or tamper with Guardian itself");
      if (c.paths?.some((p) => /[\\/]\.oriro[\\/]guardian/i.test(p))) return block("guardian-self-defense", "Direct write to Guardian's own config/state");
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
    description: "Guardian V3 Lite on the tool call: IOC catalog + hidden-unicode (exec); + injection scan for untrusted MCP params.",
    match: (c) => {
      // For exec/file commands the `command` is the OPERATOR's own — scan IOC + hidden-unicode only
      // (running prompt-injection patterns on the operator's command line caused false blocks, e.g.
      // `git commit -m "ignore all previous instructions in old TODO"`). For MCP calls the params are
      // untrusted, so the full scan (incl. injection) applies.
      const r = c.kind === "mcp"
        ? scanToolCall(c.toolName, c.command ?? "", c.params)
        : scanExecCommand(`${c.toolName}\n${c.command ?? ""}`);
      return r.safe ? null : block("v3lite", `Guardian V3 Lite flagged ${r.threat}`);
    },
  },
  {
    id: "sensitive-path-write",
    description: "Flag writes into SSH keys, credential stores, or system directories.",
    match: (c) => {
      if (c.kind !== "fs" || !c.paths?.length) return null;
      const hit = c.paths.find(
        (p) => SECRET_PATHS.test(p) || /[\\/]\.ssh[\\/]/i.test(p) || /[\\/](etc|boot|sys|windows[\\/]system32)[\\/]/i.test(p),
      );
      return hit ? ask("sensitive-path-write", `Writing to a sensitive location: ${hit}`) : null;
    },
  },
];
