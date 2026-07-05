// V0.3.4 — `oriro sessions`: list saved sessions for this project (persisted under ~/.oriro/sessions,
// local-only). Resume from the shell with `oriro -c` (most recent) or `oriro --resume <id>`. Supports
// the shared --output/--query matrix like every other ORIRO list command.
import type { Command } from "commander";
import { listSessions, formatSessionList, sessionRows } from "../sessions/store.js";
import { heading, die } from "./ui.js";
import { renderList, isMachineOutput, outputError } from "./output.js";

export function registerSessionsCommand(program: Command): void {
  program
    .command("sessions")
    .description("list your saved chat sessions (resume with `oriro -c` or `oriro --resume <id>`)")
    .option("-o, --output <fmt>", "output format: text (default) | json | csv")
    .option("-q, --query <expr>", "filter/select: 'field', 'field=value', or 'field=value:selectField'")
    .action(async (opts: { output?: string; query?: string }) => {
      const oerr = outputError(opts); if (oerr) die(oerr);
      const infos = await listSessions();
      if (isMachineOutput(opts) || opts.query) {
        process.stdout.write(
          renderList(sessionRows(infos), {
            output: opts.output, query: opts.query,
            columns: ["id", "messages", "modified", "first", "cwd"],
          }) + "\n",
        );
        return;
      }
      heading("Sessions");
      process.stdout.write(formatSessionList(infos).join("\n") + "\n");
    });
}
