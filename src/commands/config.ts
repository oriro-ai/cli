// `oriro config` (UX-6) — durable user defaults in ~/.oriro/config.json.
//   list            → all keys + current values + descriptions
//   get <key>       → one value
//   set <key> <val> → validate + persist
//   unset <key>     → clear back to the built-in default
import type { Command } from "commander";
import { configAll, configGet, configSet, configUnset, configKeys, isConfigKey, validateConfig } from "../config/store.js";
import { ok, info, heading, die } from "./ui.js";
import { accent, dim } from "../ui/theme.js";

export function registerConfigCommand(program: Command): void {
  const config = program.command("config").description("your durable CLI settings (defaults in ~/.oriro/config.json)");

  config
    .command("list")
    .description("show every setting, its value, and what it does")
    .action(() => {
      const all = configAll();
      heading("Config");
      for (const { key, desc } of configKeys()) {
        const val = all[key];
        process.stdout.write(`  ${accent(key.padEnd(10))} ${val !== undefined ? accent(val) : dim("(default)")}  ${dim(desc)}\n`);
      }
      info(`set: ${accent("oriro config set <key> <value>")} · clear: ${accent("oriro config unset <key>")}`);
    });

  config
    .command("get <key>")
    .description("print one setting's value")
    .action((key: string) => {
      if (!isConfigKey(key)) die(`unknown key '${key}' — run \`oriro config list\``);
      const val = configGet(key);
      if (val === undefined) { info(`${key} is unset (using the built-in default)`); return; }
      process.stdout.write(`${val}\n`);
    });

  config
    .command("set <key> <value>")
    .description("set a setting (validated)")
    .action((key: string, value: string) => {
      if (!isConfigKey(key)) die(`unknown key '${key}' — run \`oriro config list\``);
      const err = validateConfig(key, value);
      if (err) die(`invalid value for '${key}': ${err}`);
      configSet(key, value);
      ok(`${accent(key)} = ${accent(value)}`);
    });

  config
    .command("unset <key>")
    .description("clear a setting back to its built-in default")
    .action((key: string) => {
      if (!isConfigKey(key)) die(`unknown key '${key}' — run \`oriro config list\``);
      if (configUnset(key)) ok(`cleared ${accent(key)}`);
      else info(`${key} was already at its default`);
    });
}
