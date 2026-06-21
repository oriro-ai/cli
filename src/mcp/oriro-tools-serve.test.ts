// Oriro MCP tools tests cover core tool server startup and registration.
import { describe, expect, it } from "vitest";
import { resolveOriroToolsForMcp } from "./oriro-tools-serve.js";
import { createPluginToolsMcpHandlers } from "./plugin-tools-handlers.js";

describe("Oriro tools MCP server", () => {
  it("exposes cron", async () => {
    const handlers = createPluginToolsMcpHandlers(resolveOriroToolsForMcp());

    const listed = await handlers.listTools();
    expect(listed.tools.map((tool) => tool.name)).toContain("cron");
  });
});
