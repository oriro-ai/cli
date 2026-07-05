// `oriro routers` — manage the free-router pool the model runs on.
//   list            → the catalog (Gauss/Avila shown greyed as "coming soon")
//   add <slug>      → live-validate, register, and add to the active pool (never registers a broken one)
//   use <slug...>   → set the active pool (multi-select)
import type { Command } from "commander";
import { ROUTER_CATALOG, routerById, type RouterEntry } from "../routers/catalog.js";
import { addRouter, useRouters, resolvePool, registeredRouters, KEYLESS_SENTINEL } from "../routers/router-pool.js";
import { ok, info, heading, die } from "./ui.js";
import { renderList, isMachineOutput, outputError } from "./output.js";
import { accent, dim, fgHex, PALETTE } from "../ui/theme.js";

export function registerRoutersCommand(program: Command): void {
  const routers = program.command("routers").description("manage the free-router pool the model runs on");

  routers
    .command("list")
    .description("list the router catalog and the active pool")
    .option("-o, --output <fmt>", "output format: text (default) | json | csv | md")
    .option("-q, --query <expr>", "filter/select: 'field', 'field=value[:selectField]', or any JMESPath")
    .action((opts: { output?: string; query?: string }) => {
      const oerr = outputError(opts); if (oerr) die(oerr); // clean error, no stack trace (QA D1)
      const pool = new Set(resolvePool().map((p) => p.id));
      // Machine output (json/csv/query): one flat, scriptable row set — catalog + custom, with pool state.
      if (isMachineOutput(opts) || opts.query) {
        const catalogRows = ROUTER_CATALOG.filter((r) => !r.comingSoon).map((r) => ({
          id: r.id, name: r.displayName, tier: r.keyless ? "keyless" : r.tier,
          keyless: Boolean(r.keyless), source: "catalog", active: pool.has(r.id),
        }));
        const customRows = registeredRouters()
          .filter((r) => !ROUTER_CATALOG.some((c) => c.id === r.id))
          .map((r) => ({
            id: r.id, name: r.name, tier: r.apiKey && r.apiKey !== KEYLESS_SENTINEL ? "byok" : "keyless",
            keyless: !r.apiKey || r.apiKey === KEYLESS_SENTINEL, source: "custom", active: pool.has(r.id),
          }));
        process.stdout.write(renderList([...catalogRows, ...customRows], {
          output: opts.output, query: opts.query,
          columns: ["id", "name", "tier", "keyless", "active", "source"],
        }) + "\n");
        return;
      }
      // Default: the human, coloured view (unchanged).
      heading("Routers");
      for (const r of ROUTER_CATALOG) {
        if (r.comingSoon) {
          process.stdout.write(`  ${dim(`${r.id}  ${r.displayName}  (coming soon)`)}\n`);
          continue;
        }
        const tier = r.keyless ? fgHex(PALETTE.success, "keyless") : dim(r.tier);
        process.stdout.write(`  ${accent(r.id.padEnd(22))} ${r.displayName.padEnd(24)} ${tier}\n`);
      }
      const custom = registeredRouters().filter((r) => !ROUTER_CATALOG.some((c) => c.id === r.id));
      if (custom.length) {
        process.stdout.write(`\n  ${accent("your custom routers")}\n`);
        for (const r of custom) {
          const type = r.apiKey && r.apiKey !== KEYLESS_SENTINEL ? dim("BYOK") : fgHex(PALETTE.success, "keyless");
          process.stdout.write(`  ${accent(r.id.padEnd(22))} ${dim(r.baseUrl.padEnd(40))} ${type}\n`);
        }
      }
      info(pool.size ? `active pool: ${[...pool].join(", ")}` : "active pool: empty → using the keyless floor");
    });

  routers
    .command("add <name>")
    .description("live-validate a router and add it to the pool — a catalog name, OR any custom endpoint via --url")
    .option("-k, --key <key>", "API key (BYOK) — omit for a keyless free router")
    .option("-m, --model <id>", "model id to run (REQUIRED for a custom --url router)")
    .option("--url <baseUrl>", "add ANY custom free/BYOK router by its OpenAI-compatible base URL (the part BEFORE /chat/completions)")
    .option("--api <api>", "custom router API: 'openai' (default) or 'google'", "openai")
    .action(async (name: string, opts: { key?: string; model?: string; url?: string; api?: string }) => {
      let entry: RouterEntry | undefined;
      if (opts.url) {
        // CUSTOM endpoint — the user brings any new free router (or BYOK). Same live-validation as a
        // catalog router, so a custom one can't be fake/broken either. baseUrl is stored MINUS the
        // "/chat/completions" suffix (the transport + validator append it), so accept either form.
        if (!opts.model) die("a custom --url router needs --model <id> (the model to run on that endpoint)");
        const baseUrl = opts.url.replace(/\/(?:chat\/completions)\/?$/i, "").replace(/\/$/, "");
        entry = {
          id: name,
          displayName: name,
          baseUrl,
          api: opts.api === "google" ? "google-generative-ai" : "openai-completions",
          freeModels: [opts.model],
          keyless: !opts.key,
          tier: "free",
          kind: "chat",
        };
      } else {
        entry = routerById(name);
        if (!entry) die(`unknown router '${name}' — run \`oriro routers list\`, or add any custom endpoint with: oriro routers add <name> --url <baseUrl> --model <id> [--key <key>]`);
      }
      const res = await addRouter(entry, { ...(opts.key ? { key: opts.key } : {}), ...(opts.model ? { modelId: opts.model } : {}) });
      if (!res.ok) die(`could not add '${name}': ${res.validation.error ?? "validation failed"}`);
      ok(`added ${accent(name)} (${res.validation.latencyMs}ms, model ${res.validation.model}${opts.key ? ", BYOK" : ", keyless"}) → active pool`);
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
