// ORIRO MCP server — V0.3.8. Exposes ORIRO ITSELF as MCP tools over stdio (`oriro serve mcp`), so
// any MCP client — Claude Code/Desktop, an IDE, another agent — can call ORIRO as a tool (the
// OpenClaw pattern, keyless). Uses the official @modelcontextprotocol/sdk server; the ORIRO session
// is assembled LAZILY on the first tool call, so the protocol handshake needs no network at all.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { AgentSession } from "@earendil-works/pi-coding-agent";
import { assembleOriroSession } from "../onboarding/assemble.js";
import { runFanout } from "../agents/fanout.js";
import { scrubOutput } from "../identity/filter.js";
import { protectStdio, exitOnStdinClose } from "./common.js";

/** Run the MCP stdio server until the client closes stdin. */
export async function serveMcp(version: string): Promise<void> {
  protectStdio();
  exitOnStdinClose();
  const server = new McpServer({ name: "oriro", version });

  // Lazy shared session + a serializer: MCP clients may fire tool calls concurrently, but one Pi
  // session can only run one prompt at a time — queue them in arrival order.
  let sessionPromise: Promise<AgentSession> | undefined;
  const getSession = (): Promise<AgentSession> =>
    (sessionPromise ??= assembleOriroSession({}).then((a) => a.session));
  let queue: Promise<unknown> = Promise.resolve();
  const serialized = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = queue.then(fn, fn);
    queue = next.catch(() => undefined);
    return next;
  };

  server.registerTool(
    "oriro_chat",
    {
      description:
        "Ask ORIRO — a keyless, $0 coding agent with full tools (read/edit/run, Guardian-gated) in " +
        "the current project directory. Returns the agent's final answer.",
      inputSchema: { prompt: z.string().describe("The task or question for ORIRO") },
    },
    async ({ prompt }) =>
      serialized(async () => {
        const session = await getSession();
        let out = "";
        const unsub = session.subscribe(
          (e: { type: string; assistantMessageEvent?: { type: string; delta?: string } }) => {
            if (e.type === "message_update" && e.assistantMessageEvent?.type === "text_delta") {
              out += e.assistantMessageEvent.delta ?? "";
            }
          },
        );
        try {
          await session.prompt(prompt);
        } catch (e) {
          return { content: [{ type: "text" as const, text: `ORIRO error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        } finally {
          unsub();
        }
        return { content: [{ type: "text" as const, text: scrubOutput(out).trim() || "(no response)" }] };
      }),
  );

  server.registerTool(
    "oriro_agents",
    {
      description:
        "Fan a list of tasks out to parallel ORIRO sub-agents, each in an isolated git worktree " +
        "(max 4). Returns the merged report incl. kept worktrees/branches for review.",
      inputSchema: { tasks: z.array(z.string()).min(1).max(4).describe("One task per sub-agent") },
    },
    async ({ tasks }) => ({
      content: [{ type: "text" as const, text: (await runFanout(tasks, process.cwd())).join("\n") }],
    }),
  );

  await server.connect(new StdioServerTransport());
  await new Promise<void>(() => {}); // stdio-driven; exitOnStdinClose / SIGINT end the process
}
