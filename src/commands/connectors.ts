// `oriro connectors` — the MCP connector catalog. Adding a connector is INERT: it validates the
// catalog entry and records it; the live MCP handshake happens only when a session actually uses it.
//   list [category]   → the validated catalog
//   add <slug>        → validate + record (inert)
//   remove <slug>     → drop it
import type { Command } from "commander";
import { listConnectors, addConnector, removeConnector, addedConnectors } from "../connectors/connectors.js";
import { ok, info, heading, die } from "./ui.js";
import { accent, dim } from "../ui/theme.js";

export function registerConnectorsCommand(program: Command): void {
  const connectors = program.command("connectors").description("MCP connectors — add external tools/services (inert until used)");

  connectors
    .command("list [category]")
    .description("list the connector catalog (optionally filtered by category)")
    .action((category?: string) => {
      const entries = listConnectors(category);
      const added = new Set(addedConnectors().map((c) => c.slug));
      heading(category ? `Connectors · ${category}` : "Connectors");
      for (const c of entries) {
        const mark = added.has(c.slug) ? accent("●") : dim("○");
        process.stdout.write(`  ${mark} ${accent(c.slug.padEnd(20))} ${c.name.padEnd(22)} ${dim(c.category)}\n`);
      }
      info(`${entries.length} connectors${category ? ` in '${category}'` : ""} · ${added.size} added`);
    });

  connectors
    .command("add <slug>")
    .description("add a connector (validate + record; connects only when used)")
    .action((slug: string) => {
      const res = addConnector(slug);
      if (!res.ok) die(res.error ?? `could not add '${slug}'`);
      ok(`added ${accent(slug)} — inert until a session uses it`);
    });

  connectors
    .command("remove <slug>")
    .description("remove a connector")
    .action((slug: string) => {
      removeConnector(slug);
      ok(`removed ${accent(slug)}`);
    });
}
