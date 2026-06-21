// ORIRO CLI — `oriro guardian` command. Inspect and tune the always-on security gate.
// Deliberately exposes mode + allow/deny + log + rules, but NOT a one-flag "disable":
// Guardian is protection, not a preference. Power users can set passive mode if they
// must, but turning it off is not a casual CLI switch.
import type { Command } from "commander";
import { formatDocsLink } from "../../../packages/terminal-core/src/links.js";
import { theme } from "../../../packages/terminal-core/src/theme.js";

export function registerGuardianCommand(program: Command): void {
  const guardian = program
    .command("guardian")
    .description("ORIRO Guardian V3 — the always-on security gate (status, log, rules, tuning)")
    .addHelpText(
      "after",
      () => `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/guardian", "docs.oriro.ai/cli/guardian")}\n`,
    )
    .action(async () => {
      const g = await import("../../guardian/index.js");
      const cfg = g.readGuardianConfig();
      const log = g.readAudit(1000);
      const blocked = log.filter((e) => e.decision === "block").length;
      process.stdout.write(
        `\n  🛡 ORIRO Guardian V3\n` +
          `     status   : ${cfg.enabled ? "ACTIVE" : "disabled"}\n` +
          `     mode     : ${cfg.mode}\n` +
          `     model    : ${cfg.modelReady ? "Guardian V3 Lite wired" : "rules-only (gate live)"}\n` +
          `     blocked  : ${blocked} threats · ${log.length} events logged\n` +
          `     allow/deny: ${cfg.allow.length} / ${cfg.deny.length} entries\n\n`,
      );
    });

  guardian
    .command("log")
    .description("Show recent Guardian events (blocks + flags)")
    .option("--limit <n>", "How many to show", "20")
    .action(async (opts) => {
      const g = await import("../../guardian/index.js");
      const entries = g.readAudit(Number(opts.limit) || 20);
      if (!entries.length) {
        process.stdout.write("  No Guardian events yet.\n");
        return;
      }
      for (const e of entries) {
        const mark = e.decision === "block" ? "⛔" : e.decision === "ask" ? "⚠️ " : "•";
        process.stdout.write(`  ${mark} ${e.ts}  [${e.rule}] ${e.reason}\n     ${e.toolName}${e.command ? `: ${e.command}` : ""}\n`);
      }
    });

  guardian
    .command("mode <mode>")
    .description("Set enforcement: passive (log only) | active (default) | strict")
    .action(async (mode: string) => {
      const g = await import("../../guardian/index.js");
      if (mode !== "passive" && mode !== "active" && mode !== "strict") {
        process.stderr.write("  Mode must be one of: passive | active | strict\n");
        process.exitCode = 1;
        return;
      }
      g.writeGuardianConfig({ ...g.readGuardianConfig(), mode });
      process.stdout.write(`  🛡 Guardian mode set to ${mode}.\n`);
    });

  guardian
    .command("allow <pattern>")
    .description("Always allow calls matching this tool/command/path substring")
    .action(async (pattern: string) => {
      const g = await import("../../guardian/index.js");
      const cfg = g.readGuardianConfig();
      if (!cfg.allow.includes(pattern)) cfg.allow.push(pattern);
      g.writeGuardianConfig(cfg);
      process.stdout.write(`  Added to allowlist: "${pattern}"\n`);
    });

  guardian
    .command("deny <pattern>")
    .description("Always block calls matching this tool/command/path substring")
    .action(async (pattern: string) => {
      const g = await import("../../guardian/index.js");
      const cfg = g.readGuardianConfig();
      if (!cfg.deny.includes(pattern)) cfg.deny.push(pattern);
      g.writeGuardianConfig(cfg);
      process.stdout.write(`  Added to denylist: "${pattern}"\n`);
    });

  guardian
    .command("rules")
    .description("List the built-in protection rules")
    .action(async () => {
      const g = await import("../../guardian/index.js");
      for (const r of g.DEFAULT_RULES) {
        process.stdout.write(`  • ${r.id.padEnd(22)} ${r.description}\n`);
      }
    });
}
