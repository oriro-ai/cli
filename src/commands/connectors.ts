// `oriro connectors` — the MCP connector catalog. Adding a connector is INERT: it validates the
// catalog entry and records it; the live MCP handshake happens only when a session actually uses it.
//   list [category]   → the validated catalog
//   add <slug>        → validate + record (inert)
//   remove <slug>     → drop it
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import type { Command } from "commander";
import { listConnectors, addConnector, removeConnector, addedConnectors, connectorCategories, isConnectorAdded } from "../connectors/connectors.js";
import { buildServerConfig, vetServer, parsePairs } from "../connectors/setup.js";
import { saveCustomServer, readCustomServers, removeCustomServer } from "../connectors/custom.js";
import { assertSafeUrl } from "../connectors/mcp-client.js";
import { ok, info, heading, die } from "./ui.js";
import { accent, dim } from "../ui/theme.js";

interface SetupOpts {
  name?: string;
  command?: string;
  args?: string;
  env?: string;
  url?: string;
  header?: string;
  allowLocal?: boolean;
  yes?: boolean;
}

export function registerConnectorsCommand(program: Command): void {
  const connectors = program.command("connectors").description("MCP connectors — add external tools/services (inert until used)");

  connectors
    .command("list [category]")
    .description("list the connector catalog (optionally filtered by category)")
    .action((category?: string) => {
      if (category && !connectorCategories().includes(category)) {
        die(`unknown category '${category}' — categories: ${connectorCategories().join(", ")}`);
      }
      const entries = listConnectors(category);
      const added = new Set(addedConnectors().map((c) => c.slug));
      heading(category ? `Connectors · ${category}` : "Connectors");
      let addable = 0;
      for (const c of entries) {
        const canAdd = !!c.mcpUrl; // entries with no MCP source can't be added — show them greyed
        if (canAdd) addable++;
        const mark = !canAdd ? dim("·") : added.has(c.slug) ? accent("●") : dim("○");
        const name = canAdd ? c.name.padEnd(22) : dim(`${c.name} (coming soon)`.padEnd(22));
        process.stdout.write(`  ${mark} ${(canAdd ? accent : dim)(c.slug.padEnd(20))} ${name} ${dim(c.category)}\n`);
      }
      info(`${addable} addable${category ? ` in '${category}'` : ""} · ${added.size} added · ${entries.length - addable} coming soon`);
    });

  connectors
    .command("add <slug>")
    .description("add a connector (validate + record; connects only when used)")
    .action((slug: string) => {
      if (isConnectorAdded(slug)) {
        info(`${slug} is already added`);
        return;
      }
      const res = addConnector(slug);
      if (!res.ok) die(res.error ?? `could not add '${slug}'`);
      ok(`added ${accent(slug)} — recorded locally`);
    });

  connectors
    .command("remove <slug>")
    .description("remove a connector")
    .action((slug: string) => {
      if (removeConnector(slug)) ok(`removed ${accent(slug)}`);
      else info(`'${slug}' is not in your added list — nothing to remove`);
    });

  // Guided setup of a CUSTOM MCP server — describe it in plain words, Guardian vets it before
  // it's saved (blocks malicious launches, asks-to-trust a new clean server, remembers trust).
  connectors
    .command("setup")
    .description("guided setup of a CUSTOM MCP server — Guardian-vetted, no JSON")
    .option("--name <name>", "a short name for the server")
    .option("--command <cmd>", "stdio launch command, e.g. 'npx -y @scope/mcp'")
    .option("--args <args>", "space-separated args for --command")
    .option("--env <pairs>", "comma-separated KEY=VAL env vars")
    .option("--url <url>", "http(s) MCP endpoint (instead of --command)")
    .option("--header <pairs>", "comma-separated KEY=VAL headers (with --url)")
    .option("--allow-local", "permit loopback/LAN URL targets")
    .option("-y, --yes", "trust and save when Guardian says 'ask'")
    .action(async (opts: SetupOpts) => {
      const interactive = !!stdin.isTTY && !!stdout.isTTY;
      let { name, command, url } = opts;
      let argsStr = opts.args;
      let envStr = opts.env;

      // Missing essentials: prompt on a real terminal; print guidance (clean exit) otherwise.
      if (!name || (!command && !url)) {
        if (!interactive) {
          heading("ORIRO MCP setup 🛡");
          info("Describe a custom MCP server; Guardian vets it before it's saved — no JSON.");
          process.stdout.write(
            `\n  ${accent('oriro connectors setup --name <n> --command "npx -y @scope/mcp"')}\n` +
            `  ${accent("oriro connectors setup --name <n> --url https://host/mcp")}\n` +
            `  ${dim("optional: --args \"a b\"  --env K=V,K2=V2  --header K=V  --allow-local  --yes")}\n\n` +
            `  ${dim("On a real terminal, run it with no flags for a guided Q&A.")}\n`,
          );
          return;
        }
        const rl = createInterface({ input: stdin, output: stdout });
        try {
          name = name || (await rl.question("Server name: ")).trim();
          if (!command && !url) {
            const t = (await rl.question("Transport — [s]tdio command or [u]rl? ")).trim().toLowerCase();
            if (t.startsWith("u")) {
              url = (await rl.question("URL: ")).trim();
            } else {
              command = (await rl.question("Command (e.g. npx -y @scope/mcp): ")).trim();
              argsStr = (await rl.question("Args (space-separated, optional): ")).trim() || undefined;
              envStr = (await rl.question("Env KEY=VAL,comma-separated (optional): ")).trim() || undefined;
            }
          }
        } finally {
          rl.close();
        }
      }

      if (!name) die("a server name is required");
      if (!command && !url) die("either --command or --url is required");

      const args = argsStr ? argsStr.split(/\s+/).filter(Boolean) : undefined;
      const env = envStr ? parsePairs(envStr) : undefined;
      const headers = opts.header ? parsePairs(opts.header) : undefined;

      // SSRF guard for URL servers (loopback/LAN/metadata blocked unless --allow-local).
      if (url) {
        try { assertSafeUrl(url, !!opts.allowLocal); }
        catch (e) { die(e instanceof Error ? e.message : String(e)); }
      }

      const input = { name: name!, command, args, env, url, headers };
      const config = buildServerConfig(input);
      const outcome = vetServer(input);

      heading("ORIRO MCP setup · Guardian 🛡");
      if (outcome.decision === "block") {
        die(`Guardian BLOCKED "${name}": ${outcome.reason}. Not saved.`);
      }

      let trusted = outcome.decision === "allow";
      if (outcome.decision === "ask") {
        info(`Guardian: ${outcome.reason}`);
        if (opts.yes) {
          trusted = true;
        } else if (interactive) {
          const rl = createInterface({ input: stdin, output: stdout });
          try {
            const ans = (await rl.question(`Trust and save "${name}"? [y/N] `)).trim().toLowerCase();
            trusted = ans === "y" || ans === "yes";
          } finally {
            rl.close();
          }
        } else {
          info(`Not saved — re-run with --yes to trust "${name}".`);
          return;
        }
        if (!trusted) { info("Not saved."); return; }
      }

      saveCustomServer({ name: name!, config, trusted });
      ok(`saved MCP server ${accent(name!)} — ${trusted ? "trusted" : "untrusted"} (${config.type})`);
      if (outcome.alreadyTrusted) info("already trusted — Guardian did not re-ask");
    });

  // List the custom MCP servers the user has set up.
  connectors
    .command("custom")
    .description("list the custom MCP servers you've set up")
    .action(() => {
      const servers = readCustomServers();
      heading("Custom MCP servers");
      if (!servers.length) { info("none yet — add one with `oriro connectors setup`"); return; }
      for (const s of servers) {
        const where = s.config.type === "stdio" ? s.config.command : s.config.url;
        const mark = s.trusted ? accent("●") : dim("○");
        process.stdout.write(`  ${mark} ${accent(s.name.padEnd(20))} ${dim(`${s.config.type} · ${where}`)}\n`);
      }
      info(`${servers.length} custom · ${servers.filter((s) => s.trusted).length} trusted`);
    });

  connectors
    .command("forget <name>")
    .description("remove a custom MCP server you set up")
    .action((name: string) => {
      if (removeCustomServer(name)) ok(`forgot ${accent(name)}`);
      else info(`'${name}' is not a custom server — nothing to forget`);
    });
}
