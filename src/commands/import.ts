// `oriro import` (UX-11) — migrate from another CLI. Antigravity has `agy plugin import gemini`; this
// pulls the two portable things every AI CLI shares:
//   import mcp <file>   — MCP servers from a Claude-compatible mcp.json (Claude Desktop / Cursor / Kimi
//                         all use {"mcpServers": {...}}) → ORIRO custom connectors, Guardian-vetted.
//   import skills <dir> — SKILL.md skill folders from another CLI's skills dir → ~/.oriro/skills.
import { existsSync, readFileSync, readdirSync, statSync, cpSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import type { Command } from "commander";
import { buildServerConfig, vetServer } from "../connectors/setup.js";
import { saveCustomServer } from "../connectors/custom.js";
import { userSkillsDir } from "../skills/loader.js";
import { ok, info, heading, die } from "./ui.js";
import { accent, dim, fgHex, PALETTE } from "../ui/theme.js";

interface McpServerJson { command?: string; args?: string[]; env?: Record<string, string>; url?: string; headers?: Record<string, string>; }

export function registerImportCommand(program: Command): void {
  const imp = program.command("import").description("migrate from another CLI (MCP servers, skills)");

  imp
    .command("mcp <file>")
    .description("import MCP servers from a Claude-compatible mcp.json (Guardian-vetted)")
    .action((file: string) => {
      if (!existsSync(file)) die(`no such file: ${file}`);
      let servers: Record<string, McpServerJson>;
      try {
        const j = JSON.parse(readFileSync(file, "utf8")) as { mcpServers?: Record<string, McpServerJson>; servers?: Record<string, McpServerJson> };
        servers = j.mcpServers ?? j.servers ?? {};
      } catch (e) {
        die(`could not parse ${file}: ${e instanceof Error ? e.message : String(e)}`);
        return;
      }
      const names = Object.keys(servers);
      if (!names.length) die(`no "mcpServers" found in ${file}`);

      heading(`Import MCP · ${names.length} server${names.length === 1 ? "" : "s"}`);
      let imported = 0, blocked = 0;
      for (const name of names) {
        const s = servers[name] as McpServerJson;
        const input = {
          name,
          ...(s.command ? { command: s.command } : {}),
          ...(s.args ? { args: s.args } : {}),
          ...(s.env ? { env: s.env } : {}),
          ...(s.url ? { url: s.url } : {}),
          ...(s.headers ? { headers: s.headers } : {}),
        };
        const outcome = vetServer(input);
        if (outcome.decision === "block") {
          process.stdout.write(`  ${fgHex(PALETTE.error, "✗")} ${name} ${dim(`blocked: ${outcome.reason}`)}\n`);
          blocked++;
          continue;
        }
        saveCustomServer({ name, config: buildServerConfig(input), trusted: outcome.decision === "allow" });
        const mark = outcome.decision === "allow" ? fgHex(PALETTE.success, "✓ trusted") : dim("○ needs trust");
        process.stdout.write(`  ${mark} ${accent(name)}\n`);
        imported++;
      }
      info(`${imported} imported · ${blocked} blocked${imported ? ` — they connect in-session; see \`oriro connectors custom\`` : ""}`);
    });

  imp
    .command("skills <dir>")
    .description("import SKILL.md skill folders from another CLI's skills directory")
    .action((dir: string) => {
      if (!existsSync(dir) || !statSync(dir).isDirectory()) die(`no such directory: ${dir}`);
      const dest = userSkillsDir();
      mkdirSync(dest, { recursive: true });
      heading("Import skills");
      let n = 0;
      for (const entry of readdirSync(dir)) {
        const src = join(dir, entry);
        if (!statSync(src).isDirectory()) continue;
        if (!existsSync(join(src, "SKILL.md"))) continue; // only real skills (a folder with SKILL.md)
        cpSync(src, join(dest, basename(src)), { recursive: true });
        process.stdout.write(`  ${fgHex(PALETTE.success, "✓")} ${accent(entry)}\n`);
        n++;
      }
      if (n === 0) info(dim(`no SKILL.md folders found in ${dir}`));
      else ok(`imported ${n} skill${n === 1 ? "" : "s"} → ${dim(dest)}`);
    });
}
