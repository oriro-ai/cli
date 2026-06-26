// `oriro connectors` — the MCP connector catalog. Adding a connector is INERT: it validates the
// catalog entry and records it; the live MCP handshake happens only when a session actually uses it.
//   list [category]   → the validated catalog
//   add <slug>        → validate + record (inert)
//   remove <slug>     → drop it
import type { Command } from "commander";
import { listConnectors, addConnector, removeConnector, addedConnectors, connectorCategories, isConnectorAdded } from "../connectors/connectors.js";
import { ok, info, heading, die } from "./ui.js";
import { accent, dim } from "../ui/theme.js";

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
}
