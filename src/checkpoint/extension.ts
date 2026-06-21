// ORIRO CLI — checkpoint/undo as a built-in extension. Snapshots a file's prior content
// BEFORE any edit tool runs (so Auto mode is safe), and exposes an `undo_edit` tool the
// coder (or the user) can call to roll back the last change. Snapshot-only on the hook —
// it never blocks an edit.

import type { ExtensionAPI, ToolCallEvent } from "../agents/sessions/index.js";
import { Type } from "typebox";
import { textResult } from "../agents/tools/common.js";
import { recordCheckpoint, undoLast, checkpointCount } from "./store.js";

const EDIT_TOOLS = /^(write|edit|apply_patch|multi[_-]?edit)$/i;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/** Built-in ExtensionFactory: snapshot-before-edit + the undo tool. */
export default function checkpointExtension(api: ExtensionAPI): void {
  // Snapshot the prior content before a write/edit runs.
  api.on("tool_call", async (event: ToolCallEvent) => {
    if (!EDIT_TOOLS.test(event.toolName)) return;
    const input = (event.input ?? {}) as Record<string, unknown>;
    const file = str(input.file_path) ?? str(input.path) ?? str(input.file) ?? str(input.target);
    if (file) recordCheckpoint(file, event.toolName);
    return; // snapshot only — never alter or block the edit
  });

  api.registerTool({
    name: "undo_edit",
    label: "Undo",
    description:
      "Undo the most recent file edit — restore its prior content, or remove a file that was newly created. Use to roll back an unwanted change (especially under Auto posture).",
    promptSnippet: "undo_edit() — roll back the last file edit.",
    parameters: Type.Object({}),
    async execute() {
      const r = undoLast();
      const msg = !r
        ? "Nothing to undo."
        : r.restored
          ? `Undid last edit — ${r.action} ${r.file}. ${checkpointCount()} undo point(s) remaining.`
          : `Could not undo ${r.file}.`;
      return textResult(msg, { undone: Boolean(r?.restored), file: r?.file, action: r?.action });
    },
  });
}
