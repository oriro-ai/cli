// ORIRO Step 6 — `oriro routers`: list, add, and multi-select free AI routers any time
// in the CLI. Keyless routers (Pollinations; local Ollama/LiteLLM) work instantly with no
// key; free routers (LLM7, etc.) take the user's own free key. Each is live-validated before it's
// added (nothing fake/broken gets in). The selected pool feeds the Best-Router Mux.
import type { Command } from "commander";
import {
  ROUTER_CATALOG,
  applyPoolToModel,
  freeChatRouters,
  keylessRouters,
  loadPool,
  type ProviderApi,
  registerRouterProvider,
  type RouterEntry,
  routerById,
  savePool,
  selectableRouters,
  validateRouter,
} from "../routers/index.js";
import { defaultRuntime } from "../runtime.js";
import { CONFIG_DIR } from "../utils.js";

export function registerRoutersCli(program: Command) {
  const routers = program
    .command("routers")
    .description("Free AI routers — list, add, and multi-select the Best-Router pool");

  routers
    .command("list")
    .description(
      "List all routers: ready-now (keyless), free (bring a free key), coming-soon, paid",
    )
    .action(() => {
      const pool = new Set(loadPool(CONFIG_DIR));
      const mark = (id: string) => (pool.has(id) ? " ◉ selected" : "");
      defaultRuntime.log("Ready now — keyless, no key needed:");
      for (const r of keylessRouters().filter((r) => !r.baseUrl.includes("localhost"))) {
        defaultRuntime.log(`  ${r.displayName}  (free)${mark(r.id)}  [${r.id}]`);
      }
      defaultRuntime.log("\nFree — bring your free key (no credit card):");
      for (const r of freeChatRouters().filter((r) => !r.keyless)) {
        defaultRuntime.log(
          `  ${r.displayName}  (free)${mark(r.id)}  [${r.id}] → ${r.obtainUrl ?? ""}`,
        );
      }
      const local = selectableRouters().filter((r) => r.baseUrl.includes("localhost"));
      if (local.length) {
        defaultRuntime.log("\nLocal (self-hosted, free):");
        for (const r of local)
          defaultRuntime.log(`  ${r.displayName}  (free)${mark(r.id)}  [${r.id}]`);
      }
      const coming = ROUTER_CATALOG.filter((r) => r.comingSoon);
      if (coming.length) {
        defaultRuntime.log("\nComing soon (free):");
        for (const r of coming)
          defaultRuntime.log(`  ${r.displayName}  (free) · coming soon  [${r.id}]`);
      }
      const paid = ROUTER_CATALOG.filter((r) => r.tier === "paid");
      if (paid.length) {
        defaultRuntime.log("\nPaid (requires payment):");
        for (const r of paid) defaultRuntime.log(`  ${r.displayName}  [${r.id}]`);
      }
      defaultRuntime.log(
        "\nAdd one: `oriro routers add <id>`   ·   Select your pool: `oriro routers use <id> <id> …`",
      );
    });

  routers
    .command("add")
    .argument("<id>", "Router id (see `oriro routers list`)")
    .option("--key <key>", "Your free API key (not needed for keyless routers)")
    .option("--account-id <id>", "Cloudflare account id")
    .description("Add a free router — registers + live-validates before adding")
    .action(async (id: string, opts: { key?: string; accountId?: string }) => {
      const entry = routerById(id);
      if (!entry) {
        defaultRuntime.error(`Unknown router '${id}'. Run \`oriro routers list\`.`);
        defaultRuntime.exit(1);
        return;
      }
      if (entry.comingSoon) {
        defaultRuntime.error(`${entry.displayName} is coming soon — not selectable yet.`);
        defaultRuntime.exit(1);
        return;
      }
      if (!entry.keyless && !opts.key) {
        defaultRuntime.error(
          `${entry.displayName} needs a free key. Get one at ${entry.obtainUrl ?? "the provider"}, then: oriro routers add ${id} --key <KEY>`,
        );
        defaultRuntime.exit(1);
        return;
      }
      defaultRuntime.log(`Validating ${entry.displayName}…`);
      const v = await validateRouter(entry, opts.key, entry.freeModels[0]);
      if (!v.ok) {
        defaultRuntime.error(`Validation failed (${v.error ?? "no response"}). Not added.`);
        defaultRuntime.exit(1);
        return;
      }
      await registerRouterProvider(entry, { key: opts.key, accountId: opts.accountId });
      const pool = loadPool(CONFIG_DIR);
      if (!pool.includes(id)) pool.push(id);
      savePool(CONFIG_DIR, pool);
      await applyPoolToModel(CONFIG_DIR);
      defaultRuntime.log(
        `✓ ${entry.displayName} added (validated in ${v.latencyMs}ms, model ${v.model}). In your router pool.`,
      );
    });

  routers
    .command("add-custom")
    .argument("<id>", "A name for this router (any id you choose)")
    .requiredOption(
      "--base-url <url>",
      "OpenAI-compatible base; '/chat/completions' is appended (e.g. .../openai)",
    )
    .requiredOption("--model <model>", "Model id to use")
    .option(
      "--api <api>",
      "API type (openai-completions|google-generative-ai|anthropic-messages|ollama)",
      "openai-completions",
    )
    .option("--key <key>", "API key, if the router requires one (omit for keyless)")
    .description(
      "Add ANY router not in the catalog (brand-new/unknown) by URL + model — live-validated",
    )
    .action(
      async (id: string, opts: { baseUrl: string; model: string; api: string; key?: string }) => {
        if (routerById(id)) {
          defaultRuntime.error(
            `'${id}' is already a catalog router — use \`oriro routers add ${id}\`.`,
          );
          defaultRuntime.exit(1);
          return;
        }
        const entry: RouterEntry = {
          id,
          displayName: id,
          api: opts.api as ProviderApi,
          baseUrl: opts.baseUrl,
          freeModels: [opts.model],
          keyless: !opts.key,
          tier: "free",
          kind: "chat",
        };
        defaultRuntime.log(`Validating custom router ${id} (${opts.baseUrl})…`);
        const v = await validateRouter(entry, opts.key, opts.model);
        if (!v.ok) {
          defaultRuntime.error(`Validation failed (${v.error ?? "no response"}). Not added.`);
          defaultRuntime.exit(1);
          return;
        }
        await registerRouterProvider(entry, { key: opts.key });
        const pool = loadPool(CONFIG_DIR);
        if (!pool.includes(id)) pool.push(id);
        savePool(CONFIG_DIR, pool);
        await applyPoolToModel(CONFIG_DIR);
        defaultRuntime.log(
          `✓ ${id} added (validated in ${v.latencyMs}ms, model ${opts.model}). In your router pool.`,
        );
      },
    );

  routers
    .command("use")
    .argument("<ids...>", "Router ids to route across (the Best-Router pool)")
    .description("Select multiple routers; the Mux picks the best/fastest per request")
    .action(async (ids: string[]) => {
      const alreadyAdded = new Set(loadPool(CONFIG_DIR)); // includes custom-added routers
      const unknown = ids.filter((id) => {
        const cat = routerById(id);
        const okCatalog = cat && !cat.comingSoon;
        return !okCatalog && !alreadyAdded.has(id);
      });
      if (unknown.length) {
        defaultRuntime.error(
          `Not selectable: ${unknown.join(", ")}. Add catalog routers with \`routers add <id>\` or unknown ones with \`routers add-custom\` first.`,
        );
        defaultRuntime.exit(1);
        return;
      }
      savePool(CONFIG_DIR, ids);
      const applied = await applyPoolToModel(CONFIG_DIR);
      defaultRuntime.log(
        `Pool set: ${ids.join(", ")}. Active routing → primary ${applied.primary ?? "(none)"}${applied.fallbacks.length ? `, failover: ${applied.fallbacks.join(", ")}` : ""}`,
      );
    });

  routers
    .command("status")
    .description("Show the selected router pool")
    .action(() => {
      const pool = loadPool(CONFIG_DIR);
      defaultRuntime.log(
        pool.length
          ? `Router pool (${pool.length}): ${pool.join(", ")}`
          : "No routers selected. `oriro routers add <id>`.",
      );
    });

  routers
    .command("remove")
    .argument("<id>", "Router id to remove from the pool")
    .action((id: string) => {
      const pool = loadPool(CONFIG_DIR).filter((x) => x !== id);
      savePool(CONFIG_DIR, pool);
      defaultRuntime.log(`Removed ${id}. Pool: ${pool.join(", ") || "(empty)"}`);
    });

  routers
    .command("test")
    .argument("<id>", "Router id to live-validate")
    .option("--key <key>", "Free API key (if the router needs one)")
    .description("Live-validate a router (probe its endpoint)")
    .action(async (id: string, opts: { key?: string }) => {
      const entry = routerById(id);
      if (!entry || entry.comingSoon) {
        defaultRuntime.error(`Cannot test '${id}'.`);
        defaultRuntime.exit(1);
        return;
      }
      const v = await validateRouter(entry, opts.key, entry.freeModels[0]);
      defaultRuntime.log(
        `${entry.displayName}: ${v.ok ? "OK" : "FAILED"} (${v.latencyMs}ms${v.error ? `, ${v.error}` : ""}) model=${v.model}`,
      );
    });

  routers.action(() => {
    defaultRuntime.log(
      "Use: `oriro routers list | add <id> | use <ids…> | status | remove <id> | test <id>`",
    );
  });
}
