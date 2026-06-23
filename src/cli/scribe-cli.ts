// ORIRO Scribe CLI — the user's window into their own local work journal.
// Read-only; the journal lives under ~/.oriro/scribe/ and never leaves the machine.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Command } from "commander";
import { defaultRuntime } from "../runtime.js";
import {
  isScribeEnabled,
  journalFile,
  readDigest,
  readHealth,
  readTimeline,
  scribeDir,
  setScribeConsent,
} from "../scribe/index.js";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function listDays(): string[] {
  const dir = scribeDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
    .map((f) => f.replace(/\.md$/, ""))
    .sort();
}

export function registerScribeCli(program: Command) {
  const scribe = program
    .command("scribe")
    .description(
      "Your local work journal (scribe): status, read, search — never leaves this machine",
    );

  scribe
    .command("on")
    .description("Enable the scribe (start remembering your work — this machine only)")
    .action(() => {
      setScribeConsent(true);
      defaultRuntime.log("Scribe enabled — your work is now kept in context on this machine only.");
    });

  scribe
    .command("off")
    .description("Disable the scribe (stop recording; nothing new is captured or injected)")
    .action(() => {
      setScribeConsent(false);
      defaultRuntime.log("Scribe disabled — nothing new will be recorded or injected.");
    });

  scribe
    .command("status")
    .description("Show whether the scribe is on, where it lives, and recent activity")
    .action(() => {
      const days = listDays();
      defaultRuntime.log(`Scribe: ${isScribeEnabled() ? "ON" : "OFF"} · ${scribeDir()}`);
      defaultRuntime.log(
        `Days recorded: ${days.length}${days.length ? ` (${days[0]} → ${days[days.length - 1]})` : ""}`,
      );
      const h = readHealth();
      defaultRuntime.log(
        `Health: last write ${h.lastWriteAt ?? "never"} · faults ${h.faultCount}${h.lastFault ? ` (last: ${h.lastFault})` : ""}`,
      );
      const digest = readDigest().trim();
      defaultRuntime.log(digest ? `\n${digest}` : "\n(no activity recorded yet)");
    });

  scribe
    .command("read")
    .argument("[date]", "YYYY-MM-DD (default: today)")
    .description("Print a day's journal")
    .action((date?: string) => {
      const d = date?.trim() || today();
      const f = journalFile(d);
      if (!existsSync(f)) {
        defaultRuntime.log(`No journal for ${d}. Days: ${listDays().join(", ") || "(none)"}`);
        return;
      }
      defaultRuntime.writeStdout(readFileSync(f, "utf8"));
    });

  scribe
    .command("timeline")
    .description("Print the full-history timeline skeleton")
    .action(() => {
      const t = readTimeline().trim();
      defaultRuntime.log(t || "(no timeline yet)");
    });

  scribe
    .command("search")
    .argument("<query...>", "Text to find across all journals")
    .description("Search every day's journal for a phrase")
    .action((parts: string[]) => {
      const q = parts.join(" ").toLowerCase();
      if (!q) {
        defaultRuntime.error("Provide a search query.");
        defaultRuntime.exit(1);
        return;
      }
      let hits = 0;
      for (const d of listDays()) {
        const lines = readFileSync(join(scribeDir(), `${d}.md`), "utf8").split("\n");
        lines.forEach((line, i) => {
          if (line.toLowerCase().includes(q)) {
            defaultRuntime.log(`${d}:${i + 1}: ${line.trim().slice(0, 200)}`);
            hits++;
          }
        });
      }
      defaultRuntime.log(`\n${hits} match(es).`);
    });

  scribe.action(() => {
    defaultRuntime.log(
      `Scribe: ${scribeDir()} — try \`oriro scribe status\`, \`read [date]\`, \`timeline\`, \`search <q>\`.`,
    );
  });
}
