// Verifies PDF tool factory output is included in Oriro tool registration.
import { describe, expect, it } from "vitest";
import { collectPresentOriroTools } from "./oriro-tools.registration.js";
import { createPdfTool } from "./tools/pdf-tool.js";

describe("createOriroTools PDF registration", () => {
  it("includes the pdf tool when the pdf factory returns a tool", () => {
    const pdfTool = createPdfTool({
      agentDir: "/tmp/oriro-agent-main",
      config: {
        agents: {
          defaults: {
            pdfModel: { primary: "openai/gpt-5.4-mini" },
          },
        },
      },
    });

    expect(pdfTool?.name).toBe("pdf");
    expect(collectPresentOriroTools([pdfTool]).map((tool) => tool.name)).toEqual(["pdf"]);
  });
});
