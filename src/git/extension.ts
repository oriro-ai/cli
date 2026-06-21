// ORIRO CLI — git as a built-in agent tool (closes the inventory "git tool + diff review"
// gap; previously shell-only). One `git` tool with structured actions. Read ops run freely;
// add/commit mutate and flow through Guardian + the permission posture like any tool call.

import type { ExtensionAPI } from "../agents/sessions/index.js";
import { Type } from "typebox";
import { textResult } from "../agents/tools/common.js";
import {
  isGitRepo,
  gitStatus,
  gitDiff,
  gitDiffStaged,
  gitLog,
  gitAdd,
  gitCommit,
  gitBranch,
  gitShow,
  gitDiffReview,
} from "./git.js";

const GitParams = Type.Object({
  action: Type.Union(
    [
      Type.Literal("status"),
      Type.Literal("diff"),
      Type.Literal("staged"),
      Type.Literal("review"),
      Type.Literal("log"),
      Type.Literal("add"),
      Type.Literal("commit"),
      Type.Literal("branch"),
      Type.Literal("show"),
    ],
    { description: "git operation to run" },
  ),
  files: Type.Optional(Type.Array(Type.String(), { description: "files for `add`, or one file for `diff`" })),
  message: Type.Optional(Type.String({ description: "commit message (required for `commit`)" })),
  ref: Type.Optional(Type.String({ description: "ref/sha for `show` (default HEAD)" })),
  n: Type.Optional(Type.Number({ description: "number of commits for `log` (default 10)" })),
});

/** Built-in ExtensionFactory: the `git` tool. */
export default function gitExtension(api: ExtensionAPI): void {
  api.registerTool({
    name: "git",
    label: "Git",
    description:
      "Structured git: status · diff · staged · review (compact change summary) · log · add · commit · branch · show. " +
      "Use 'review' before committing to summarize what changed.",
    promptSnippet: "git(action, files?, message?, ref?, n?) — status/diff/review/log/add/commit/branch/show.",
    parameters: GitParams,
    async execute(_id, p) {
      if (!(await isGitRepo())) return textResult("Not a git repository (run `git init` first).", { ok: false });
      switch (p.action) {
        case "status":
          return textResult((await gitStatus()).stdout || "(clean)", {});
        case "diff": {
          const r = await gitDiff(p.files?.[0]);
          return textResult(r.stdout || "(no unstaged changes)", {});
        }
        case "staged": {
          const r = await gitDiffStaged();
          return textResult(r.stdout || "(nothing staged)", {});
        }
        case "review":
          return textResult(await gitDiffReview(), {});
        case "log":
          return textResult((await gitLog(p.n ?? 10)).stdout || "(no commits)", {});
        case "add": {
          if (!p.files?.length) return textResult("`add` needs files.", { ok: false });
          const r = await gitAdd(p.files);
          return textResult(r.ok ? `Staged: ${p.files.join(", ")}` : r.stderr, r);
        }
        case "commit": {
          if (!p.message) return textResult("`commit` needs a message.", { ok: false });
          const r = await gitCommit(p.message);
          return textResult(r.ok ? r.stdout.trim() : r.stderr, r);
        }
        case "branch":
          return textResult(`On branch: ${(await gitBranch()).stdout.trim() || "(detached)"}`, {});
        case "show": {
          const r = await gitShow(p.ref ?? "HEAD");
          return textResult(r.stdout || r.stderr, {});
        }
      }
    },
  });
}
