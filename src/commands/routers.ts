// `oriro routers` — manage the free-router pool the model runs on.
//   list            → the catalog (Gauss/Avila shown greyed as "coming soon")
//   add <slug>      → live-validate, register, and add to the active pool (never registers a broken one)
//   use <slug...>   → set the active pool (multi-select)
import type { Command } from "commander";
import { ROUTER_CATALOG, routerById } from "../routers/catalog.js";
import { addRouter, useRouters, resolvePool } from "../routers/router-pool.js";
import { ok, info, heading, die } from "./ui.js";
import { accent, dim, fgHex, PALETTE } from "../ui/theme.js";

export function registerRoutersCommand(program: Command): void {
  const routers = program.command("routers").description("manage the free-router pool the model runs on");

  routers
    .command("list")
    .description("list the router catalog and the active pool")
    .action(() => {
      heading("Routers");
      for (const r of ROUTER_CATALOG) {
        if (r.comingSoon) {
          process.stdout.write(`  ${dim(`${r.id}  ${r.displayName}  (coming soon)`)}\n`);
          continue;
        }
        const tier = r.keyless ? fgHex(PALETTE.success, "keyless") : dim(r.tier);
        process.stdout.write(`  ${accent(r.id.padEnd(22))} ${r.displayName.padEnd(24)} ${tier}\n`);
      }
      const pool = resolvePool();
      info(pool.length ? `active pool: ${pool.map((p) => p.id).join(", ")}` : "active pool: empty → using the keyless floor");
    });

  routers
    .command("add <slug>")
    .description("live-validate a router and add it to the pool")
    .option("-k, --key <key>", "API key (for non-keyless routers)")
    .option("-m, --model <id>", "pin a specific model id")
    .action(async (slug: string, opts: { key?: string; model?: string }) => {
      const entry = routerById(slug);
      if (!entry) die(`unknown router '${slug}' — run \`oriro routers list\``);
      const res = await addRouter(entry, { ...(opts.key ? { key: opts.key } : {}), ...(opts.model ? { modelId: opts.model } : {}) });
      if (!res.ok) die(`could not add '${slug}': ${res.validation.error ?? "validation failed"}`);
      ok(`added ${accent(slug)} (${res.validation.latencyMs}ms, model ${res.validation.model}) → active pool`);
    });

  routers
    .command("use <slugs...>")
    .description("set the active router pool (ids must be added first)")
    .action((slugs: string[]) => {
      const { applied, unknown } = useRouters(slugs);
      if (!applied.length) {
        die(`none of those are added yet: ${unknown.join(", ")} — run \`oriro routers add <slug>\` first`);
      }
      ok(`pool set: ${applied.join(", ")}`);
      if (unknown.length) info(`skipped (not added yet — run \`oriro routers add\`): ${unknown.join(", ")}`);
    });
}
